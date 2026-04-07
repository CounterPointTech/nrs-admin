using FluentValidation;
using NrsAdmin.Api.Models.Requests;

namespace NrsAdmin.Api.Validators;

public class SaveReportTemplateRequestValidator : AbstractValidator<SaveReportTemplateRequest>
{
    public SaveReportTemplateRequestValidator()
    {
        RuleFor(x => x.Content)
            .NotEmpty().WithMessage("Template content is required.");
    }
}

public class CreateReportTemplateRequestValidator : AbstractValidator<CreateReportTemplateRequest>
{
    public CreateReportTemplateRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Template name is required.")
            .MaximumLength(255).WithMessage("Template name cannot exceed 255 characters.")
            .Must(BeValidFileName).WithMessage("Template name contains invalid characters. Use only letters, numbers, hyphens, underscores, spaces, and periods.")
            .Must(HaveHtmExtension).WithMessage("Template name must end with .htm");

        RuleFor(x => x.Content)
            .NotEmpty().WithMessage("Template content is required.");
    }

    private static bool BeValidFileName(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return false;
        // Allow letters, numbers, hyphens, underscores, spaces, periods
        return name.All(c => char.IsLetterOrDigit(c) || c == '-' || c == '_' || c == ' ' || c == '.');
    }

    private static bool HaveHtmExtension(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return false;
        return name.EndsWith(".htm", StringComparison.OrdinalIgnoreCase);
    }
}

public class DuplicateReportTemplateRequestValidator : AbstractValidator<DuplicateReportTemplateRequest>
{
    public DuplicateReportTemplateRequestValidator()
    {
        RuleFor(x => x.NewName)
            .NotEmpty().WithMessage("New template name is required.")
            .MaximumLength(255).WithMessage("Template name cannot exceed 255 characters.")
            .Must(BeValidFileName).WithMessage("Template name contains invalid characters. Use only letters, numbers, hyphens, underscores, spaces, and periods.")
            .Must(HaveHtmExtension).WithMessage("Template name must end with .htm");
    }

    private static bool BeValidFileName(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return false;
        return name.All(c => char.IsLetterOrDigit(c) || c == '-' || c == '_' || c == ' ' || c == '.');
    }

    private static bool HaveHtmExtension(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return false;
        return name.EndsWith(".htm", StringComparison.OrdinalIgnoreCase);
    }
}

public class RenderPreviewRequestValidator : AbstractValidator<RenderPreviewRequest>
{
    public RenderPreviewRequestValidator()
    {
        RuleFor(x => x.Content)
            .NotEmpty().WithMessage("Template content is required for preview.");
    }
}
