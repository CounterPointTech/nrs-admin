namespace NrsAdmin.Api.Models.Requests;

// ============== HL7 Locations ==============
public class CreateHl7LocationRequest
{
    public string Address { get; set; } = string.Empty;
    public int? Port { get; set; }
    public bool Enabled { get; set; } = true;
    public string? CultureCode { get; set; }
}

public class UpdateHl7LocationRequest
{
    public string Address { get; set; } = string.Empty;
    public int? Port { get; set; }
    public bool Enabled { get; set; } = true;
    public string? CultureCode { get; set; }
}

// ============== HL7 Location Options ==============
public class SaveHl7LocationOptionRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Value { get; set; }
}

// ============== HL7 Message Destinations ==============
public class CreateHl7DestinationRequest
{
    public string Address { get; set; } = string.Empty;
    public int Port { get; set; }
    public string Application { get; set; } = string.Empty;
    public string Facility { get; set; } = string.Empty;
    public string MessageType { get; set; } = string.Empty;
    public string? EventType { get; set; }
    public bool Enabled { get; set; } = true;
    public bool? Synchronous { get; set; }
    public string? CultureCode { get; set; }
}

public class UpdateHl7DestinationRequest
{
    public string Address { get; set; } = string.Empty;
    public int Port { get; set; }
    public string Application { get; set; } = string.Empty;
    public string Facility { get; set; } = string.Empty;
    public string MessageType { get; set; } = string.Empty;
    public string? EventType { get; set; }
    public bool Enabled { get; set; }
    public bool? Synchronous { get; set; }
    public string? CultureCode { get; set; }
}

// ============== HL7 Distribution Rules ==============
public class CreateHl7DistributionRuleRequest
{
    public int DestinationId { get; set; }
    public string Field { get; set; } = string.Empty;
    public string FieldValue { get; set; } = string.Empty;
    public string? MessageType { get; set; }
}

public class UpdateHl7DistributionRuleRequest
{
    public int DestinationId { get; set; }
    public string Field { get; set; } = string.Empty;
    public string FieldValue { get; set; } = string.Empty;
    public string? MessageType { get; set; }
}

// ============== HL7 Field Mapping ==============
public class CreateHl7FieldMappingRequest
{
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
}

public class UpdateHl7FieldMappingRequest
{
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
}

// ============== HL7 Message Forwarding ==============
public class CreateHl7ForwardingRequest
{
    public string Address { get; set; } = string.Empty;
    public int Port { get; set; }
    public string? Message { get; set; }
    public string? Event { get; set; }
    public string? ExternalKey { get; set; }
    public bool SendPostProcessing { get; set; } = true;
}

public class UpdateHl7ForwardingRequest
{
    public string Address { get; set; } = string.Empty;
    public int Port { get; set; }
    public string? Message { get; set; }
    public string? Event { get; set; }
    public string? ExternalKey { get; set; }
    public bool SendPostProcessing { get; set; } = true;
}
