namespace NrsAdmin.Api.Models.Domain;

public class Series
{
    public long Id { get; set; }
    public string SeriesUid { get; set; } = string.Empty;
    public string? SeriesId { get; set; }
    public string Modality { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int NumImages { get; set; }
    public string? Manufacturer { get; set; }
    public bool IsKeyImages { get; set; }
    public DateTime ModifiedDate { get; set; }
}
