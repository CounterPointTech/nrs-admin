namespace NrsAdmin.Api.Models.Domain;

public class Modality
{
    public int ModalityId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Room { get; set; }
    public string? Status { get; set; }
    public string ModalityTypeId { get; set; } = string.Empty;
    public bool IsRetired { get; set; }
    public string? AeTitle { get; set; }
    public bool SupportsWorklist { get; set; }
    public bool SupportsMpps { get; set; }
    public int? FacilityId { get; set; }

    // Joined from shared.facilities
    public string? FacilityName { get; set; }
}
