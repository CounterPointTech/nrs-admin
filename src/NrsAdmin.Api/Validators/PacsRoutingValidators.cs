using FluentValidation;
using NrsAdmin.Api.Models.Requests;

namespace NrsAdmin.Api.Validators;

public class CreatePacsDestinationRequestValidator : AbstractValidator<CreatePacsDestinationRequest>
{
    public CreatePacsDestinationRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(255);

        RuleFor(x => x.Address)
            .NotEmpty().WithMessage("Address is required.")
            .MaximumLength(255);

        RuleFor(x => x.AeTitle)
            .NotEmpty().WithMessage("AE Title is required.")
            .MaximumLength(16).WithMessage("AE Title cannot exceed 16 characters.")
            .Matches(@"^[A-Za-z0-9_\-. ]*$").WithMessage("AE Title contains invalid characters.");

        RuleFor(x => x.Port)
            .InclusiveBetween(1, 65535).WithMessage("Port must be between 1 and 65535.");

        RuleFor(x => x.NumTries)
            .GreaterThanOrEqualTo(0).WithMessage("Number of tries must be non-negative.");

        RuleFor(x => x.Frequency)
            .GreaterThanOrEqualTo(0).WithMessage("Frequency must be non-negative.");

        RuleFor(x => x.Compression)
            .GreaterThanOrEqualTo(0);

        RuleFor(x => x.TransferSyntax)
            .NotEmpty().WithMessage("Transfer syntax is required.")
            .MaximumLength(255);
    }
}

public class UpdatePacsDestinationRequestValidator : AbstractValidator<UpdatePacsDestinationRequest>
{
    public UpdatePacsDestinationRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(255);

        RuleFor(x => x.Address)
            .NotEmpty().WithMessage("Address is required.")
            .MaximumLength(255);

        RuleFor(x => x.AeTitle)
            .NotEmpty().WithMessage("AE Title is required.")
            .MaximumLength(16).WithMessage("AE Title cannot exceed 16 characters.")
            .Matches(@"^[A-Za-z0-9_\-. ]*$").WithMessage("AE Title contains invalid characters.");

        RuleFor(x => x.Port)
            .InclusiveBetween(1, 65535).WithMessage("Port must be between 1 and 65535.");

        RuleFor(x => x.NumTries)
            .GreaterThanOrEqualTo(0).WithMessage("Number of tries must be non-negative.");

        RuleFor(x => x.Frequency)
            .GreaterThanOrEqualTo(0).WithMessage("Frequency must be non-negative.");

        RuleFor(x => x.Compression)
            .GreaterThanOrEqualTo(0);

        RuleFor(x => x.TransferSyntax)
            .NotEmpty().WithMessage("Transfer syntax is required.")
            .MaximumLength(255);
    }
}

public class CreateRoutingZoneRequestValidator : AbstractValidator<CreateRoutingZoneRequest>
{
    public CreateRoutingZoneRequestValidator()
    {
        RuleFor(x => x.ZoneName)
            .NotEmpty().WithMessage("Zone name is required.")
            .MaximumLength(255);
    }
}

public class UpdateRoutingZoneRequestValidator : AbstractValidator<UpdateRoutingZoneRequest>
{
    public UpdateRoutingZoneRequestValidator()
    {
        RuleFor(x => x.ZoneName)
            .NotEmpty().WithMessage("Zone name is required.")
            .MaximumLength(255);
    }
}
