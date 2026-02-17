namespace NrsAdmin.Api.Models.Domain;

public class Hl7MessageForwarding
{
    public int ForwardingId { get; set; }
    public string Address { get; set; } = string.Empty;
    public int Port { get; set; }
    public string? Message { get; set; }
    public string? Event { get; set; }
    public string? ExternalKey { get; set; }
    public bool SendPostProcessing { get; set; } = true;
    public int ProductId { get; set; } = 1;
}
