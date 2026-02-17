namespace NrsAdmin.Api.Models.Requests;

public class CreateModalityRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Room { get; set; }
    public string? Status { get; set; } = "Active";
    public string ModalityTypeId { get; set; } = string.Empty;
    public bool IsRetired { get; set; }
    public string? AeTitle { get; set; }
    public bool SupportsWorklist { get; set; } = true;
    public bool SupportsMpps { get; set; }
    public int FacilityId { get; set; }
}

public class UpdateModalityRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Room { get; set; }
    public string? Status { get; set; }
    public string ModalityTypeId { get; set; } = string.Empty;
    public bool IsRetired { get; set; }
    public string? AeTitle { get; set; }
    public bool SupportsWorklist { get; set; }
    public bool SupportsMpps { get; set; }
    public int FacilityId { get; set; }
}
