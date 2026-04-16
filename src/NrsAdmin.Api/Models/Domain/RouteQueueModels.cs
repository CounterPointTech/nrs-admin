namespace NrsAdmin.Api.Models.Domain;

/// <summary>
/// Pending route in pacs.route_queue
/// </summary>
public class RouteQueueItem
{
    public int Id { get; set; }
    public int DestinationId { get; set; }
    public long Dataset { get; set; }
    public DateTime TimeQueued { get; set; }
    public short Priority { get; set; }
    public short Status { get; set; }
    public DateTime? NextTryTime { get; set; }
    public int RemainingTries { get; set; }
    public bool OverwriteExisting { get; set; }

    // Joined fields
    public string? DestinationName { get; set; }
    public string? StudyUid { get; set; }
    public string? PatientName { get; set; }
    public string? PatientId { get; set; }
    public string? Modality { get; set; }
    public string? SeriesDescription { get; set; }
}

/// <summary>
/// Failed route in pacs.route_errors
/// </summary>
public class RouteError
{
    public int Id { get; set; }
    public int DestinationId { get; set; }
    public long Dataset { get; set; }
    public DateTime TimeQueued { get; set; }
    public short Priority { get; set; }
    public string Error { get; set; } = string.Empty;
    public DateTime LastTryTime { get; set; }
    public bool OverwriteExisting { get; set; }

    // Joined fields
    public string? DestinationName { get; set; }
    public string? StudyUid { get; set; }
    public string? PatientName { get; set; }
    public string? PatientId { get; set; }
    public string? Modality { get; set; }
    public string? SeriesDescription { get; set; }
}

/// <summary>
/// Completed route in pacs.route_history (enriched with study/patient info)
/// </summary>
public class RouteHistoryItem
{
    public int Id { get; set; }
    public int DestinationId { get; set; }
    public long Dataset { get; set; }
    public DateTime TimeSent { get; set; }
    public bool OverwriteExisting { get; set; }

    // Joined fields
    public string? DestinationName { get; set; }
    public string? StudyUid { get; set; }
    public string? PatientName { get; set; }
    public string? PatientId { get; set; }
    public string? Modality { get; set; }
    public string? SeriesDescription { get; set; }
}

/// <summary>
/// Aggregate counts per destination for the queue summary dashboard
/// </summary>
public class QueueSummary
{
    public int DestinationId { get; set; }
    public string DestinationName { get; set; } = string.Empty;
    public int PendingCount { get; set; }
    public int ErrorCount { get; set; }
    public int CompletedToday { get; set; }
}
