namespace NrsAdmin.Api.Models.Domain;

public class Physician
{
    public long Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? Specialty { get; set; }
    public string? Npi { get; set; }
}
