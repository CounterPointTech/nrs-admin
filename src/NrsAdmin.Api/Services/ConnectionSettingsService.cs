using System.Text.Json;
using System.Text.Json.Serialization;
using Npgsql;
using NrsAdmin.Api.Configuration;

namespace NrsAdmin.Api.Services;

public class ConnectionSettingsService
{
    private readonly string _filePath;
    private readonly ConnectionJsonConfigurationProvider? _configProvider;
    private readonly ILogger<ConnectionSettingsService> _logger;
    private readonly object _lock = new();

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public ConnectionSettingsService(
        IConfiguration configuration,
        ILogger<ConnectionSettingsService> logger)
    {
        _logger = logger;

        // Resolve path next to the running assembly
        var baseDir = AppContext.BaseDirectory;
        _filePath = Path.Combine(baseDir, "connection.json");

        // Find our custom config provider so we can trigger reload
        if (configuration is IConfigurationRoot configRoot)
        {
            _configProvider = configRoot.Providers
                .OfType<ConnectionJsonConfigurationProvider>()
                .FirstOrDefault();
        }

        _logger.LogInformation("Connection settings file path: {Path}", _filePath);
    }

    public bool IsConfigured
    {
        get
        {
            if (!File.Exists(_filePath))
                return false;

            try
            {
                var settings = LoadFromFile();
                return settings?.Database is not null
                    && !string.IsNullOrEmpty(settings.Database.Host)
                    && !string.IsNullOrEmpty(settings.Database.Database);
            }
            catch
            {
                return false;
            }
        }
    }

    public ConnectionSettings? GetSettings()
    {
        if (!File.Exists(_filePath))
            return null;

        try
        {
            return LoadFromFile();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read connection settings from {Path}", _filePath);
            return null;
        }
    }

    public void SaveSettings(ConnectionSettings settings)
    {
        lock (_lock)
        {
            try
            {
                var json = JsonSerializer.Serialize(settings, JsonOptions);

                // Atomic write: temp file + rename
                var tempPath = _filePath + ".tmp";
                File.WriteAllText(tempPath, json);
                File.Move(tempPath, _filePath, overwrite: true);

                _logger.LogInformation("Connection settings saved to {Path}", _filePath);

                // Trigger config reload so IOptionsMonitor picks up changes
                _configProvider?.Reload();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save connection settings to {Path}", _filePath);
                throw;
            }
        }
    }

    public async Task<TestConnectionResult> TestConnectionAsync(
        string host, int port, string database, string username, string password, int timeout = 10)
    {
        var connectionString = $"Host={host};Port={port};Database={database};Username={username};Password={password};Timeout={timeout}";

        try
        {
            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();

            // Get server version
            await using var versionCmd = new NpgsqlCommand("SELECT version()", connection);
            var version = await versionCmd.ExecuteScalarAsync() as string;

            // Check if shared.users table exists (confirms this is a Novarad database)
            await using var checkCmd = new NpgsqlCommand(
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'shared' AND table_name = 'users')",
                connection);
            var isNovarad = (bool)(await checkCmd.ExecuteScalarAsync() ?? false);

            return new TestConnectionResult
            {
                Success = true,
                ServerVersion = version,
                IsNovaradDatabase = isNovarad
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Connection test failed for {Host}:{Port}/{Database}", host, port, database);
            return new TestConnectionResult
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    public Task<TestPathResult> TestPathAsync(string path)
    {
        try
        {
            var exists = File.Exists(path);
            return Task.FromResult(new TestPathResult
            {
                Exists = exists,
                IsAccessible = exists
            });
        }
        catch (Exception ex)
        {
            return Task.FromResult(new TestPathResult
            {
                Exists = false,
                IsAccessible = false,
                ErrorMessage = ex.Message
            });
        }
    }

    private ConnectionSettings? LoadFromFile()
    {
        var json = File.ReadAllText(_filePath);
        return JsonSerializer.Deserialize<ConnectionSettings>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }
}

public class TestConnectionResult
{
    public bool Success { get; set; }
    public string? ServerVersion { get; set; }
    public bool IsNovaradDatabase { get; set; }
    public string? ErrorMessage { get; set; }
}

public class TestPathResult
{
    public bool Exists { get; set; }
    public bool IsAccessible { get; set; }
    public string? ErrorMessage { get; set; }
}
