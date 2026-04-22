using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/sites")]
[Authorize]
public class SitesController : ControllerBase
{
    private readonly SiteRepository _repository;

    public SitesController(SiteRepository repository)
    {
        _repository = repository;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Site>>>> GetAll()
    {
        var sites = await _repository.GetAllAsync();
        return Ok(ApiResponse<List<Site>>.Ok(sites));
    }
}
