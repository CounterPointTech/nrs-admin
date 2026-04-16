using System.Text.Json.Serialization;

namespace NrsAdmin.Api.Models.Requests;

public class UpdateRisOrderRequest
{
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public string? PatientComplaint { get; set; }
    public string? PhysicianReason { get; set; }
    public string? CustomField1 { get; set; }
    public string? CustomField2 { get; set; }
    public string? CustomField3 { get; set; }
    public string? CustomField4 { get; set; }
}

public class UpdateRisOrderProcedureRequest
{
    public string? Notes { get; set; }
    public string? SchedulerNotes { get; set; }
    public string? CustomField1 { get; set; }
    public string? CustomField2 { get; set; }
    public string? CustomField3 { get; set; }
}

public class LinkStudyRequest
{
    public long OrderId { get; set; }
}

public class PatientMergeRequest
{
    public string TargetPatientId { get; set; } = string.Empty;
    public string TargetSiteCode { get; set; } = string.Empty;
    public string SourcePatientId { get; set; } = string.Empty;
    public string SourceSiteCode { get; set; } = string.Empty;
    public bool MoveOrders { get; set; } = true;
    public bool MoveDocuments { get; set; } = true;
}

public class SearchRisOrdersRequest
{
    public string? AccessionNumber { get; set; }
    public string? PatientId { get; set; }
    public string? PatientName { get; set; }
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class UpdateRisPatientDetailsRequest
{
    // ris.people fields
    public string? Address1 { get; set; }
    public string? Address2 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Zip { get; set; }
    public string? HomePhone { get; set; }
    public string? WorkPhone { get; set; }
    public string? MobilePhone { get; set; }
    public string? Email { get; set; }
    // ris.patients fields
    public string? HealthNumber { get; set; }
    public string? EmergencyContact { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string? Notes { get; set; }
}

public class UpdateRisReportRequest
{
    public string? ReportText { get; set; }
    public string? Notes { get; set; }
    public string? Status { get; set; }
    public string? ReportType { get; set; }
    public bool? RequiresCorrection { get; set; }
    public string? CustomField1 { get; set; }
    public string? CustomField2 { get; set; }
    public string? CustomField3 { get; set; }
}

public class UpdateSeriesRequest
{
    public string? Modality { get; set; }
    public string? Description { get; set; }
}

public class CreateRisReportRequest
{
    public long ProcedureId { get; set; }
    public string ReportType { get; set; } = string.Empty;
    public string? Status { get; set; }
    public string? ReportText { get; set; }
    public string? ReportFormat { get; set; } = "text";
    public string? Notes { get; set; }
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum SyncTarget
{
    Pacs,
    Ris,
    Both
}

public class SyncFieldRequest
{
    public string FieldName { get; set; } = string.Empty;
    public string? Value { get; set; }
    public SyncTarget Target { get; set; }
}

public class MergeOrdersRequest
{
    public long TargetOrderId { get; set; }
    public long SourceOrderId { get; set; }
    public Dictionary<string, string?> FieldOverrides { get; set; } = new();
}

public class MergeProceduresRequest
{
    public long TargetProcedureId { get; set; }
    public long SourceProcedureId { get; set; }
    public bool MoveReports { get; set; } = true;
    public Dictionary<string, string?> FieldOverrides { get; set; } = new();
}

public class CreateStandardReportRequest
{
    public string ShortReportName { get; set; } = string.Empty;
    public string ReportText { get; set; } = string.Empty;
    public string? CreatedBy { get; set; }
}

public class UpdateStandardReportRequest
{
    public string ShortReportName { get; set; } = string.Empty;
    public string ReportText { get; set; } = string.Empty;
}
