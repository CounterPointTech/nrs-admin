using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/pacs/destinations")]
[Authorize]
public class PacsDestinationsController : ControllerBase
{
    private readonly PacsRoutingRepository _repository;
    private readonly ILogger<PacsDestinationsController> _logger;

    public PacsDestinationsController(PacsRoutingRepository repository, ILogger<PacsDestinationsController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<PacsDestination>>>> GetAll()
    {
        var destinations = await _repository.GetAllDestinationsAsync();
        return Ok(ApiResponse<List<PacsDestination>>.Ok(destinations));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<PacsDestination>>> GetById(int id)
    {
        var destination = await _repository.GetDestinationByIdAsync(id);
        if (destination is null)
            return NotFound(ApiResponse<PacsDestination>.Fail($"Destination {id} not found."));

        return Ok(ApiResponse<PacsDestination>.Ok(destination));
    }

    [HttpGet("{id:int}/history")]
    public async Task<ActionResult<ApiResponse<List<RouteHistoryEntry>>>> GetHistory(int id, [FromQuery] int limit = 100)
    {
        var destination = await _repository.GetDestinationByIdAsync(id);
        if (destination is null)
            return NotFound(ApiResponse<List<RouteHistoryEntry>>.Fail($"Destination {id} not found."));

        var history = await _repository.GetRouteHistoryAsync(id, limit);
        return Ok(ApiResponse<List<RouteHistoryEntry>>.Ok(history));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<PacsDestination>>> Create([FromBody] CreatePacsDestinationRequest request)
    {
        var created = await _repository.CreateDestinationAsync(
            request.Name, request.Address, request.AeTitle, request.Port, request.Type,
            request.Password, request.NumTries, request.Frequency, request.Compression,
            request.Status, request.RouteRelated, request.TransferSyntax, request.RoutingZone);

        _logger.LogInformation("PACS destination created: {DestinationId} ({Name})", created.DestinationId, created.Name);
        return CreatedAtAction(nameof(GetById), new { id = created.DestinationId },
            ApiResponse<PacsDestination>.Ok(created, "Destination created successfully."));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<PacsDestination>>> Update(int id, [FromBody] UpdatePacsDestinationRequest request)
    {
        var updated = await _repository.UpdateDestinationAsync(id,
            request.Name, request.Address, request.AeTitle, request.Port, request.Type,
            request.Password, request.NumTries, request.Frequency, request.Compression,
            request.Status, request.RouteRelated, request.TransferSyntax, request.RoutingZone);

        if (updated is null)
            return NotFound(ApiResponse<PacsDestination>.Fail($"Destination {id} not found."));

        _logger.LogInformation("PACS destination updated: {DestinationId} ({Name})", updated.DestinationId, updated.Name);
        return Ok(ApiResponse<PacsDestination>.Ok(updated, "Destination updated successfully."));
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse>> Delete(int id)
    {
        var (deleted, hasReferences) = await _repository.DeleteDestinationAsync(id);

        if (hasReferences)
            return Conflict(ApiResponse.Fail(
                "Cannot delete destination — it has route history entries. Remove the history first or archive the destination."));

        if (!deleted)
            return NotFound(ApiResponse.Fail($"Destination {id} not found."));

        _logger.LogInformation("PACS destination deleted: {DestinationId}", id);
        return Ok(ApiResponse.Ok("Destination deleted successfully."));
    }
}
