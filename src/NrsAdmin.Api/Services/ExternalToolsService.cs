using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;

namespace NrsAdmin.Api.Services;

public class ExternalToolsService
{
    private readonly IOptionsMonitor<ExternalToolsSettings> _settings;
    private readonly ILogger<ExternalToolsService> _logger;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    // Per-user file-write serialization — one semaphore per user keeps concurrent
    // POST/PUT/DELETE calls for the same user from corrupting the JSON file.
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<int, SemaphoreSlim> _userLocks = new();

    public ExternalToolsService(
        IOptionsMonitor<ExternalToolsSettings> settings,
        ILogger<ExternalToolsService> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    public async Task<List<ExternalTool>> ListAsync(int userId)
    {
        var file = await LoadFileAsync(userId);
        return file.Tools
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public async Task<ExternalTool> CreateAsync(int userId, CreateExternalToolRequest request)
    {
        ValidateRequest(request.Name, request.Type, request.Target);

        var gate = _userLocks.GetOrAdd(userId, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync();
        try
        {
            var file = await LoadFileAsync(userId);
            var now = DateTime.UtcNow;

            var tool = new ExternalTool
            {
                Id = Guid.NewGuid(),
                Name = request.Name.Trim(),
                Description = request.Description?.Trim(),
                Type = request.Type,
                Target = request.Target.Trim(),
                Arguments = NullIfEmpty(request.Arguments),
                WorkingDirectory = NullIfEmpty(request.WorkingDirectory),
                IconName = NullIfEmpty(request.IconName),
                Category = NullIfEmpty(request.Category),
                SortOrder = request.SortOrder,
                Shell = request.Shell,
                RunAsAdmin = request.RunAsAdmin,
                CreatedAt = now,
                UpdatedAt = now
            };

            file.Tools.Add(tool);
            await SaveFileAsync(userId, file);

            _logger.LogInformation("External tool created — user {UserId} tool {Id} '{Name}' type {Type}",
                userId, tool.Id, tool.Name, tool.Type);
            return tool;
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task<ExternalTool> UpdateAsync(int userId, Guid id, UpdateExternalToolRequest request)
    {
        ValidateRequest(request.Name, request.Type, request.Target);

        var gate = _userLocks.GetOrAdd(userId, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync();
        try
        {
            var file = await LoadFileAsync(userId);
            var tool = file.Tools.FirstOrDefault(t => t.Id == id)
                ?? throw new FileNotFoundException($"External tool '{id}' not found for user {userId}.");

            tool.Name = request.Name.Trim();
            tool.Description = request.Description?.Trim();
            tool.Type = request.Type;
            tool.Target = request.Target.Trim();
            tool.Arguments = NullIfEmpty(request.Arguments);
            tool.WorkingDirectory = NullIfEmpty(request.WorkingDirectory);
            tool.IconName = NullIfEmpty(request.IconName);
            tool.Category = NullIfEmpty(request.Category);
            tool.SortOrder = request.SortOrder;
            tool.Shell = request.Shell;
            tool.RunAsAdmin = request.RunAsAdmin;
            tool.UpdatedAt = DateTime.UtcNow;

            await SaveFileAsync(userId, file);

            _logger.LogInformation("External tool updated — user {UserId} tool {Id} '{Name}'",
                userId, tool.Id, tool.Name);
            return tool;
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task DeleteAsync(int userId, Guid id)
    {
        var gate = _userLocks.GetOrAdd(userId, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync();
        try
        {
            var file = await LoadFileAsync(userId);
            var removed = file.Tools.RemoveAll(t => t.Id == id);
            if (removed == 0)
                throw new FileNotFoundException($"External tool '{id}' not found for user {userId}.");

            await SaveFileAsync(userId, file);
            _logger.LogInformation("External tool deleted — user {UserId} tool {Id}", userId, id);
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task ReorderAsync(int userId, ReorderExternalToolsRequest request)
    {
        var gate = _userLocks.GetOrAdd(userId, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync();
        try
        {
            var file = await LoadFileAsync(userId);
            var byId = file.Tools.ToDictionary(t => t.Id);

            foreach (var item in request.Items)
            {
                if (byId.TryGetValue(item.Id, out var tool))
                {
                    tool.SortOrder = item.SortOrder;
                    tool.UpdatedAt = DateTime.UtcNow;
                }
            }

            await SaveFileAsync(userId, file);
        }
        finally
        {
            gate.Release();
        }
    }

    /// <summary>
    /// Launches the given tool via <see cref="Process.Start"/>. Returns immediately (fire-and-forget);
    /// the process runs under the identity of the API host.
    /// </summary>
    public async Task<ExternalTool> LaunchAsync(int userId, Guid id)
    {
        var file = await LoadFileAsync(userId);
        var tool = file.Tools.FirstOrDefault(t => t.Id == id)
            ?? throw new FileNotFoundException($"External tool '{id}' not found for user {userId}.");

        if (tool.Type == ExternalToolType.Url)
            throw new InvalidOperationException("URL tools are launched in the browser and must not hit the launch endpoint.");

        var settings = _settings.CurrentValue;
        ProcessStartInfo psi = tool.Type switch
        {
            ExternalToolType.Executable => new ProcessStartInfo
            {
                FileName = tool.Target,
                Arguments = tool.Arguments ?? string.Empty,
                WorkingDirectory = tool.WorkingDirectory ?? string.Empty,
                UseShellExecute = true,
                CreateNoWindow = false,
                Verb = tool.RunAsAdmin ? "runas" : string.Empty
            },
            ExternalToolType.FileOrFolder => new ProcessStartInfo
            {
                FileName = tool.Target,
                WorkingDirectory = tool.WorkingDirectory ?? string.Empty,
                UseShellExecute = true,
                CreateNoWindow = false,
                Verb = tool.RunAsAdmin ? "runas" : string.Empty
            },
            ExternalToolType.Command => BuildCommandStartInfo(tool, settings),
            _ => throw new InvalidOperationException($"Unsupported tool type: {tool.Type}")
        };

        try
        {
            using var proc = Process.Start(psi);
            _logger.LogInformation("External tool launched — user {UserId} tool {Id} '{Name}' type {Type} pid {Pid}",
                userId, tool.Id, tool.Name, tool.Type, proc?.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "External tool launch failed — user {UserId} tool {Id} '{Name}' type {Type}",
                userId, tool.Id, tool.Name, tool.Type);
            throw;
        }

        return tool;
    }

    /// <summary>
    /// Resolves the shell executable and "keep window open" argument prefix based on the
    /// per-tool <see cref="ExternalToolShell"/> choice, falling back to global settings
    /// when the tool opts for <see cref="ExternalToolShell.Default"/>.
    /// </summary>
    private static (string Exe, string ArgPrefix) ResolveShell(ExternalTool tool, ExternalToolsSettings settings)
    {
        return tool.Shell switch
        {
            ExternalToolShell.Cmd => ("cmd.exe", "/k"),
            ExternalToolShell.PowerShell => ("powershell.exe", "-NoExit -Command"),
            ExternalToolShell.PwshCore => ("pwsh.exe", "-NoExit -Command"),
            _ => (settings.CommandShell, settings.CommandShellArgPrefix)
        };
    }

    /// <summary>
    /// Builds a ProcessStartInfo that spawns the command in a brand-new console window.
    /// <para>
    /// Non-elevated path: uses <c>cmd /c start "Title" shell args command</c> — the outer cmd
    /// exits immediately and <c>start</c> detaches the inner shell into its own window, which
    /// avoids inheriting the API host's console when the API is attached to a terminal.
    /// </para>
    /// <para>
    /// Elevated path: invokes the shell directly with <c>UseShellExecute=true</c> +
    /// <c>Verb="runas"</c>, which shows a UAC prompt and spawns a fresh elevated console.
    /// The <c>cmd /c start</c> trick can't pass the runas verb through cleanly, so we rely
    /// on ShellExecute here — which reliably creates its own window for console apps.
    /// </para>
    /// </summary>
    private static ProcessStartInfo BuildCommandStartInfo(ExternalTool tool, ExternalToolsSettings settings)
    {
        var (shellExe, argPrefix) = ResolveShell(tool, settings);
        var extraArgs = string.IsNullOrWhiteSpace(tool.Arguments) ? string.Empty : " " + tool.Arguments;
        var innerArgs = $"{argPrefix} {tool.Target}{extraArgs}".Trim();

        if (tool.RunAsAdmin)
        {
            return new ProcessStartInfo
            {
                FileName = shellExe,
                Arguments = innerArgs,
                WorkingDirectory = tool.WorkingDirectory ?? string.Empty,
                UseShellExecute = true,
                Verb = "runas"
            };
        }

        var safeTitle = (tool.Name ?? "Tool").Replace("\"", "'");
        return new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = $"/c start \"{safeTitle}\" \"{shellExe}\" {innerArgs}",
            WorkingDirectory = tool.WorkingDirectory ?? string.Empty,
            UseShellExecute = false,
            CreateNoWindow = true
        };
    }

    // ---- File I/O ----

    private string GetUserFilePath(int userId)
    {
        var dir = _settings.CurrentValue.Directory;
        return Path.Combine(dir, $"{userId}.json");
    }

    private async Task<ExternalToolsFile> LoadFileAsync(int userId)
    {
        var path = GetUserFilePath(userId);
        if (!File.Exists(path))
            return new ExternalToolsFile();

        try
        {
            await using var stream = File.OpenRead(path);
            var file = await JsonSerializer.DeserializeAsync<ExternalToolsFile>(stream, JsonOpts);
            return file ?? new ExternalToolsFile();
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse external tools file for user {UserId} at {Path} — returning empty list",
                userId, path);
            return new ExternalToolsFile();
        }
    }

    private async Task SaveFileAsync(int userId, ExternalToolsFile file)
    {
        var dir = _settings.CurrentValue.Directory;
        Directory.CreateDirectory(dir);

        var path = GetUserFilePath(userId);
        var tmpPath = path + ".tmp";

        var json = JsonSerializer.Serialize(file, JsonOpts);
        await File.WriteAllTextAsync(tmpPath, json);

        // Atomic replace — avoids partial writes on crash.
        if (File.Exists(path))
            File.Replace(tmpPath, path, destinationBackupFileName: null);
        else
            File.Move(tmpPath, path);
    }

    // ---- Validation ----

    private static void ValidateRequest(string name, ExternalToolType type, string target)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name is required.");
        if (name.Length > 100)
            throw new ArgumentException("Name must be 100 characters or fewer.");

        if (string.IsNullOrWhiteSpace(target))
            throw new ArgumentException("Target is required.");
        if (target.Contains('\0'))
            throw new ArgumentException("Target contains invalid characters.");

        if (type == ExternalToolType.Url)
        {
            if (!Uri.TryCreate(target, UriKind.Absolute, out var uri))
                throw new ArgumentException("URL must be an absolute URI.");
            var scheme = uri.Scheme.ToLowerInvariant();
            if (scheme is not ("http" or "https"))
                throw new ArgumentException("URL scheme must be http or https.");
        }
    }

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
