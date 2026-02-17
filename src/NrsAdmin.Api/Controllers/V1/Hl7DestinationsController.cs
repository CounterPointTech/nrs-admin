using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/hl7/destinations")]
[Authorize]
public class Hl7DestinationsController : ControllerBase
{
    private readonly Hl7Repository _repository;
    private readonly ILogger<Hl7DestinationsController> _logger;

    public Hl7DestinationsController(Hl7Repository repository, ILogger<Hl7DestinationsController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Hl7MessageDestination>>>> GetAll()
    {
        var destinations = await _repository.GetDestinationsAsync();
        return Ok(ApiResponse<List<Hl7MessageDestination>>.Ok(destinations));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<Hl7MessageDestination>>> GetById(int id)
    {
        var destination = await _repository.GetDestinationByIdAsync(id);
        if (destination is null)
            return NotFound(ApiResponse<Hl7MessageDestination>.Fail($"HL7 destination {id} not found."));

        return Ok(ApiResponse<Hl7MessageDestination>.Ok(destination));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Hl7MessageDestination>>> Create([FromBody] CreateHl7DestinationRequest request)
    {
        var created = await _repository.CreateDestinationAsync(
            request.Address, request.Port, request.Application, request.Facility,
            request.MessageType, request.EventType, request.Enabled, request.Synchronous, request.CultureCode);

        _logger.LogInformation("HL7 destination created: {DestinationId} ({Address}:{Port})", created.DestinationId, created.Address, created.Port);
        return CreatedAtAction(nameof(GetById), new { id = created.DestinationId },
            ApiResponse<Hl7MessageDestination>.Ok(created, "HL7 destination created successfully."));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<Hl7MessageDestination>>> Update(int id, [FromBody] UpdateHl7DestinationRequest request)
    {
        var updated = await _repository.UpdateDestinationAsync(id,
            request.Address, request.Port, request.Application, request.Facility,
            request.MessageType, request.EventType, request.Enabled, request.Synchronous, request.CultureCode);

        if (updated is null)
            return NotFound(ApiResponse<Hl7MessageDestination>.Fail($"HL7 destination {id} not found."));

        _logger.LogInformation("HL7 destination updated: {DestinationId}", updated.DestinationId);
        return Ok(ApiResponse<Hl7MessageDestination>.Ok(updated, "HL7 destination updated successfully."));
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse>> Delete(int id)
    {
        var deleted = await _repository.DeleteDestinationAsync(id);
        if (!deleted)
            return NotFound(ApiResponse.Fail($"HL7 destination {id} not found."));

        _logger.LogInformation("HL7 destination deleted: {DestinationId}", id);
        return Ok(ApiResponse.Ok("HL7 destination deleted successfully."));
    }

    // ============== Distribution Rules ==============

    [HttpGet("{destinationId:int}/rules")]
    public async Task<ActionResult<ApiResponse<List<Hl7DistributionRule>>>> GetRules(int destinationId)
    {
        var rules = await _repository.GetDistributionRulesAsync(destinationId);
        return Ok(ApiResponse<List<Hl7DistributionRule>>.Ok(rules));
    }

    [HttpGet("rules")]
    public async Task<ActionResult<ApiResponse<List<Hl7DistributionRule>>>> GetAllRules()
    {
        var rules = await _repository.GetDistributionRulesAsync();
        return Ok(ApiResponse<List<Hl7DistributionRule>>.Ok(rules));
    }

    [HttpPost("rules")]
    public async Task<ActionResult<ApiResponse<Hl7DistributionRule>>> CreateRule([FromBody] CreateHl7DistributionRuleRequest request)
    {
        var created = await _repository.CreateDistributionRuleAsync(
            request.DestinationId, request.Field, request.FieldValue, request.MessageType);

        _logger.LogInformation("HL7 distribution rule created: {RuleId}", created.Hl7DistributionRuleId);
        return Ok(ApiResponse<Hl7DistributionRule>.Ok(created, "Distribution rule created successfully."));
    }

    [HttpPut("rules/{id:int}")]
    public async Task<ActionResult<ApiResponse<Hl7DistributionRule>>> UpdateRule(int id, [FromBody] UpdateHl7DistributionRuleRequest request)
    {
        var updated = await _repository.UpdateDistributionRuleAsync(id,
            request.DestinationId, request.Field, request.FieldValue, request.MessageType);

        if (updated is null)
            return NotFound(ApiResponse<Hl7DistributionRule>.Fail($"Distribution rule {id} not found."));

        _logger.LogInformation("HL7 distribution rule updated: {RuleId}", id);
        return Ok(ApiResponse<Hl7DistributionRule>.Ok(updated, "Distribution rule updated successfully."));
    }

    [HttpDelete("rules/{id:int}")]
    public async Task<ActionResult<ApiResponse>> DeleteRule(int id)
    {
        var deleted = await _repository.DeleteDistributionRuleAsync(id);
        if (!deleted)
            return NotFound(ApiResponse.Fail($"Distribution rule {id} not found."));

        _logger.LogInformation("HL7 distribution rule deleted: {RuleId}", id);
        return Ok(ApiResponse.Ok("Distribution rule deleted successfully."));
    }
}
