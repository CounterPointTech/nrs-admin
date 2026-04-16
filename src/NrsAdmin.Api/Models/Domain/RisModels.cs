namespace NrsAdmin.Api.Models.Domain;

// ============== Link Status ==============

public enum LinkMethod
{
    None,
    Accession,
    StudyUid,
    Both
}

public class StudyRisLink
{
    public LinkMethod LinkMethod { get; set; }
    public long? OrderId { get; set; }
    public string? AccessionNumber { get; set; }
    public string? StudyUid { get; set; }
}

// ============== RIS Order ==============

public class RisOrder
{
    public long OrderId { get; set; }
    public string PatientId { get; set; } = string.Empty;
    public string SiteCode { get; set; } = string.Empty;
    public string? Status { get; set; }
    public string? AccessionNumber { get; set; }
    public string? Description { get; set; }
    public string? PatientComplaint { get; set; }
    public string? PhysicianReason { get; set; }
    public string? Notes { get; set; }
    public long? ReferringPhysicianId { get; set; }
    public string? ReferringPhysicianName { get; set; }
    public string? ConsultingPhysicians { get; set; }
    public int? PatientWeight { get; set; }
    public DateTime? CreationDate { get; set; }
    public string? CustomField1 { get; set; }
    public string? CustomField2 { get; set; }
    public string? CustomField3 { get; set; }
    public string? CustomField4 { get; set; }
    public string? SiteName { get; set; }
}

// ============== RIS Order Procedure ==============

public class RisOrderProcedure
{
    public long ProcedureId { get; set; }
    public long OrderId { get; set; }
    public string? StudyUid { get; set; }
    public string? Status { get; set; }
    public string? ProcedureName { get; set; }
    public int? ModalityId { get; set; }
    public string? ModalityName { get; set; }
    public string? ModalityType { get; set; }
    public long? AssignedPhysicianId { get; set; }
    public string? AssignedPhysicianName { get; set; }
    public bool StatFlag { get; set; }
    public string? Notes { get; set; }
    public string? SchedulerNotes { get; set; }
    public string? PatientClass { get; set; }
    public string? PatientLocation { get; set; }
    public string? VisitNumber { get; set; }
    public DateTime? ProcedureDateStart { get; set; }
    public DateTime? ProcedureDateEnd { get; set; }
    public DateTime? CheckInTime { get; set; }
    public DateTime? CreationDate { get; set; }
    public DateTime? ModifiedDate { get; set; }
    public string? CustomField1 { get; set; }
    public string? CustomField2 { get; set; }
    public string? CustomField3 { get; set; }
    public List<RisProcedureStep> Steps { get; set; } = [];
}

// ============== RIS Procedure Step ==============

public class RisProcedureStep
{
    public long ProcedureId { get; set; }
    public int StepNumber { get; set; }
    public string? Status { get; set; }
    public string? Description { get; set; }
    public DateTime? CompletionDate { get; set; }
    public int? CompletedByUserId { get; set; }
    public bool IsDisabled { get; set; }
}

// ============== RIS Report ==============

public class RisReport
{
    public long ReportId { get; set; }
    public long ProcedureId { get; set; }
    public string ReportType { get; set; } = string.Empty;
    public string? Status { get; set; }
    public string? ReportText { get; set; }
    public string? ReportFormat { get; set; }
    public bool RequiresCorrection { get; set; }
    public DateTime? SignedDate { get; set; }
    public DateTime? TranscribedDate { get; set; }
    public long? SigningPhysicianId { get; set; }
    public string? SigningPhysicianName { get; set; }
    public long? ReportingPhysicianId { get; set; }
    public string? ReportingPhysicianName { get; set; }
    public DateTime? CreationDate { get; set; }
    public string? Notes { get; set; }
    public string? CustomField1 { get; set; }
    public string? CustomField2 { get; set; }
    public string? CustomField3 { get; set; }
}

// ============== Standard Reports (Precanned Text) ==============

public class StandardReport
{
    public long StandardReportId { get; set; }
    public string ShortReportName { get; set; } = string.Empty;
    public string ReportText { get; set; } = string.Empty;
    public string? CreatedBy { get; set; }
}

// ============== Patient Deletion Preview ==============

public class PatientDeletionPreview
{
    public string PatientId { get; set; } = string.Empty;
    public string SiteCode { get; set; } = string.Empty;
    public long PersonId { get; set; }
    public int OrderCount { get; set; }
    public int InsuranceReferences { get; set; }
    public int BillingAccountCount { get; set; }
    public int DocumentCount { get; set; }
    public bool CanDelete { get; set; }
    public string? BlockingReason { get; set; }
}

// ============== RIS Patient Demographics ==============

public class RisPatientDemographics
{
    public string PatientId { get; set; } = string.Empty;
    public string SiteCode { get; set; } = string.Empty;
    public long PersonId { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? MiddleInitial { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Sex { get; set; }
    public string? Address1 { get; set; }
    public string? Address2 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Zip { get; set; }
    public string? HomePhone { get; set; }
    public string? WorkPhone { get; set; }
    public string? MobilePhone { get; set; }
    public string? Email { get; set; }
    public string? HealthNumber { get; set; }
    public string? Notes { get; set; }
    public string? EmergencyContact { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string? CustomField1 { get; set; }
    public string? CustomField2 { get; set; }
    public string? CustomField3 { get; set; }
}

// ============== Patient Comparison ==============

public class DiscrepancyField
{
    public string FieldName { get; set; } = string.Empty;
    public string? PacsValue { get; set; }
    public string? RisValue { get; set; }
}

public class PatientComparison
{
    public string PacsPatientId { get; set; } = string.Empty;
    public string? PacsFirstName { get; set; }
    public string? PacsLastName { get; set; }
    public string? PacsMiddleName { get; set; }
    public string? PacsGender { get; set; }
    public DateTime? PacsBirthTime { get; set; }

    public string? RisPatientId { get; set; }
    public string? RisFirstName { get; set; }
    public string? RisLastName { get; set; }
    public string? RisMiddleInitial { get; set; }
    public string? RisSex { get; set; }
    public DateTime? RisDateOfBirth { get; set; }

    public List<DiscrepancyField> Discrepancies { get; set; } = [];
}

// ============== Order Comparison (PACS↔RIS Study Fields) ==============

public class OrderComparison
{
    public string? PacsStudyDescription { get; set; }
    public string? PacsStudyUid { get; set; }
    public string? PacsStudyDate { get; set; }
    public string? PacsModality { get; set; }
    public string? PacsFacility { get; set; }

    public string? RisDescription { get; set; }
    public string? RisStudyUid { get; set; }
    public string? RisProcedureDate { get; set; }
    public string? RisModality { get; set; }
    public string? RisFacility { get; set; }

    public List<DiscrepancyField> Discrepancies { get; set; } = [];
}

// ============== Unified Study Detail ==============

public class UnifiedStudyDetail
{
    public StudyDetail Study { get; set; } = null!;
    public StudyRisLink Link { get; set; } = new();
    public PatientComparison PatientComparison { get; set; } = new();
    public OrderComparison OrderComparison { get; set; } = new();
    public List<RisOrder> Orders { get; set; } = [];
    public List<RisOrderProcedure> Procedures { get; set; } = [];
    public List<RisReport> Reports { get; set; } = [];
    public RisPatientDemographics? RisPatient { get; set; }
}
