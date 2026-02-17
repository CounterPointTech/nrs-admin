using FluentValidation;
using NrsAdmin.Api.Models.Requests;

namespace NrsAdmin.Api.Validators;

public class TestConnectionRequestValidator : AbstractValidator<TestConnectionRequest>
{
    public TestConnectionRequestValidator()
    {
        RuleFor(x => x.Host).NotEmpty().WithMessage("Host is required.");
        RuleFor(x => x.Port).InclusiveBetween(1, 65535).WithMessage("Port must be between 1 and 65535.");
        RuleFor(x => x.Database).NotEmpty().WithMessage("Database name is required.");
        RuleFor(x => x.Username).NotEmpty().WithMessage("Username is required.");
        RuleFor(x => x.Timeout).GreaterThan(0).WithMessage("Timeout must be greater than 0.");
    }
}

public class TestPathRequestValidator : AbstractValidator<TestPathRequest>
{
    public TestPathRequestValidator()
    {
        RuleFor(x => x.Path).NotEmpty().WithMessage("Path is required.");
    }
}
