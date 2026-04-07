namespace NrsAdmin.Api.Models.Responses;

public class UnifiedSettingResponse
{
    public string Name { get; set; } = string.Empty;
    public string? Value { get; set; }
    public string Source { get; set; } = string.Empty;
    public string SourceLabel { get; set; } = string.Empty;
    public bool? UsingDefault { get; set; }
    public DateTime? LastUpdateDate { get; set; }
    public DateTime? CreatedOnDate { get; set; }
}

public class SettingsOverviewResponse
{
    public int Total { get; set; }
    public List<SourceCount> Sources { get; set; } = [];
}

public class SourceCount
{
    public string Source { get; set; } = string.Empty;
    public string SourceLabel { get; set; } = string.Empty;
    public int Count { get; set; }
}
