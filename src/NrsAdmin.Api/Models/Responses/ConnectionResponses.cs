namespace NrsAdmin.Api.Models.Responses;

public class ConnectionStatusResponse
{
    public bool IsConfigured { get; set; }
    public bool IsConnected { get; set; }
    public string? ServerVersion { get; set; }
    public string? DatabaseName { get; set; }
    public string? Host { get; set; }
}

public class ConnectionSettingsResponse
{
    public DatabaseSettingsResponse Database { get; set; } = new();
    public MappingFileSettingsResponse MappingFile { get; set; } = new();
    public ReportTemplateSettingsResponse ReportTemplate { get; set; } = new();
}

public class DatabaseSettingsResponse
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; }
    public string Database { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public int Timeout { get; set; }
    // No password field — intentionally excluded
}

public class MappingFileSettingsResponse
{
    public string Path { get; set; } = string.Empty;
    public string BackupDirectory { get; set; } = string.Empty;
}

public class ReportTemplateSettingsResponse
{
    public string Directory { get; set; } = string.Empty;
    public string BackupDirectory { get; set; } = string.Empty;
}

public class TestConnectionResponse
{
    public bool Success { get; set; }
    public string? ServerVersion { get; set; }
    public bool IsNovaradDatabase { get; set; }
    public string? ErrorMessage { get; set; }
}

public class TestPathResponse
{
    public bool Exists { get; set; }
    public bool IsAccessible { get; set; }
    public string? ErrorMessage { get; set; }
}

public class BrowseResponse
{
    public string CurrentPath { get; set; } = string.Empty;
    public string? Parent { get; set; }
    public List<BrowseEntry> Entries { get; set; } = [];
}

public class BrowseEntry
{
    public string Name { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public bool IsDirectory { get; set; }
    public long? Size { get; set; }
}
