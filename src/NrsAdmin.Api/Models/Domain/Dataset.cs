namespace NrsAdmin.Api.Models.Domain;

public class Dataset
{
    public long Id { get; set; }
    public string InstanceUid { get; set; } = string.Empty;
    public int InstanceNumber { get; set; }
    public int? FileSize { get; set; }
    public string? MimeType { get; set; }
}
