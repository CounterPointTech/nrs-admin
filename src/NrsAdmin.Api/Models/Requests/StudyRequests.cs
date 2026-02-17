using FluentValidation;

namespace NrsAdmin.Api.Models.Requests;

public class StudySearchRequest
{
    public string? PatientName { get; set; }
    public string? PatientId { get; set; }
    public string? Accession { get; set; }
    public string? Modality { get; set; }
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public int? FacilityId { get; set; }
    public int? Status { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string? SortBy { get; set; }
    public bool SortDesc { get; set; } = true;
}

public class UpdateStudyRequest
{
    public int? Status { get; set; }
    public string? Comments { get; set; }
    public int? Priority { get; set; }
    public string? Custom1 { get; set; }
    public string? Custom2 { get; set; }
    public string? Custom3 { get; set; }
    public string? Custom4 { get; set; }
    public string? Custom5 { get; set; }
    public string? Custom6 { get; set; }
}

public class UpdateStudyRequestValidator : AbstractValidator<UpdateStudyRequest>
{
    public UpdateStudyRequestValidator()
    {
        RuleFor(x => x.Status)
            .InclusiveBetween(0, 7)
            .When(x => x.Status.HasValue)
            .WithMessage("Status must be between 0 and 7.");

        RuleFor(x => x.Priority)
            .InclusiveBetween(0, 7)
            .When(x => x.Priority.HasValue)
            .WithMessage("Priority must be between 0 and 7.");

        RuleFor(x => x.Comments).MaximumLength(4000);
        RuleFor(x => x.Custom1).MaximumLength(500);
        RuleFor(x => x.Custom2).MaximumLength(500);
        RuleFor(x => x.Custom3).MaximumLength(500);
        RuleFor(x => x.Custom4).MaximumLength(500);
        RuleFor(x => x.Custom5).MaximumLength(500);
        RuleFor(x => x.Custom6).MaximumLength(500);
    }
}

public class BulkUpdateStatusRequest
{
    public long[] StudyIds { get; set; } = [];
    public int Status { get; set; }
}

public class BulkUpdateStatusRequestValidator : AbstractValidator<BulkUpdateStatusRequest>
{
    public BulkUpdateStatusRequestValidator()
    {
        RuleFor(x => x.StudyIds)
            .NotEmpty()
            .WithMessage("At least one study ID is required.")
            .Must(ids => ids.Length <= 500)
            .WithMessage("Cannot update more than 500 studies at once.");

        RuleFor(x => x.Status)
            .InclusiveBetween(0, 7)
            .WithMessage("Status must be between 0 and 7.");
    }
}
