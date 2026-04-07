namespace NrsAdmin.Api.Models.Requests;

public class SaveReportTemplateRequest
{
    public string Content { get; set; } = string.Empty;
}

public class CreateReportTemplateRequest
{
    public string Name { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

public class DuplicateReportTemplateRequest
{
    public string NewName { get; set; } = string.Empty;
}

public class RenderPreviewRequest
{
    public string Content { get; set; } = string.Empty;
}
