using FluentValidation;
using NrsAdmin.Api.Models.Requests;

namespace NrsAdmin.Api.Validators;

// ============== Location Validators ==============
public class CreateHl7LocationRequestValidator : AbstractValidator<CreateHl7LocationRequest>
{
    public CreateHl7LocationRequestValidator()
    {
        RuleFor(x => x.Address)
            .NotEmpty().WithMessage("Address is required.")
            .MaximumLength(255);

        RuleFor(x => x.Port)
            .InclusiveBetween(1, 65535).WithMessage("Port must be between 1 and 65535.")
            .When(x => x.Port.HasValue);

        RuleFor(x => x.CultureCode)
            .MaximumLength(10);
    }
}

public class UpdateHl7LocationRequestValidator : AbstractValidator<UpdateHl7LocationRequest>
{
    public UpdateHl7LocationRequestValidator()
    {
        RuleFor(x => x.Address)
            .NotEmpty().WithMessage("Address is required.")
            .MaximumLength(255);

        RuleFor(x => x.Port)
            .InclusiveBetween(1, 65535).WithMessage("Port must be between 1 and 65535.")
            .When(x => x.Port.HasValue);

        RuleFor(x => x.CultureCode)
            .MaximumLength(10);
    }
}

public class SaveHl7LocationOptionRequestValidator : AbstractValidator<SaveHl7LocationOptionRequest>
{
    public SaveHl7LocationOptionRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Option name is required.")
            .MaximumLength(255);

        RuleFor(x => x.Value)
            .MaximumLength(1000);
    }
}

// ============== Destination Validators ==============
public class CreateHl7DestinationRequestValidator : AbstractValidator<CreateHl7DestinationRequest>
{
    public CreateHl7DestinationRequestValidator()
    {
        RuleFor(x => x.Address)
            .NotEmpty().WithMessage("Address is required.")
            .MaximumLength(255);

        RuleFor(x => x.Port)
            .InclusiveBetween(1, 65535).WithMessage("Port must be between 1 and 65535.");

        RuleFor(x => x.Application)
            .NotEmpty().WithMessage("Application is required.")
            .MaximumLength(255);

        RuleFor(x => x.Facility)
            .NotEmpty().WithMessage("Facility is required.")
            .MaximumLength(255);

        RuleFor(x => x.MessageType)
            .NotEmpty().WithMessage("Message type is required.")
            .MaximumLength(10);

        RuleFor(x => x.EventType)
            .MaximumLength(10);

        RuleFor(x => x.CultureCode)
            .MaximumLength(10);
    }
}

public class UpdateHl7DestinationRequestValidator : AbstractValidator<UpdateHl7DestinationRequest>
{
    public UpdateHl7DestinationRequestValidator()
    {
        RuleFor(x => x.Address)
            .NotEmpty().WithMessage("Address is required.")
            .MaximumLength(255);

        RuleFor(x => x.Port)
            .InclusiveBetween(1, 65535).WithMessage("Port must be between 1 and 65535.");

        RuleFor(x => x.Application)
            .NotEmpty().WithMessage("Application is required.")
            .MaximumLength(255);

        RuleFor(x => x.Facility)
            .NotEmpty().WithMessage("Facility is required.")
            .MaximumLength(255);

        RuleFor(x => x.MessageType)
            .NotEmpty().WithMessage("Message type is required.")
            .MaximumLength(10);

        RuleFor(x => x.EventType)
            .MaximumLength(10);

        RuleFor(x => x.CultureCode)
            .MaximumLength(10);
    }
}

// ============== Distribution Rule Validators ==============
public class CreateHl7DistributionRuleRequestValidator : AbstractValidator<CreateHl7DistributionRuleRequest>
{
    public CreateHl7DistributionRuleRequestValidator()
    {
        RuleFor(x => x.DestinationId)
            .GreaterThan(0).WithMessage("Destination is required.");

        RuleFor(x => x.Field)
            .NotEmpty().WithMessage("Field is required.")
            .MaximumLength(255);

        RuleFor(x => x.FieldValue)
            .NotEmpty().WithMessage("Field value is required.")
            .MaximumLength(255);

        RuleFor(x => x.MessageType)
            .MaximumLength(10);
    }
}

public class UpdateHl7DistributionRuleRequestValidator : AbstractValidator<UpdateHl7DistributionRuleRequest>
{
    public UpdateHl7DistributionRuleRequestValidator()
    {
        RuleFor(x => x.DestinationId)
            .GreaterThan(0).WithMessage("Destination is required.");

        RuleFor(x => x.Field)
            .NotEmpty().WithMessage("Field is required.")
            .MaximumLength(255);

        RuleFor(x => x.FieldValue)
            .NotEmpty().WithMessage("Field value is required.")
            .MaximumLength(255);

        RuleFor(x => x.MessageType)
            .MaximumLength(10);
    }
}

