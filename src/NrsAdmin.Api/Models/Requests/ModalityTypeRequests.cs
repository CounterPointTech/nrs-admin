namespace NrsAdmin.Api.Models.Requests;

public class CreateModalityTypeRequest
{
    public string ModalityTypeId { get; set; } = string.Empty;
    public string? Description { get; set; }
}
