using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/pacs/routing-zones")]
[Authorize]
public class RoutingZonesController : ControllerBase
{
    private readonly PacsRoutingRepository _repository;
    private readonly ILogger<RoutingZonesController> _logger;

    public RoutingZonesController(PacsRoutingRepository repository, ILogger<RoutingZonesController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<RoutingZone>>>> GetAll()
    {
        var zones = await _repository.GetAllZonesAsync();
        return Ok(ApiResponse<List<RoutingZone>>.Ok(zones));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<RoutingZone>>> GetById(int id)
    {
        var zone = await _repository.GetZoneByIdAsync(id);
        if (zone is null)
            return NotFound(ApiResponse<RoutingZone>.Fail($"Routing zone {id} not found."));

        return Ok(ApiResponse<RoutingZone>.Ok(zone));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<RoutingZone>>> Create([FromBody] CreateRoutingZoneRequest request)
    {
        var created = await _repository.CreateZoneAsync(request.ZoneName, request.IsDefault);

        _logger.LogInformation("Routing zone created: {ZoneId} ({ZoneName})", created.Id, created.ZoneName);
        return CreatedAtAction(nameof(GetById), new { id = created.Id },
            ApiResponse<RoutingZone>.Ok(created, "Routing zone created successfully."));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<RoutingZone>>> Update(int id, [FromBody] UpdateRoutingZoneRequest request)
    {
        var updated = await _repository.UpdateZoneAsync(id, request.ZoneName, request.IsDefault);

        if (updated is null)
            return NotFound(ApiResponse<RoutingZone>.Fail($"Routing zone {id} not found."));

        _logger.LogInformation("Routing zone updated: {ZoneId} ({ZoneName})", updated.Id, updated.ZoneName);
        return Ok(ApiResponse<RoutingZone>.Ok(updated, "Routing zone updated successfully."));
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse>> Delete(int id)
    {
        var (deleted, hasReferences) = await _repository.DeleteZoneAsync(id);

        if (hasReferences)
            return Conflict(ApiResponse.Fail(
                "Cannot delete routing zone — it is referenced by existing destinations."));

        if (!deleted)
            return NotFound(ApiResponse.Fail($"Routing zone {id} not found."));

        _logger.LogInformation("Routing zone deleted: {ZoneId}", id);
        return Ok(ApiResponse.Ok("Routing zone deleted successfully."));
    }
}
