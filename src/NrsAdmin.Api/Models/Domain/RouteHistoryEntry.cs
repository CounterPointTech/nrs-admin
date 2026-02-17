namespace NrsAdmin.Api.Models.Domain;

public class RouteHistoryEntry
{
    public int Id { get; set; }
    public int DestinationId { get; set; }
    public long Dataset { get; set; }
    public DateTime TimeSent { get; set; }
    public bool OverwriteExisting { get; set; }

    // Joined from pacs.destinations
    public string? DestinationName { get; set; }
}
