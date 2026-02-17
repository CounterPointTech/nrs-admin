namespace NrsAdmin.Api.Models.Requests;

public class StudySearchRequest
{
    public string? PatientName { get; set; }
    public string? PatientId { get; set; }
    public string? Accession { get; set; }
    public string? Modality { get; set; }
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public int? FacilityId { get; set; }
    public int? Status { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string? SortBy { get; set; }
    public bool SortDesc { get; set; } = true;
}
