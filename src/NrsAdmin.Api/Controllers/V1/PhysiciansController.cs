using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/physicians")]
[Authorize]
public class PhysiciansController : ControllerBase
{
    private readonly PhysicianRepository _repository;
    private readonly ILogger<PhysiciansController> _logger;

    public PhysiciansController(PhysicianRepository repository, ILogger<PhysiciansController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    /// <summary>
    /// Search physicians by name for autocomplete pickers. Returns up to <paramref name="limit"/>
    /// matches (hard-capped at 100 server-side). Empty query returns the first N alphabetically.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Physician>>>> Search([FromQuery] string? q = null, [FromQuery] int limit = 20)
    {
        try
        {
            var results = await _repository.SearchAsync(q, limit);
            return Ok(ApiResponse<List<Physician>>.Ok(results));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Physician search failed for query {Query}", q);
            return StatusCode(500, ApiResponse<List<Physician>>.Fail("Failed to search physicians."));
        }
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<Physician>>> GetById(long id)
    {
        var result = await _repository.GetByIdAsync(id);
        if (result is null)
            return NotFound(ApiResponse<Physician>.Fail($"Physician '{id}' not found."));
        return Ok(ApiResponse<Physician>.Ok(result));
    }
}
