using FluentValidation;
using NrsAdmin.Api.Models.Requests;

namespace NrsAdmin.Api.Validators;

public class CreateCptCodeRequestValidator : AbstractValidator<CreateCptCodeRequest>
{
    public CreateCptCodeRequestValidator()
    {
        RuleFor(x => x.ServiceCode)
            .NotEmpty().WithMessage("Service code is required.")
            .MaximumLength(50).WithMessage("Service code cannot exceed 50 characters.");

        RuleFor(x => x.Description)
            .MaximumLength(500).WithMessage("Description cannot exceed 500 characters.");

        RuleFor(x => x.ModalityType)
            .MaximumLength(50).WithMessage("Modality type cannot exceed 50 characters.");

        RuleFor(x => x.RvuWork)
            .GreaterThanOrEqualTo(0).When(x => x.RvuWork.HasValue)
            .WithMessage("RVU work must be non-negative.");

        RuleFor(x => x.CustomField1)
            .MaximumLength(255);

        RuleFor(x => x.CustomField2)
            .MaximumLength(255);

        RuleFor(x => x.CustomField3)
            .MaximumLength(255);
    }
}

public class UpdateCptCodeRequestValidator : AbstractValidator<UpdateCptCodeRequest>
{
    public UpdateCptCodeRequestValidator()
    {
        RuleFor(x => x.ServiceCode)
            .NotEmpty().WithMessage("Service code is required.")
            .MaximumLength(50).WithMessage("Service code cannot exceed 50 characters.");

        RuleFor(x => x.Description)
            .MaximumLength(500).WithMessage("Description cannot exceed 500 characters.");

        RuleFor(x => x.ModalityType)
            .MaximumLength(50).WithMessage("Modality type cannot exceed 50 characters.");

        RuleFor(x => x.RvuWork)
            .GreaterThanOrEqualTo(0).When(x => x.RvuWork.HasValue)
            .WithMessage("RVU work must be non-negative.");

        RuleFor(x => x.CustomField1)
            .MaximumLength(255);

        RuleFor(x => x.CustomField2)
            .MaximumLength(255);

        RuleFor(x => x.CustomField3)
            .MaximumLength(255);
    }
}

public class CreateIcdCodeRequestValidator : AbstractValidator<CreateIcdCodeRequest>
{
    public CreateIcdCodeRequestValidator()
    {
        RuleFor(x => x.IcdCodeId)
            .NotEmpty().WithMessage("ICD code ID is required.")
            .MaximumLength(20).WithMessage("ICD code ID cannot exceed 20 characters.");

        RuleFor(x => x.Description)
            .MaximumLength(500).WithMessage("Description cannot exceed 500 characters.");

        RuleFor(x => x.IcdCodeVersion)
            .InclusiveBetween(9, 11).WithMessage("ICD version must be 9, 10, or 11.");

        RuleFor(x => x.IcdCodeDisplay)
            .NotEmpty().WithMessage("ICD display code is required.")
            .MaximumLength(20).WithMessage("ICD display code cannot exceed 20 characters.");
    }
}

public class UpdateIcdCodeRequestValidator : AbstractValidator<UpdateIcdCodeRequest>
{
    public UpdateIcdCodeRequestValidator()
    {
        RuleFor(x => x.Description)
            .MaximumLength(500).WithMessage("Description cannot exceed 500 characters.");

        RuleFor(x => x.IcdCodeVersion)
            .InclusiveBetween(9, 11).WithMessage("ICD version must be 9, 10, or 11.");

        RuleFor(x => x.IcdCodeDisplay)
            .NotEmpty().WithMessage("ICD display code is required.")
            .MaximumLength(20).WithMessage("ICD display code cannot exceed 20 characters.");
    }
}
