namespace NrsAdmin.Api.Models.Domain;

public class ServiceInfo
{
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    /// <summary>Mirrors <c>ServiceControllerStatus</c>: Running, Stopped, StartPending, StopPending, Paused, PausePending, ContinuePending.</summary>
    public string Status { get; set; } = "Unknown";
    public bool CanStop { get; set; }
    public bool CanPauseAndContinue { get; set; }
}

public class ServicesSnapshot
{
    /// <summary>Host the services were read from. "local" for the API host.</summary>
    public string Host { get; set; } = "local";
    public bool Remote { get; set; }
    public DateTime CheckedAt { get; set; }
    public List<ServiceInfo> Services { get; set; } = new();
    /// <summary>Present when the query failed (e.g., host unreachable, access denied).</summary>
    public string? Error { get; set; }
}
