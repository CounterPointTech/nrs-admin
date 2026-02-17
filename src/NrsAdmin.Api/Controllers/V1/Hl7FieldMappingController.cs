using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/hl7/field-mapping")]
[Authorize]
public class Hl7FieldMappingController : ControllerBase
{
    private readonly Hl7Repository _repository;
    private readonly ILogger<Hl7FieldMappingController> _logger;

    public Hl7FieldMappingController(Hl7Repository repository, ILogger<Hl7FieldMappingController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Hl7FieldMapping>>>> GetAll(
        [FromQuery] string? messageType = null,
        [FromQuery] string? locationId = null)
    {
        var mappings = await _repository.GetFieldMappingsAsync(messageType, locationId);
        return Ok(ApiResponse<List<Hl7FieldMapping>>.Ok(mappings));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<Hl7FieldMapping>>> GetById(long id)
    {
        var mapping = await _repository.GetFieldMappingByIdAsync(id);
        if (mapping is null)
            return NotFound(ApiResponse<Hl7FieldMapping>.Fail($"Field mapping {id} not found."));

        return Ok(ApiResponse<Hl7FieldMapping>.Ok(mapping));
    }

    [HttpGet("message-types")]
    public async Task<ActionResult<ApiResponse<List<string>>>> GetMessageTypes()
    {
        var types = await _repository.GetFieldMappingMessageTypesAsync();
        return Ok(ApiResponse<List<string>>.Ok(types));
    }

    [HttpGet("locations")]
    public async Task<ActionResult<ApiResponse<List<string?>>>> GetLocations()
    {
        var locations = await _repository.GetFieldMappingLocationsAsync();
        return Ok(ApiResponse<List<string?>>.Ok(locations));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Hl7FieldMapping>>> Create([FromBody] CreateHl7FieldMappingRequest request)
    {
        var created = await _repository.CreateFieldMappingAsync(
            request.MessageType, request.EventType, request.ParameterName, request.SegmentName,
            request.Field, request.Component, request.SubComponent, request.LocationId,
            request.InboundTransform, request.OutboundTransform,
            request.InboundTransformParameter, request.OutboundTransformParameter);

        _logger.LogInformation("HL7 field mapping created: {MappingId} ({MessageType}/{ParameterName})",
            created.MappingId, created.MessageType, created.ParameterName);
        return CreatedAtAction(nameof(GetById), new { id = created.MappingId },
            ApiResponse<Hl7FieldMapping>.Ok(created, "Field mapping created successfully."));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ApiResponse<Hl7FieldMapping>>> Update(long id, [FromBody] UpdateHl7FieldMappingRequest request)
    {
        var updated = await _repository.UpdateFieldMappingAsync(id,
            request.MessageType, request.EventType, request.ParameterName, request.SegmentName,
            request.Field, request.Component, request.SubComponent, request.LocationId,
            request.InboundTransform, request.OutboundTransform,
            request.InboundTransformParameter, request.OutboundTransformParameter);

        if (updated is null)
            return NotFound(ApiResponse<Hl7FieldMapping>.Fail($"Field mapping {id} not found."));

        _logger.LogInformation("HL7 field mapping updated: {MappingId}", id);
        return Ok(ApiResponse<Hl7FieldMapping>.Ok(updated, "Field mapping updated successfully."));
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult<ApiResponse>> Delete(long id)
    {
        var deleted = await _repository.DeleteFieldMappingAsync(id);
        if (!deleted)
            return NotFound(ApiResponse.Fail($"Field mapping {id} not found."));

        _logger.LogInformation("HL7 field mapping deleted: {MappingId}", id);
        return Ok(ApiResponse.Ok("Field mapping deleted successfully."));
    }
}
