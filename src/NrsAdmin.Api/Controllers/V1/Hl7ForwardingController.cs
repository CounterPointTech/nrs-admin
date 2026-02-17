using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/hl7/forwarding")]
[Authorize]
public class Hl7ForwardingController : ControllerBase
{
    private readonly Hl7Repository _repository;
    private readonly ILogger<Hl7ForwardingController> _logger;

    public Hl7ForwardingController(Hl7Repository repository, ILogger<Hl7ForwardingController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Hl7MessageForwarding>>>> GetAll()
    {
        var rules = await _repository.GetForwardingRulesAsync();
        return Ok(ApiResponse<List<Hl7MessageForwarding>>.Ok(rules));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<Hl7MessageForwarding>>> GetById(int id)
    {
        var rule = await _repository.GetForwardingByIdAsync(id);
        if (rule is null)
            return NotFound(ApiResponse<Hl7MessageForwarding>.Fail($"Forwarding rule {id} not found."));

        return Ok(ApiResponse<Hl7MessageForwarding>.Ok(rule));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Hl7MessageForwarding>>> Create([FromBody] CreateHl7ForwardingRequest request)
    {
        var created = await _repository.CreateForwardingAsync(
            request.Address, request.Port, request.Message, request.Event,
            request.ExternalKey, request.SendPostProcessing);

        _logger.LogInformation("HL7 forwarding rule created: {ForwardingId} ({Address}:{Port})",
            created.ForwardingId, created.Address, created.Port);
        return CreatedAtAction(nameof(GetById), new { id = created.ForwardingId },
            ApiResponse<Hl7MessageForwarding>.Ok(created, "Forwarding rule created successfully."));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<Hl7MessageForwarding>>> Update(int id, [FromBody] UpdateHl7ForwardingRequest request)
    {
        var updated = await _repository.UpdateForwardingAsync(id,
            request.Address, request.Port, request.Message, request.Event,
            request.ExternalKey, request.SendPostProcessing);

        if (updated is null)
            return NotFound(ApiResponse<Hl7MessageForwarding>.Fail($"Forwarding rule {id} not found."));

        _logger.LogInformation("HL7 forwarding rule updated: {ForwardingId}", id);
        return Ok(ApiResponse<Hl7MessageForwarding>.Ok(updated, "Forwarding rule updated successfully."));
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse>> Delete(int id)
    {
        var deleted = await _repository.DeleteForwardingAsync(id);
        if (!deleted)
            return NotFound(ApiResponse.Fail($"Forwarding rule {id} not found."));

        _logger.LogInformation("HL7 forwarding rule deleted: {ForwardingId}", id);
        return Ok(ApiResponse.Ok("Forwarding rule deleted successfully."));
    }
}
