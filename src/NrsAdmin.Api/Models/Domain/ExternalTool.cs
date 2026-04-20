using System.Text.Json.Serialization;

namespace NrsAdmin.Api.Models.Domain;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ExternalToolType
{
    Url,
    Executable,
    Command,
    FileOrFolder
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ExternalToolShell
{
    /// <summary>Use the shell configured in ExternalToolsSettings (default cmd.exe).</summary>
    Default,
    /// <summary>Windows Command Prompt (cmd.exe). Args prefix: /k</summary>
    Cmd,
    /// <summary>Windows PowerShell 5.x (powershell.exe). Args prefix: -NoExit -Command</summary>
    PowerShell,
    /// <summary>PowerShell Core 7+ (pwsh.exe). Args prefix: -NoExit -Command</summary>
    PwshCore
}

public class ExternalTool
{
    public Guid Id { get; set; }
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
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// On-disk envelope: one file per user at {ExternalToolsSettings.Directory}/{userId}.json.
/// </summary>
public class ExternalToolsFile
{
    public int Version { get; set; } = 1;
    public List<ExternalTool> Tools { get; set; } = [];
}
