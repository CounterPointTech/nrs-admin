namespace NrsAdmin.Api.Configuration;

public class ConnectionSettings
{
    public DatabaseConnectionSettings Database { get; set; } = new();
    public MappingFileConnectionSettings MappingFile { get; set; } = new();
    public ReportTemplateConnectionSettings ReportTemplate { get; set; } = new();
    public NovaradServerConnectionSettings NovaradServer { get; set; } = new();
}

/// <summary>
/// Points to the Windows host where NovaPACS / NovaRIS services run.
/// Can differ from the database host (the DB is sometimes on a separate server).
/// Empty/null = local machine (the NRS Admin API host).
/// </summary>
public class NovaradServerConnectionSettings
{
    public string Host { get; set; } = string.Empty;
}

public class DatabaseConnectionSettings
{
    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 5432;
    public string Database { get; set; } = "novarad";
    public string Username { get; set; } = "nrsvc";
    public string Password { get; set; } = string.Empty;
    public int Timeout { get; set; } = 30;

    public string ToConnectionString()
    {
        return $"Host={Host};Port={Port};Database={Database};Username={Username};Password={Password};Timeout={Timeout}";
    }
}

public class MappingFileConnectionSettings
{
    public string Path { get; set; } = @"D:\NovaRad\NovaRIS\Server\modality_mapping.txt";
    public string BackupDirectory { get; set; } = @"D:\NovaRad\NovaRIS\Server\mapping_backups";
}

public class ReportTemplateConnectionSettings
{
    public string Directory { get; set; } = @"D:\NovaRad\NovaRIS\Server\ReportTemplates";
    public string BackupDirectory { get; set; } = @"D:\NovaRad\NovaRIS\Server\ReportTemplates\backups";
}
