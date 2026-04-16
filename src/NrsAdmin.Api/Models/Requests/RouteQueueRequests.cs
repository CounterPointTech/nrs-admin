namespace NrsAdmin.Api.Models.Requests;

public class RouteQueueSearchRequest
{
    public int? DestinationId { get; set; }
    public short? Status { get; set; }
    public short? Priority { get; set; }
    public string? PatientName { get; set; }
    public string? StudyUid { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string SortBy { get; set; } = "TimeQueued";
    public bool SortDesc { get; set; } = true;
}

public class RouteHistorySearchRequest
{
    public int? DestinationId { get; set; }
    public string? PatientName { get; set; }
    public string? StudyUid { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string SortBy { get; set; } = "TimeSent";
    public bool SortDesc { get; set; } = true;
}

public class QueueStudyRequest
{
    public string StudyUid { get; set; } = string.Empty;
    public int DestinationId { get; set; }
    public short Priority { get; set; } = 0;
    public bool OverwriteExisting { get; set; } = false;
}

public class QueueSeriesRequest
{
    public string SeriesUid { get; set; } = string.Empty;
    public int DestinationId { get; set; }
    public short Priority { get; set; } = 0;
    public bool OverwriteExisting { get; set; } = false;
}
