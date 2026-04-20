namespace NrsAdmin.Api.Configuration;

public class ExternalToolsSettings
{
    public string Directory { get; set; } = @"D:\NrsAdmin\ExternalTools";

    /// <summary>
    /// Shell used to run <see cref="Models.Domain.ExternalToolType.Command"/> tools.
    /// Defaults to cmd.exe; set to a full path (e.g., to pwsh.exe) to use PowerShell.
    /// </summary>
    public string CommandShell { get; set; } = "cmd.exe";

    /// <summary>
    /// Argument prefix passed to the shell before the user's command.
    /// For cmd.exe, "/k" keeps the console window open after the command completes
    /// (so the user can see output); "/c" closes it immediately.
    /// For pwsh.exe, use "-NoExit -Command" to keep the window open.
    /// </summary>
    public string CommandShellArgPrefix { get; set; } = "/k";
}
