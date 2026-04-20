using System.Text.Json;

namespace NrsAdmin.Api.Configuration;

public class ConnectionJsonConfigurationSource : IConfigurationSource
{
    private readonly string _filePath;

    public ConnectionJsonConfigurationSource(string filePath)
    {
        _filePath = filePath;
    }

    public IConfigurationProvider Build(IConfigurationBuilder builder)
    {
        return new ConnectionJsonConfigurationProvider(_filePath);
    }
}

public class ConnectionJsonConfigurationProvider : ConfigurationProvider
{
    private readonly string _filePath;

    public ConnectionJsonConfigurationProvider(string filePath)
    {
        _filePath = filePath;
    }

    public override void Load()
    {
        if (!File.Exists(_filePath))
            return;

        try
        {
            var json = File.ReadAllText(_filePath);
            var settings = JsonSerializer.Deserialize<ConnectionSettings>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (settings is null)
                return;

            // Map structured fields to flat config keys
            if (settings.Database is { } db)
            {
                Data["Database:MainConnectionString"] = db.ToConnectionString();
            }

            if (settings.MappingFile is { } mf)
            {
                if (!string.IsNullOrEmpty(mf.Path))
                    Data["MappingFile:Path"] = mf.Path;
                if (!string.IsNullOrEmpty(mf.BackupDirectory))
                    Data["MappingFile:BackupDirectory"] = mf.BackupDirectory;
            }

            if (settings.ReportTemplate is { } rt)
            {
                if (!string.IsNullOrEmpty(rt.Directory))
                    Data["ReportTemplate:Directory"] = rt.Directory;
                if (!string.IsNullOrEmpty(rt.BackupDirectory))
                    Data["ReportTemplate:BackupDirectory"] = rt.BackupDirectory;
            }

            if (settings.NovaradServer is { Host: { Length: > 0 } host })
            {
                // Feed the Novarad server host into ServicesMonitor so a single setting
                // drives both "where the services live" and any future features that
                // need to reach the PACS/RIS host.
                Data["ServicesMonitor:Host"] = host;
            }
        }
        catch (Exception ex)
        {
            // Log but don't crash — fall back to appsettings.json defaults
            Console.Error.WriteLine($"Failed to load connection.json: {ex.Message}");
        }
    }

    public void Reload()
    {
        Data.Clear();
        Load();
        OnReload();
    }
}
