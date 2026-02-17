namespace NrsAdmin.Api.Models.Domain;

public class Setting
{
    public int SettingId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Value { get; set; }
    public DateTime CreatedOnDate { get; set; }
    public DateTime LastUpdateDate { get; set; }
    public bool UsingDefault { get; set; }
}

public class SiteSetting
{
    public int SettingId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Value { get; set; }
    public DateTime CreatedOnDate { get; set; }
    public DateTime LastUpdateDate { get; set; }
}