// ============== Field Mapping Validators ==============
public class CreateHl7FieldMappingRequestValidator : AbstractValidator<CreateHl7FieldMappingRequest>
{
    public CreateHl7FieldMappingRequestValidator()
    {
        RuleFor(x => x.MessageType)
            .NotEmpty().WithMessage("Message type is required.")
            .MaximumLength(10);

        RuleFor(x => x.EventType)
            .MaximumLength(10);

        RuleFor(x => x.ParameterName)
            .NotEmpty().WithMessage("Parameter name is required.")
            .MaximumLength(255);

        RuleFor(x => x.SegmentName)
            .NotEmpty().WithMessage("Segment name is required.")
            .MaximumLength(10);

        RuleFor(x => x.Field)
            .GreaterThanOrEqualTo(0).When(x => x.Field.HasValue);

        RuleFor(x => x.Component)
            .GreaterThanOrEqualTo(0).When(x => x.Component.HasValue);

        RuleFor(x => x.SubComponent)
            .GreaterThanOrEqualTo(0).When(x => x.SubComponent.HasValue);

        RuleFor(x => x.LocationId)
            .MaximumLength(255);

        RuleFor(x => x.InboundTransform)
            .MaximumLength(255);

        RuleFor(x => x.OutboundTransform)
            .MaximumLength(255);

        RuleFor(x => x.InboundTransformParameter)
            .MaximumLength(1000);

        RuleFor(x => x.OutboundTransformParameter)
            .MaximumLength(1000);
    }
}

public class UpdateHl7FieldMappingRequestValidator : AbstractValidator<UpdateHl7FieldMappingRequest>
{
    public UpdateHl7FieldMappingRequestValidator()
    {
        RuleFor(x => x.MessageType)
            .NotEmpty().WithMessage("Message type is required.")
            .MaximumLength(10);

        RuleFor(x => x.EventType)
            .MaximumLength(10);

        RuleFor(x => x.ParameterName)
            .NotEmpty().WithMessage("Parameter name is required.")
            .MaximumLength(255);

        RuleFor(x => x.SegmentName)
            .NotEmpty().WithMessage("Segment name is required.")
            .MaximumLength(10);

        RuleFor(x => x.Field)
            .GreaterThanOrEqualTo(0).When(x => x.Field.HasValue);

        RuleFor(x => x.Component)
            .GreaterThanOrEqualTo(0).When(x => x.Component.HasValue);

        RuleFor(x => x.SubComponent)
            .GreaterThanOrEqualTo(0).When(x => x.SubComponent.HasValue);

        RuleFor(x => x.LocationId)
            .MaximumLength(255);

        RuleFor(x => x.InboundTransform)
            .MaximumLength(255);

        RuleFor(x => x.OutboundTransform)
            .MaximumLength(255);

        RuleFor(x => x.InboundTransformParameter)
            .MaximumLength(1000);

        RuleFor(x => x.OutboundTransformParameter)
            .MaximumLength(1000);
    }
}

// ============== Forwarding Validators ==============
public class CreateHl7ForwardingRequestValidator : AbstractValidator<CreateHl7ForwardingRequest>
{
    public CreateHl7ForwardingRequestValidator()
    {
        RuleFor(x => x.Address)
            .NotEmpty().WithMessage("Address is required.")
            .MaximumLength(255);

        RuleFor(x => x.Port)
            .InclusiveBetween(1, 65535).WithMessage("Port must be between 1 and 65535.");

        RuleFor(x => x.Message)
            .MaximumLength(10);

        RuleFor(x => x.Event)
            .MaximumLength(10);

        RuleFor(x => x.ExternalKey)
            .MaximumLength(255);
    }
}

public class UpdateHl7ForwardingRequestValidator : AbstractValidator<UpdateHl7ForwardingRequest>
{
    public UpdateHl7ForwardingRequestValidator()
    {
        RuleFor(x => x.Address)
            .NotEmpty().WithMessage("Address is required.")
            .MaximumLength(255);

        RuleFor(x => x.Port)
            .InclusiveBetween(1, 65535).WithMessage("Port must be between 1 and 65535.");

        RuleFor(x => x.Message)
            .MaximumLength(10);

        RuleFor(x => x.Event)
            .MaximumLength(10);

        RuleFor(x => x.ExternalKey)
            .MaximumLength(255);
    }
}
