using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly DashboardRepository _dashboardRepository;

    public DashboardController(DashboardRepository dashboardRepository)
    {
        _dashboardRepository = dashboardRepository;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<ApiResponse<DashboardStats>>> GetStats()
    {
        var stats = await _dashboardRepository.GetStatsAsync();
        return Ok(ApiResponse<DashboardStats>.Ok(stats));
    }
}
