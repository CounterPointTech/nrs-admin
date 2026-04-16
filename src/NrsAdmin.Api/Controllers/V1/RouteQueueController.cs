using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/route-queue")]
[Authorize]
public class RouteQueueController : ControllerBase
{
    private readonly PacsRoutingRepository _repository;
    private readonly ILogger<RouteQueueController> _logger;

    public RouteQueueController(PacsRoutingRepository repository, ILogger<RouteQueueController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    /// <summary>
    /// Get paginated pending queue items
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<RouteQueueItem>>>> GetQueue(
        [FromQuery] RouteQueueSearchRequest request)
    {
        var result = await _repository.GetQueueAsync(request);
        return Ok(ApiResponse<PagedResponse<RouteQueueItem>>.Ok(result));
    }

    /// <summary>
    /// Get paginated route errors
    /// </summary>
    [HttpGet("errors")]
    public async Task<ActionResult<ApiResponse<PagedResponse<RouteError>>>> GetErrors(
        [FromQuery] RouteQueueSearchRequest request)
    {
        var result = await _repository.GetErrorsAsync(request);
        return Ok(ApiResponse<PagedResponse<RouteError>>.Ok(result));
    }

    /// <summary>
    /// Get paginated route history (completed)
    /// </summary>
    [HttpGet("history")]
    public async Task<ActionResult<ApiResponse<PagedResponse<RouteHistoryItem>>>> GetHistory(
        [FromQuery] RouteHistorySearchRequest request)
    {
        var result = await _repository.GetHistoryAsync(request);
        return Ok(ApiResponse<PagedResponse<RouteHistoryItem>>.Ok(result));
    }

    /// <summary>
    /// Get queue summary with counts per destination + totals
    /// </summary>
    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<object>>> GetSummary()
    {
        var destinations = await _repository.GetQueueSummaryAsync();
        var totals = await _repository.GetQueueTotalsAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            destinations,
            totals = new
            {
                totals.Pending,
                totals.Errors,
                totals.CompletedToday
            }
        }));
    }

    /// <summary>
    /// Remove an item from the pending queue
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse>> DeleteQueueItem(int id)
    {
        var deleted = await _repository.DeleteQueueItemAsync(id);
        if (!deleted)
            return NotFound(ApiResponse.Fail($"Queue item {id} not found."));

        _logger.LogInformation("Route queue item deleted: {Id}", id);
        return Ok(ApiResponse.Ok("Queue item removed."));
    }

    /// <summary>
    /// Remove all pending items for a destination
    /// </summary>
    [HttpDelete("destination/{destinationId:int}")]
    public async Task<ActionResult<ApiResponse>> DeleteQueueByDestination(int destinationId)
    {
        var count = await _repository.DeleteQueueItemsByDestinationAsync(destinationId);
        _logger.LogInformation("Cleared {Count} queue items for destination {DestinationId}", count, destinationId);
        return Ok(ApiResponse.Ok($"Removed {count} queue item(s)."));
    }

    /// <summary>
    /// Retry a single failed route (move from errors back to queue)
    /// </summary>
    [HttpPost("retry/{id:int}")]
    public async Task<ActionResult<ApiResponse>> RetryError(int id)
    {
        var retried = await _repository.RetryErrorAsync(id);
        if (!retried)
            return NotFound(ApiResponse.Fail($"Error {id} not found."));

        _logger.LogInformation("Route error retried: {Id}", id);
        return Ok(ApiResponse.Ok("Error re-queued for retry."));
    }

    /// <summary>
    /// Retry all errors for a destination
    /// </summary>
    [HttpPost("retry-all/{destinationId:int}")]
    public async Task<ActionResult<ApiResponse>> RetryAllErrors(int destinationId)
    {
        var count = await _repository.RetryAllErrorsForDestinationAsync(destinationId);
        _logger.LogInformation("Retried {Count} errors for destination {DestinationId}", count, destinationId);
        return Ok(ApiResponse.Ok($"Re-queued {count} error(s) for retry."));
    }

    /// <summary>
    /// Clear all errors for a destination (discard without retry)
    /// </summary>
    [HttpDelete("errors/{destinationId:int}")]
    public async Task<ActionResult<ApiResponse>> ClearErrors(int destinationId)
    {
        var count = await _repository.ClearErrorsForDestinationAsync(destinationId);
        _logger.LogInformation("Cleared {Count} errors for destination {DestinationId}", count, destinationId);
        return Ok(ApiResponse.Ok($"Cleared {count} error(s)."));
    }

    /// <summary>
    /// Queue all images in a study to a destination
    /// </summary>
    [HttpPost("study")]
    public async Task<ActionResult<ApiResponse>> QueueStudy([FromBody] QueueStudyRequest request)
    {
        var destination = await _repository.GetDestinationByIdAsync(request.DestinationId);
        if (destination is null)
            return NotFound(ApiResponse.Fail($"Destination {request.DestinationId} not found."));

        await _repository.QueueStudyAsync(request.StudyUid, request.DestinationId,
            request.Priority, request.OverwriteExisting);

        _logger.LogInformation("Study {StudyUid} queued to destination {DestinationId} ({DestName})",
            request.StudyUid, request.DestinationId, destination.Name);
        return Ok(ApiResponse.Ok($"Study queued to {destination.Name}."));
    }

    /// <summary>
    /// Queue all images in a series to a destination
    /// </summary>
    [HttpPost("series")]
    public async Task<ActionResult<ApiResponse>> QueueSeries([FromBody] QueueSeriesRequest request)
    {
        var destination = await _repository.GetDestinationByIdAsync(request.DestinationId);
        if (destination is null)
            return NotFound(ApiResponse.Fail($"Destination {request.DestinationId} not found."));

        await _repository.QueueSeriesAsync(request.SeriesUid, request.DestinationId,
            request.Priority, request.OverwriteExisting);

        _logger.LogInformation("Series {SeriesUid} queued to destination {DestinationId} ({DestName})",
            request.SeriesUid, request.DestinationId, destination.Name);
        return Ok(ApiResponse.Ok($"Series queued to {destination.Name}."));
    }
}
