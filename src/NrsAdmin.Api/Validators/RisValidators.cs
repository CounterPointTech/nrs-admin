using FluentValidation;
using NrsAdmin.Api.Models.Requests;

namespace NrsAdmin.Api.Validators;

public class UpdateRisOrderRequestValidator : AbstractValidator<UpdateRisOrderRequest>
{
    public UpdateRisOrderRequestValidator()
    {
        RuleFor(x => x.Description).MaximumLength(4000);
        RuleFor(x => x.Notes).MaximumLength(4000);
        RuleFor(x => x.PatientComplaint).MaximumLength(4000);
        RuleFor(x => x.PhysicianReason).MaximumLength(4000);
        RuleFor(x => x.CustomField1).MaximumLength(500);
        RuleFor(x => x.CustomField2).MaximumLength(500);
        RuleFor(x => x.CustomField3).MaximumLength(500);
        RuleFor(x => x.CustomField4).MaximumLength(500);
    }
}

public class UpdateRisOrderProcedureRequestValidator : AbstractValidator<UpdateRisOrderProcedureRequest>
{
    public UpdateRisOrderProcedureRequestValidator()
    {
        RuleFor(x => x.Notes).MaximumLength(4000);
        RuleFor(x => x.SchedulerNotes).MaximumLength(4000);
        RuleFor(x => x.CustomField1).MaximumLength(500);
        RuleFor(x => x.CustomField2).MaximumLength(500);
        RuleFor(x => x.CustomField3).MaximumLength(500);
    }
}

public class LinkStudyRequestValidator : AbstractValidator<LinkStudyRequest>
{
    public LinkStudyRequestValidator()
    {
        RuleFor(x => x.OrderId)
            .GreaterThan(0)
            .WithMessage("A valid order ID is required.");
    }
}

public class PatientMergeRequestValidator : AbstractValidator<PatientMergeRequest>
{
    public PatientMergeRequestValidator()
    {
        RuleFor(x => x.TargetPatientId)
            .NotEmpty().WithMessage("Target patient ID is required.");

        RuleFor(x => x.TargetSiteCode)
            .NotEmpty().WithMessage("Target site code is required.");

        RuleFor(x => x.SourcePatientId)
            .NotEmpty().WithMessage("Source patient ID is required.");

        RuleFor(x => x.SourceSiteCode)
            .NotEmpty().WithMessage("Source site code is required.");

        RuleFor(x => x)
            .Must(x => !(x.TargetPatientId == x.SourcePatientId && x.TargetSiteCode == x.SourceSiteCode))
            .WithMessage("Target and source patient cannot be the same.");
    }
}

public class UpdateRisPatientDetailsRequestValidator : AbstractValidator<UpdateRisPatientDetailsRequest>
{
    public UpdateRisPatientDetailsRequestValidator()
    {
        RuleFor(x => x.Address1).MaximumLength(500);
        RuleFor(x => x.Address2).MaximumLength(500);
        RuleFor(x => x.City).MaximumLength(200);
        RuleFor(x => x.State).MaximumLength(50);
        RuleFor(x => x.Zip).MaximumLength(20);
        RuleFor(x => x.HomePhone).MaximumLength(50);
        RuleFor(x => x.WorkPhone).MaximumLength(50);
        RuleFor(x => x.MobilePhone).MaximumLength(50);
        RuleFor(x => x.Email).MaximumLength(200);
        RuleFor(x => x.HealthNumber).MaximumLength(100);
        RuleFor(x => x.EmergencyContact).MaximumLength(200);
        RuleFor(x => x.EmergencyContactPhone).MaximumLength(50);
        RuleFor(x => x.Notes).MaximumLength(4000);
    }
}

public class UpdateSeriesRequestValidator : AbstractValidator<UpdateSeriesRequest>
{
    public UpdateSeriesRequestValidator()
    {
        RuleFor(x => x.Modality).MaximumLength(16);
        RuleFor(x => x.Description).MaximumLength(500);
    }
}

public class UpdateRisReportRequestValidator : AbstractValidator<UpdateRisReportRequest>
{
    public UpdateRisReportRequestValidator()
    {
        RuleFor(x => x.ReportText).MaximumLength(65535);
        RuleFor(x => x.Notes).MaximumLength(4000);
        RuleFor(x => x.Status).MaximumLength(100);
        RuleFor(x => x.ReportType).MaximumLength(100);
        RuleFor(x => x.CustomField1).MaximumLength(500);
        RuleFor(x => x.CustomField2).MaximumLength(500);
        RuleFor(x => x.CustomField3).MaximumLength(500);
    }
}

public class CreateRisReportRequestValidator : AbstractValidator<CreateRisReportRequest>
{
    public CreateRisReportRequestValidator()
    {
        RuleFor(x => x.ProcedureId).GreaterThan(0).WithMessage("Procedure ID is required.");
        RuleFor(x => x.ReportType).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Status).MaximumLength(100);
        RuleFor(x => x.ReportText).MaximumLength(65535);
        RuleFor(x => x.ReportFormat).MaximumLength(50);
        RuleFor(x => x.Notes).MaximumLength(4000);
    }
}

public class SyncFieldRequestValidator : AbstractValidator<SyncFieldRequest>
{
    private static readonly HashSet<string> AllowedFields = new(StringComparer.OrdinalIgnoreCase)
    {
        "accession", "firstName", "lastName", "middleName", "gender", "dateOfBirth", "patientId"
    };

    public SyncFieldRequestValidator()
    {
        RuleFor(x => x.FieldName)
            .NotEmpty().WithMessage("Field name is required.")
            .Must(f => AllowedFields.Contains(f))
            .WithMessage($"Field must be one of: {string.Join(", ", AllowedFields)}");

        RuleFor(x => x.Value).MaximumLength(500);

        RuleFor(x => x.Target).IsInEnum().WithMessage("Target must be Pacs, Ris, or Both.");
    }
}
