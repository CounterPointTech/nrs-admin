using FluentValidation;
using NrsAdmin.Api.Models.Requests;

namespace NrsAdmin.Api.Validators;

public class CreateStandardProcedureRequestValidator : AbstractValidator<CreateStandardProcedureRequest>
{
    public CreateStandardProcedureRequestValidator()
    {
        RuleFor(x => x.ProcedureName)
            .NotEmpty().WithMessage("Procedure name is required.")
            .MaximumLength(255).WithMessage("Procedure name cannot exceed 255 characters.");

        RuleFor(x => x.ModalityTypeId)
            .NotEmpty().WithMessage("Modality type is required.")
            .MaximumLength(50).WithMessage("Modality type cannot exceed 50 characters.");

        RuleFor(x => x.RequiredTime)
            .GreaterThanOrEqualTo(0).WithMessage("Required time must be zero or greater.");

        RuleFor(x => x.AnatomicalAreaId)
            .GreaterThan(0).When(x => x.AnatomicalAreaId.HasValue)
            .WithMessage("Anatomical area id must be positive when provided.");
    }
}

public class UpdateStandardProcedureRequestValidator : AbstractValidator<UpdateStandardProcedureRequest>
{
    public UpdateStandardProcedureRequestValidator()
    {
        RuleFor(x => x.ProcedureName)
            .NotEmpty().WithMessage("Procedure name is required.")
            .MaximumLength(255).WithMessage("Procedure name cannot exceed 255 characters.");

        RuleFor(x => x.ModalityTypeId)
            .NotEmpty().WithMessage("Modality type is required.")
            .MaximumLength(50).WithMessage("Modality type cannot exceed 50 characters.");

        RuleFor(x => x.RequiredTime)
            .GreaterThanOrEqualTo(0).WithMessage("Required time must be zero or greater.");

        RuleFor(x => x.AnatomicalAreaId)
            .GreaterThan(0).When(x => x.AnatomicalAreaId.HasValue)
            .WithMessage("Anatomical area id must be positive when provided.");
    }
}
