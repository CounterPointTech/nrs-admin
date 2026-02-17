using NrsAdmin.Api.Models.Domain;

namespace NrsAdmin.Api.Models.Requests;

public class UpdateMappingRequest
{
    public List<MappingEntry> Entries { get; set; } = [];
}

public class UpdateMappingRawRequest
{
    public string Content { get; set; } = string.Empty;
}
