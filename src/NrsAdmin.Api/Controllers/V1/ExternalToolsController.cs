using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Services;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/external-tools")]
[Authorize]
public class ExternalToolsController : ControllerBase
{
    private readonly ExternalToolsService _service;
    private readonly ILogger<ExternalToolsController> _logger;

    public ExternalToolsController(ExternalToolsService service, ILogger<ExternalToolsController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ExternalTool>>>> List()
    {
        if (!TryGetUserId(out var userId, out var unauthorized))
            return unauthorized!;

        var tools = await _service.ListAsync(userId);
        return Ok(ApiResponse<List<ExternalTool>>.Ok(tools));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ExternalTool>>> Create([FromBody] CreateExternalToolRequest request)
    {
        if (!TryGetUserId(out var userId, out var unauthorized))
            return unauthorized!;

        try
        {
            var tool = await _service.CreateAsync(userId, request);
            return Ok(ApiResponse<ExternalTool>.Ok(tool, "Tool created."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ExternalTool>>> Update(Guid id, [FromBody] UpdateExternalToolRequest request)
    {
        if (!TryGetUserId(out var userId, out var unauthorized))
            return unauthorized!;

        try
        {
            var tool = await _service.UpdateAsync(userId, id, request);
            return Ok(ApiResponse<ExternalTool>.Ok(tool, "Tool updated."));
        }
        catch (FileNotFoundException)
        {
            return NotFound(ApiResponse.Fail($"Tool '{id}' not found."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse>> Delete(Guid id)
    {
        if (!TryGetUserId(out var userId, out var unauthorized))
            return unauthorized!;

        try
        {
            await _service.DeleteAsync(userId, id);
            return Ok(ApiResponse.Ok("Tool deleted."));
        }
        catch (FileNotFoundException)
        {
            return NotFound(ApiResponse.Fail($"Tool '{id}' not found."));
        }
    }

    [HttpPost("reorder")]
    public async Task<ActionResult<ApiResponse>> Reorder([FromBody] ReorderExternalToolsRequest request)
    {
        if (!TryGetUserId(out var userId, out var unauthorized))
            return unauthorized!;

        await _service.ReorderAsync(userId, request);
        return Ok(ApiResponse.Ok("Tools reordered."));
    }

    [HttpPost("{id:guid}/launch")]
    public async Task<ActionResult<ApiResponse<ExternalTool>>> Launch(Guid id)
    {
        if (!TryGetUserId(out var userId, out var unauthorized))
            return unauthorized!;

        try
        {
            var tool = await _service.LaunchAsync(userId, id);
            return Ok(ApiResponse<ExternalTool>.Ok(tool, $"Launched '{tool.Name}'."));
        }
        catch (FileNotFoundException)
        {
            return NotFound(ApiResponse.Fail($"Tool '{id}' not found."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error launching external tool {Id} for user {UserId}", id, userId);
            return StatusCode(500, ApiResponse.Fail($"Failed to launch tool: {ex.Message}"));
        }
    }

    private bool TryGetUserId(out int userId, out ActionResult? unauthorized)
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (claim is null || !int.TryParse(claim.Value, out userId))
        {
            userId = 0;
            unauthorized = Unauthorized(ApiResponse.Fail("Invalid token."));
            return false;
        }

        unauthorized = null;
        return true;
    }
}
