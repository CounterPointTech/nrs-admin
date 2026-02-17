namespace NrsAdmin.Api.Models.Domain;

public class MappingBackup
{
    public string FileName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public long SizeBytes { get; set; }
}
