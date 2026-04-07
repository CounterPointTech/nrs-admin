namespace NrsAdmin.Api.Models.Domain;

public class BillingServiceCode
{
    public long ServiceCodeId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ModalityType { get; set; }
    public decimal? RvuWork { get; set; }
    public string? CustomField1 { get; set; }
    public string? CustomField2 { get; set; }
    public string? CustomField3 { get; set; }
}
