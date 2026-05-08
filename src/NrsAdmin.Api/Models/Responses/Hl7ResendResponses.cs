using NrsAdmin.Api.Models.Domain;

namespace NrsAdmin.Api.Models.Responses;

public class Hl7DftResendResponse
{
    public int RequestedCount { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public List<Hl7DftResendItemResult> Results { get; set; } = new();
}

public class Hl7DftResendItemResult
{
    public long ProcedureId { get; set; }
    public bool Success { get; set; }
    public string Status { get; set; } = "Pending";
    public string? ErrorMessage { get; set; }
}

public class Hl7MdmResendResponse
{
    public int QueuedCount { get; set; }
    public int InputCount { get; set; }
    public string Message { get; set; } = string.Empty;
}
