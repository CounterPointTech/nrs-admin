namespace NrsAdmin.Api.Models.Domain;

public class Site
{
    public int SiteId { get; set; }
    public string SiteCode { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsDefault { get; set; }
}
