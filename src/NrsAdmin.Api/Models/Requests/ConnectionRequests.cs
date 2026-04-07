using NrsAdmin.Api.Configuration;

namespace NrsAdmin.Api.Models.Requests;

public class SaveConnectionRequest
{
    public DatabaseConnectionSettings? Database { get; set; }
    public MappingFileConnectionSettings? MappingFile { get; set; }
    public ReportTemplateConnectionSettings? ReportTemplate { get; set; }
}

public class TestConnectionRequest
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 5432;
    public string Database { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public int Timeout { get; set; } = 10;
}

public class TestPathRequest
{
    public string Path { get; set; } = string.Empty;
}
