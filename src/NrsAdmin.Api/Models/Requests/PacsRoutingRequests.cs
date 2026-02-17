namespace NrsAdmin.Api.Models.Requests;

public class CreatePacsDestinationRequest
{
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string AeTitle { get; set; } = string.Empty;
    public int Port { get; set; }
    public short Type { get; set; }
    public string? Password { get; set; }
    public int NumTries { get; set; } = 3;
    public int Frequency { get; set; } = 0;
    public int Compression { get; set; } = 1;
    public short Status { get; set; }
    public bool RouteRelated { get; set; }
    public string TransferSyntax { get; set; } = "NegotiateTransferContext";
    public int? RoutingZone { get; set; }
}

public class UpdatePacsDestinationRequest
{
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
}

public class CreateRoutingZoneRequest
{
    public string ZoneName { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
}

public class UpdateRoutingZoneRequest
{
    public string ZoneName { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
}
