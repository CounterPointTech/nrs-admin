namespace NrsAdmin.Api.Models.Domain;

public class Hl7ProcedureSearchResult
{
    public long ProcedureId { get; set; }
    public string AccessionNumber { get; set; } = string.Empty;
    public string PatientId { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public DateTime ProcedureDate { get; set; }
    public string ProcedureName { get; set; } = string.Empty;
    public string Modality { get; set; } = string.Empty;
    public string Facility { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string ResendStatus { get; set; } = "Not Sent";
}

public class Hl7Physician
{
    public long PhysicianId { get; set; }
    public string PhysicianName { get; set; } = string.Empty;
}

public class Hl7ResendStatusItem
{
    public long ProcedureId { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime? LastUpdated { get; set; }
}

/// <summary>
/// Snapshot of all procedure data needed to stage a DFT^P03 message in public.dft_stage.
/// Mirrors the column set produced by the WPF tool's StageProcedureForResend() query.
/// Mirth middleware reads this table to build and transmit the actual HL7 message.
/// </summary>
public class DftStageRecord
{
    public string SendingApp { get; set; } = "NOVARIS";
    public string ReceivingApp { get; set; } = "MIRTH";
    public string MsgCtrlId { get; set; } = string.Empty;
    public DateTime CurrentDt { get; set; }
    public string MessageType { get; set; } = "DFT^P03";
    public string ProcessingId { get; set; } = "P";
    public string Version { get; set; } = "2.3";
    public string EventTypeCode { get; set; } = "P03";

    public long PatientPersonId { get; set; }
    public string? PatientMrn { get; set; }
    public string? SiteCode { get; set; }
    public string? PatientLastName { get; set; }
    public string? PatientFirstName { get; set; }
    public string? PatientMiddleInitial { get; set; }
    public DateTime? PatientBirthDate { get; set; }
    public string? PatientGender { get; set; }
    public string? PatientAddress1 { get; set; }
    public string? PatientAddress2 { get; set; }
    public string? PatientCity { get; set; }
    public string? PatientState { get; set; }
    public string? PatientZip { get; set; }
    public string? PatientHomePhone { get; set; }
    public string? PatientWorkPhone { get; set; }
    public string? PatientEmail { get; set; }

    public long OrderId { get; set; }
    public string? PatientComplaint { get; set; }
    public string? PhysicianReason { get; set; }

    public long? IcdCodeId1 { get; set; }
    public string? IcdCode1 { get; set; }
    public string? IcdCodeDescription1 { get; set; }
    public string? IcdCodeVersion1 { get; set; }
    public long? IcdCodeId2 { get; set; }
    public string? IcdCode2 { get; set; }
    public string? IcdCodeDescription2 { get; set; }
    public string? IcdCodeVersion2 { get; set; }
    public long? IcdCodeId3 { get; set; }
    public string? IcdCode3 { get; set; }
    public string? IcdCodeDescription3 { get; set; }
    public string? IcdCodeVersion3 { get; set; }

    public long ProcedureId { get; set; }
    public string? AccessionNumber { get; set; }
    public string PatientClass { get; set; } = "O";
    public string? PatientLocation { get; set; }
    public string TranType { get; set; } = "CG";
    public string CodingMethod { get; set; } = "CPT";
    public long ModalityId { get; set; }
    public string? ModalityType { get; set; }
    public string? ModalityName { get; set; }
    public string? Facility { get; set; }
    public string? ProcedureName { get; set; }
    public string? ExamStudyUid { get; set; }
    public string? ExamStatus { get; set; }
    public string? StatFlag { get; set; }
    public DateTime? ExamScheduledDateTime { get; set; }
    public DateTime? ExamEndDateTime { get; set; }

    public string? PreAuthNumber { get; set; }
    public DateTime? PreAuthDate { get; set; }

    public string? ProcedureCode1 { get; set; }
    public string? ProcedureCodeUnits1 { get; set; }
    public string? ProcedureDescription1 { get; set; }
    public string? ProcedureCode2 { get; set; }
    public string? ProcedureCodeUnits2 { get; set; }
    public string? ProcedureDescription2 { get; set; }
    public string? ProcedureCode3 { get; set; }
    public string? ProcedureCodeUnits3 { get; set; }
    public string? ProcedureDescription3 { get; set; }

    public long? PrimaryInsuranceId { get; set; }
    public string? PrimaryInsuranceInsuredCardNumber { get; set; }
    public string? PrimaryInsuranceGroupNumber { get; set; }
    public DateTime? PrimaryInsuranceEffectiveDate { get; set; }
    public string? PrimaryInsuranceRequiresPreAuth { get; set; }
    public long? PrimaryInsuranceCoId { get; set; }
    public string? PrimaryInsuranceCoName { get; set; }
    public long? PrimaryPlanId { get; set; }
    public string? PrimaryPlanName { get; set; }
    public string? PrimaryPlanAddress1 { get; set; }
    public string? PrimaryPlanAddress2 { get; set; }
    public string? PrimaryPlanCity { get; set; }
    public string? PrimaryPlanState { get; set; }
    public string? PrimaryPlanZip { get; set; }
    public string? PrimaryPlanPhone { get; set; }
    public string? PrimaryPlanFax { get; set; }
    public string? PrimaryPlanRequiresReferral { get; set; }
    public string? PrimaryPlanIsActive { get; set; }

    public long? SecondaryInsuranceId { get; set; }
    public string? SecondaryInsuranceInsuredCardNumber { get; set; }
    public string? SecondaryInsuranceGroupNumber { get; set; }
    public DateTime? SecondaryInsuranceEffectiveDate { get; set; }
    public string? SecondaryInsuranceRequiresPreAuth { get; set; }
    public long? SecondaryInsuranceCoId { get; set; }
    public string? SecondaryInsuranceCoName { get; set; }
    public long? SecondaryPlanId { get; set; }
    public string? SecondaryPlanName { get; set; }
    public string? SecondaryPlanAddress1 { get; set; }
    public string? SecondaryPlanAddress2 { get; set; }
    public string? SecondaryPlanCity { get; set; }
    public string? SecondaryPlanState { get; set; }
    public string? SecondaryPlanZip { get; set; }
    public string? SecondaryPlanPhone { get; set; }
    public string? SecondaryPlanFax { get; set; }
    public string? SecondaryPlanRequiresReferral { get; set; }
    public string? SecondaryPlanIsActive { get; set; }

    public long? TertiaryInsuranceId { get; set; }
    public string? TertiaryInsuranceInsuredCardNumber { get; set; }
    public string? TertiaryInsuranceGroupNumber { get; set; }
    public DateTime? TertiaryInsuranceEffectiveDate { get; set; }
    public string? TertiaryInsuranceRequiresPreAuth { get; set; }
    public long? TertiaryInsuranceCoId { get; set; }
    public string? TertiaryInsuranceCoName { get; set; }
    public long? TertiaryPlanId { get; set; }
    public string? TertiaryPlanName { get; set; }
    public string? TertiaryPlanAddress1 { get; set; }
    public string? TertiaryPlanAddress2 { get; set; }
    public string? TertiaryPlanCity { get; set; }
    public string? TertiaryPlanState { get; set; }
    public string? TertiaryPlanZip { get; set; }
    public string? TertiaryPlanPhone { get; set; }
    public string? TertiaryPlanFax { get; set; }
    public string? TertiaryPlanRequiresReferral { get; set; }
    public string? TertiaryPlanIsActive { get; set; }

    public long? ReferringPhysicianId { get; set; }
    public string? ReferringPhysicianNpi { get; set; }
    public string? ReferringPhysicianEin { get; set; }
    public string? ReferringPhysicianSpecialty { get; set; }
    public string? ReferringPhysicianLastName { get; set; }
    public string? ReferringPhysicianFirstName { get; set; }
    public string? ReferringPhysicianMiddleInitial { get; set; }
    public string? ReferringPhysicianAddress1 { get; set; }
    public string? ReferringPhysicianAddress2 { get; set; }
    public string? ReferringPhysicianCity { get; set; }
    public string? ReferringPhysicianState { get; set; }
    public string? ReferringPhysicianZip { get; set; }
    public string? ReferringPhysicianHomePhone { get; set; }
    public string? ReferringPhysicianWorkPhone { get; set; }
    public string? ReferringPhysicianEmail { get; set; }
    public string? ReferringPhysicianFax { get; set; }
}
