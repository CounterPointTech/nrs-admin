namespace NrsAdmin.Api.Models.Domain;

public class RoutingZone
{
    public int Id { get; set; }
    public string ZoneName { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
}
