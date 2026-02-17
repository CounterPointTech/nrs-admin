namespace NrsAdmin.Api.Models.Domain;

public class Facility
{
    public int FacilityId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsDefault { get; set; }
}
