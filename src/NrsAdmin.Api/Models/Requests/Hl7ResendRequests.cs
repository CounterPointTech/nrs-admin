namespace NrsAdmin.Api.Models.Requests;

public class Hl7ProcedureSearchRequest
{
    public DateTime StartDate { get; set; } = DateTime.Today.AddDays(-7);
    public DateTime EndDate { get; set; } = DateTime.Today;
    public string? AccessionNumber { get; set; }
    public string? PatientId { get; set; }
    public string? Status { get; set; }
}

public class Hl7DftResendRequest
{
    public List<long> ProcedureIds { get; set; } = new();
}

public class Hl7ResendStatusRequest
{
    public List<long> ProcedureIds { get; set; } = new();
}

public class Hl7MdmByAccessionRequest
{
    public List<string> AccessionNumbers { get; set; } = new();
}

public class Hl7MdmByDateRequest
{
    public DateTime StartDateTime { get; set; }
    public DateTime EndDateTime { get; set; }
    public long? PhysicianId { get; set; }
}
