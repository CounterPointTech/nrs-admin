using NrsAdmin.Api.Models.Domain;

namespace NrsAdmin.Api.Models.Requests;

public class CreateExternalToolRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ExternalToolType Type { get; set; }
    public string Target { get; set; } = string.Empty;
    public string? Arguments { get; set; }
    public string? WorkingDirectory { get; set; }
    public string? IconName { get; set; }
    public string? Category { get; set; }
    public int SortOrder { get; set; }
    public ExternalToolShell Shell { get; set; } = ExternalToolShell.Default;
    public bool RunAsAdmin { get; set; }
}

public class UpdateExternalToolRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ExternalToolType Type { get; set; }
    public string Target { get; set; } = string.Empty;
    public string? Arguments { get; set; }
    public string? WorkingDirectory { get; set; }
    public string? IconName { get; set; }
    public string? Category { get; set; }
    public int SortOrder { get; set; }
    public ExternalToolShell Shell { get; set; } = ExternalToolShell.Default;
    public bool RunAsAdmin { get; set; }
}

public class ReorderExternalToolsRequest
{
    public List<ReorderItem> Items { get; set; } = [];

    public class ReorderItem
    {
        public Guid Id { get; set; }
        public int SortOrder { get; set; }
    }
}
