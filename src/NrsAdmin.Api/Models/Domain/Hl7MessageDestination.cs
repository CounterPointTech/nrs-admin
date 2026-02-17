namespace NrsAdmin.Api.Models.Domain;

public class Hl7MessageDestination
{
    public int DestinationId { get; set; }
    public string Address { get; set; } = string.Empty;
    public int Port { get; set; }
    public string Application { get; set; } = string.Empty;
    public string Facility { get; set; } = string.Empty;
    public string MessageType { get; set; } = string.Empty;
    public string? EventType { get; set; }
    public bool Enabled { get; set; }
    public bool? Synchronous { get; set; }
    public string? CultureCode { get; set; }
    public int ProductId { get; set; } = 1;
}

public class Hl7DestinationOption
{
    public int DestinationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Value { get; set; }
    public int ProductId { get; set; } = 1;
}

public class Hl7DistributionRule
{
    public int Hl7DistributionRuleId { get; set; }
    public int DestinationId { get; set; }
    public string Field { get; set; } = string.Empty;
    public string FieldValue { get; set; } = string.Empty;
    public string? MessageType { get; set; }
    public int ProductId { get; set; } = 1;
}
