namespace NrsAdmin.Api.Models.Domain;

public class Hl7FieldMapping
{
    public long MappingId { get; set; }
    public string MessageType { get; set; } = string.Empty;
    public string? EventType { get; set; }
    public string ParameterName { get; set; } = string.Empty;
    public string SegmentName { get; set; } = string.Empty;
    public int? Field { get; set; }
    public int? Component { get; set; }
    public int? SubComponent { get; set; }
    public string? LocationId { get; set; }
    public string? InboundTransform { get; set; }
    public string? OutboundTransform { get; set; }
    public string? InboundTransformParameter { get; set; }
    public string? OutboundTransformParameter { get; set; }
    public int ProductId { get; set; } = 1;
}
