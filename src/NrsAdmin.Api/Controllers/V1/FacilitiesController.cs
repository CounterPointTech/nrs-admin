using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/facilities")]
[Authorize]
public class FacilitiesController : ControllerBase
{
    private readonly FacilityRepository _facilityRepository;

    public FacilitiesController(FacilityRepository facilityRepository)
    {
        _facilityRepository = facilityRepository;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Facility>>>> GetAll()
    {
        var facilities = await _facilityRepository.GetAllAsync();
        return Ok(ApiResponse<List<Facility>>.Ok(facilities));
    }
}
