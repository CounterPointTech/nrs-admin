namespace NrsAdmin.Api.Models.Domain;

public class PacsDestination
{
    public int DestinationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string AeTitle { get; set; } = string.Empty;
    public int Port { get; set; }
    public short Type { get; set; }
    public string? Password { get; set; }
    public int NumTries { get; set; }
    public int Frequency { get; set; }
    public int Compression { get; set; } = 1;
    public short Status { get; set; }
    public bool RouteRelated { get; set; }
    public string TransferSyntax { get; set; } = "NegotiateTransferContext";
    public int? RoutingZone { get; set; }

    // Joined from pacs.routing_zones
    public string? RoutingZoneName { get; set; }
}
