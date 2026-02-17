using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/ae-monitor")]
[Authorize]
public class AeMonitorController : ControllerBase
{
    private readonly AeMonitorRepository _aeMonitorRepository;

    public AeMonitorController(AeMonitorRepository aeMonitorRepository)
    {
        _aeMonitorRepository = aeMonitorRepository;
    }

    [HttpGet("recent")]
    public async Task<ActionResult<ApiResponse<List<AeActivity>>>> GetRecent([FromQuery] int hours = 1)
    {
        if (hours is < 1 or > 24)
            return BadRequest(ApiResponse<List<AeActivity>>.Fail("Hours must be between 1 and 24."));

        var activities = await _aeMonitorRepository.GetRecentActivityAsync(hours);
        return Ok(ApiResponse<List<AeActivity>>.Ok(activities));
    }
}
