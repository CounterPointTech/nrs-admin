using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;

namespace NrsAdmin.Api.Services;

public partial class MappingFileService
{
    private readonly IOptionsMonitor<MappingFileSettings> _settings;
    private readonly ILogger<MappingFileService> _logger;

    public MappingFileService(IOptionsMonitor<MappingFileSettings> settings, ILogger<MappingFileService> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    public async Task<List<MappingEntry>> ReadEntriesAsync()
    {
        var path = _settings.CurrentValue.Path;
        if (!File.Exists(path))
        {
            _logger.LogWarning("Mapping file not found at {Path}", path);
            return [];
        }

        var lines = await File.ReadAllLinesAsync(path);
        var entries = new List<MappingEntry>();

        for (var i = 0; i < lines.Length; i++)
        {
            var line = lines[i].Trim();
            if (string.IsNullOrWhiteSpace(line))
                continue;

            var entry = new MappingEntry
            {
                LineNumber = i + 1,
                RawLine = lines[i]
            };

            if (line.StartsWith("//"))
            {
                entry.IsComment = true;
                entries.Add(entry);
                continue;
            }

            ParseLine(line, entry);
            entries.Add(entry);
        }

        return entries;
    }

    public async Task<string> ReadRawAsync()
    {
        var path = _settings.CurrentValue.Path;
        if (!File.Exists(path))
        {
            _logger.LogWarning("Mapping file not found at {Path}", path);
            return string.Empty;
        }

        return await File.ReadAllTextAsync(path);
    }

    public async Task WriteEntriesAsync(List<MappingEntry> entries)
    {
        await CreateBackupAsync();

        var sb = new StringBuilder();
        foreach (var entry in entries)
        {
            if (entry.IsComment)
            {
                sb.AppendLine(entry.RawLine ?? "//");
                continue;
            }

            var parts = new List<string>();
            if (!string.IsNullOrEmpty(entry.ModalityAE))
                parts.Add($"ModalityAE={entry.ModalityAE}");
            if (!string.IsNullOrEmpty(entry.ModalitySN))
                parts.Add($"ModalitySN={entry.ModalitySN}");
            if (!string.IsNullOrEmpty(entry.ModalityStationName))
                parts.Add($"ModalityStationName={entry.ModalityStationName}");
            if (!string.IsNullOrEmpty(entry.ModalityLocation))
                parts.Add($"ModalityLocation={entry.ModalityLocation}");
            if (!string.IsNullOrEmpty(entry.RisAE))
                parts.Add($"RISAE={entry.RisAE}");
            if (!string.IsNullOrEmpty(entry.RisSN))
                parts.Add($"RISSN={entry.RisSN}");
            if (entry.PersistStudyUID.HasValue)
                parts.Add($"PersistStudyUID={entry.PersistStudyUID.Value.ToString().ToLower()}");

            sb.AppendLine(string.Join(" ", parts));
        }

        await File.WriteAllTextAsync(_settings.CurrentValue.Path, sb.ToString());
        _logger.LogInformation("Mapping file updated with {Count} entries at {Path}",
            entries.Count(e => !e.IsComment), _settings.CurrentValue.Path);
    }

    public async Task WriteRawAsync(string content)
    {
        await CreateBackupAsync();
        await File.WriteAllTextAsync(_settings.CurrentValue.Path, content);
        _logger.LogInformation("Mapping file updated (raw write) at {Path}", _settings.CurrentValue.Path);
    }

    public async Task<string> CreateBackupAsync()
    {
        var path = _settings.CurrentValue.Path;
        if (!File.Exists(path))
            throw new FileNotFoundException("Mapping file not found.", path);

        var backupDir = _settings.CurrentValue.BackupDirectory;
        Directory.CreateDirectory(backupDir);

        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
        var backupFileName = $"modality_mapping_{timestamp}.txt";
        var backupPath = Path.Combine(backupDir, backupFileName);

        await FileExtensions.CopyAsync(path, backupPath);
        _logger.LogInformation("Mapping file backed up to {BackupPath}", backupPath);

        return backupFileName;
    }

    public List<MappingBackup> ListBackups()
    {
        var backupDir = _settings.CurrentValue.BackupDirectory;
        if (!Directory.Exists(backupDir))
            return [];

        return Directory.GetFiles(backupDir, "modality_mapping_*.txt")
            .Select(f => new FileInfo(f))
            .OrderByDescending(f => f.CreationTimeUtc)
            .Select(f => new MappingBackup
            {
                FileName = f.Name,
                CreatedAt = f.CreationTimeUtc,
                SizeBytes = f.Length
            })
            .ToList();
    }

    public async Task RestoreFromBackupAsync(string fileName)
    {
        // Validate filename to prevent path traversal
        if (fileName.Contains("..") || fileName.Contains('/') || fileName.Contains('\\'))
            throw new ArgumentException("Invalid backup filename.");

        var backupPath = Path.Combine(_settings.CurrentValue.BackupDirectory, fileName);
        if (!File.Exists(backupPath))
            throw new FileNotFoundException("Backup file not found.", fileName);

        // Backup the current file before restoring
        await CreateBackupAsync();

        File.Copy(backupPath, _settings.CurrentValue.Path, overwrite: true);
        _logger.LogInformation("Mapping file restored from backup {FileName}", fileName);
    }

    public List<string> ValidateEntries(List<MappingEntry> entries)
    {
        var errors = new List<string>();
        var lineNum = 0;

        foreach (var entry in entries)
        {
            lineNum++;
            if (entry.IsComment)
                continue;

            var hasSource = !string.IsNullOrWhiteSpace(entry.ModalityAE)
                         || !string.IsNullOrWhiteSpace(entry.ModalitySN);
            var hasTarget = !string.IsNullOrWhiteSpace(entry.RisAE)
                         || !string.IsNullOrWhiteSpace(entry.RisSN);

            if (!hasSource && !hasTarget)
            {
                errors.Add($"Line {lineNum}: Must have at least (ModalityAE or ModalitySN) AND (RISAE or RISSN).");
                continue;
            }

            if (!hasSource)
                errors.Add($"Line {lineNum}: Missing source — need ModalityAE or ModalitySN.");
            if (!hasTarget)
                errors.Add($"Line {lineNum}: Missing target — need RISAE or RISSN.");

            if (entry.ModalityAE?.Length > 16)
                errors.Add($"Line {lineNum}: ModalityAE exceeds 16 characters (DICOM AE Title limit).");
            if (entry.RisAE?.Length > 16)
                errors.Add($"Line {lineNum}: RISAE exceeds 16 characters (DICOM AE Title limit).");

            if (entry.ModalityAE is not null && !AeTitlePattern().IsMatch(entry.ModalityAE))
                errors.Add($"Line {lineNum}: ModalityAE contains invalid characters.");
            if (entry.RisAE is not null && entry.RisAE.Length > 0 && !AeTitlePattern().IsMatch(entry.RisAE))
                errors.Add($"Line {lineNum}: RISAE contains invalid characters.");
        }

        return errors;
    }

    private static void ParseLine(string line, MappingEntry entry)
    {
        // Parse key=value pairs separated by spaces
        var matches = KeyValuePattern().Matches(line);
        foreach (Match match in matches)
        {
            var key = match.Groups[1].Value;
            var value = match.Groups[2].Value;

            switch (key)
            {
                case "ModalityAE":
                    entry.ModalityAE = value;
                    break;
                case "ModalitySN":
                    entry.ModalitySN = value;
                    break;
                case "ModalityStationName":
                    entry.ModalityStationName = value;
                    break;
                case "ModalityLocation":
                    entry.ModalityLocation = value;
                    break;
                case "RISAE":
                    entry.RisAE = value;
                    break;
                case "RISSN":
                    entry.RisSN = value;
                    break;
                case "PersistStudyUID":
                    entry.PersistStudyUID = string.Equals(value, "true", StringComparison.OrdinalIgnoreCase);
                    break;
            }
        }
    }

    [GeneratedRegex(@"(\w+)=(\S*)")]
    private static partial Regex KeyValuePattern();

    [GeneratedRegex(@"^[A-Za-z0-9_\-. ]+$")]
    private static partial Regex AeTitlePattern();
}

// File.CopyAsync doesn't exist in .NET 8, add as extension
internal static class FileExtensions
{
    public static async Task CopyAsync(string sourceFileName, string destFileName)
    {
        await using var source = new FileStream(sourceFileName, FileMode.Open, FileAccess.Read,
            FileShare.Read, 4096, useAsync: true);
        await using var dest = new FileStream(destFileName, FileMode.Create, FileAccess.Write,
            FileShare.None, 4096, useAsync: true);
        await source.CopyToAsync(dest);
    }
}
