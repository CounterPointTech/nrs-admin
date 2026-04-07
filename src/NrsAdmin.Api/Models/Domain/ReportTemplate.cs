namespace NrsAdmin.Api.Models.Domain;

public class ReportTemplateInfo
{
    public string Name { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public DateTime LastModifiedUtc { get; set; }
    public List<string> UsedByFacilities { get; set; } = [];
}

public class ReportTemplateBackup
{
    public string FileName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public long SizeBytes { get; set; }
    public string OriginalTemplate { get; set; } = string.Empty;
}

public class TemplatePlaceholder
{
    public string Name { get; set; } = string.Empty;
    public string Tag { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string SampleValue { get; set; } = string.Empty;
}

public class TemplateSection
{
    public string Name { get; set; } = string.Empty;
    public string StartTag { get; set; } = string.Empty;
    public string EndTag { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}
