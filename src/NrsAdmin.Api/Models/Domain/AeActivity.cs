namespace NrsAdmin.Api.Models.Domain;

public class AeActivity
{
    public string AeTitle { get; set; } = string.Empty;
    public string? MatchingItems { get; set; }
    public DateTime TimeStamp { get; set; }
}
