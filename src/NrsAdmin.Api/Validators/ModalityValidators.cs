using FluentValidation;
using NrsAdmin.Api.Models.Requests;

namespace NrsAdmin.Api.Validators;

public class CreateModalityRequestValidator : AbstractValidator<CreateModalityRequest>
{
    public CreateModalityRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(255);

        RuleFor(x => x.ModalityTypeId)
            .NotEmpty().WithMessage("Modality type is required.")
            .MaximumLength(16);

        RuleFor(x => x.AeTitle)
            .MaximumLength(16).WithMessage("AE Title cannot exceed 16 characters.")
            .Matches(@"^[A-Za-z0-9_\-. ]*$").WithMessage("AE Title contains invalid characters.")
            .When(x => !string.IsNullOrEmpty(x.AeTitle));

        RuleFor(x => x.FacilityId)
            .GreaterThan(0).WithMessage("Facility is required.");

        RuleFor(x => x.Room)
            .MaximumLength(255);

        RuleFor(x => x.Status)
            .MaximumLength(50);
    }
}

public class UpdateModalityRequestValidator : AbstractValidator<UpdateModalityRequest>
{
    public UpdateModalityRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(255);

        RuleFor(x => x.ModalityTypeId)
            .NotEmpty().WithMessage("Modality type is required.")
            .MaximumLength(16);

        RuleFor(x => x.AeTitle)
            .MaximumLength(16).WithMessage("AE Title cannot exceed 16 characters.")
            .Matches(@"^[A-Za-z0-9_\-. ]*$").WithMessage("AE Title contains invalid characters.")
            .When(x => !string.IsNullOrEmpty(x.AeTitle));

        RuleFor(x => x.FacilityId)
            .GreaterThan(0).WithMessage("Facility is required.");

        RuleFor(x => x.Room)
            .MaximumLength(255);

        RuleFor(x => x.Status)
            .MaximumLength(50);
    }
}

public class CreateModalityTypeRequestValidator : AbstractValidator<CreateModalityTypeRequest>
{
    public CreateModalityTypeRequestValidator()
    {
        RuleFor(x => x.ModalityTypeId)
            .NotEmpty().WithMessage("Modality type ID is required.")
            .MaximumLength(16)
            .Matches(@"^[A-Z0-9]+$").WithMessage("Modality type ID must be uppercase alphanumeric (DICOM standard).");

        RuleFor(x => x.Description)
            .MaximumLength(255);
    }
}
