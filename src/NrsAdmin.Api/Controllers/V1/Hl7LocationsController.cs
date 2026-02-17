using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/hl7/locations")]
[Authorize]
public class Hl7LocationsController : ControllerBase
{
    private readonly Hl7Repository _repository;
    private readonly ILogger<Hl7LocationsController> _logger;

    public Hl7LocationsController(Hl7Repository repository, ILogger<Hl7LocationsController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Hl7Location>>>> GetAll()
    {
        var locations = await _repository.GetLocationsAsync();
        return Ok(ApiResponse<List<Hl7Location>>.Ok(locations));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<Hl7Location>>> GetById(int id)
    {
        var location = await _repository.GetLocationByIdAsync(id);
        if (location is null)
            return NotFound(ApiResponse<Hl7Location>.Fail($"HL7 location {id} not found."));

        return Ok(ApiResponse<Hl7Location>.Ok(location));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Hl7Location>>> Create([FromBody] CreateHl7LocationRequest request)
    {
        var created = await _repository.CreateLocationAsync(
            request.Address, request.Port, request.Enabled, request.CultureCode);

        _logger.LogInformation("HL7 location created: {LocationId} ({Address})", created.LocationId, created.Address);
        return CreatedAtAction(nameof(GetById), new { id = created.LocationId },
            ApiResponse<Hl7Location>.Ok(created, "HL7 location created successfully."));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<Hl7Location>>> Update(int id, [FromBody] UpdateHl7LocationRequest request)
    {
        var updated = await _repository.UpdateLocationAsync(id,
            request.Address, request.Port, request.Enabled, request.CultureCode);

        if (updated is null)
            return NotFound(ApiResponse<Hl7Location>.Fail($"HL7 location {id} not found."));

        _logger.LogInformation("HL7 location updated: {LocationId} ({Address})", updated.LocationId, updated.Address);
        return Ok(ApiResponse<Hl7Location>.Ok(updated, "HL7 location updated successfully."));
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse>> Delete(int id)
    {
        var deleted = await _repository.DeleteLocationAsync(id);
        if (!deleted)
            return NotFound(ApiResponse.Fail($"HL7 location {id} not found."));

        _logger.LogInformation("HL7 location deleted: {LocationId}", id);
        return Ok(ApiResponse.Ok("HL7 location deleted successfully."));
    }

    // ============== Location Options ==============

    [HttpGet("{locationId:int}/options")]
    public async Task<ActionResult<ApiResponse<List<Hl7LocationOption>>>> GetOptions(int locationId)
    {
        var options = await _repository.GetLocationOptionsAsync(locationId);
        return Ok(ApiResponse<List<Hl7LocationOption>>.Ok(options));
    }

    [HttpPut("{locationId:int}/options")]
    public async Task<ActionResult<ApiResponse<Hl7LocationOption>>> UpsertOption(
        int locationId, [FromBody] SaveHl7LocationOptionRequest request)
    {
        var option = await _repository.UpsertLocationOptionAsync(locationId, request.Name, request.Value);
        return Ok(ApiResponse<Hl7LocationOption>.Ok(option, "Option saved successfully."));
    }

    [HttpDelete("{locationId:int}/options/{name}")]
    public async Task<ActionResult<ApiResponse>> DeleteOption(int locationId, string name)
    {
        var deleted = await _repository.DeleteLocationOptionAsync(locationId, name);
        if (!deleted)
            return NotFound(ApiResponse.Fail("Option not found."));

        return Ok(ApiResponse.Ok("Option deleted successfully."));
    }
}
