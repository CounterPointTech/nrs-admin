namespace NrsAdmin.Api.Models.Domain;

public class Hl7Location
{
    public int LocationId { get; set; }
    public string Address { get; set; } = string.Empty;
    public int? Port { get; set; }
    public bool Enabled { get; set; } = true;
    public string? CultureCode { get; set; }
    public int ProductId { get; set; } = 1;
}

public class Hl7LocationOption
{
    public int LocationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Value { get; set; }
    public int ProductId { get; set; } = 1;
}
