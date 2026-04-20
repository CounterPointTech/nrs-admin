namespace NrsAdmin.Api.Configuration;

/// <summary>
/// Settings controlling which Windows services the dashboard Services card lists.
/// </summary>
public class ServicesMonitorSettings
{
    /// <summary>
    /// Remote machine name to query. Null/empty = local machine (the API host).
    /// Remote queries require appropriate network + permissions (typically admin on the target).
    /// </summary>
    public string? Host { get; set; }

    /// <summary>
    /// Glob-style patterns matched case-insensitively against service <c>ServiceName</c>.
    /// Use <c>*</c> as a wildcard. Defaults to Novarad-related service names.
    /// Match is OR-ed across patterns; a service listed exactly in <see cref="ExactNames"/>
    /// is always included even if it doesn't match a pattern.
    /// </summary>
    public List<string> Patterns { get; set; } = new() { "Novarad*", "Nova*", "NRS*" };

    /// <summary>
    /// Exact service names to always include (case-insensitive). Useful when a service
    /// doesn't fit a pattern but should still be monitored (e.g., "postgresql-x64-14").
    /// </summary>
    public List<string> ExactNames { get; set; } = new();
}
