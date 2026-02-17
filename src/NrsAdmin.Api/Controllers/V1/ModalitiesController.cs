using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/modalities")]
[Authorize]
public class ModalitiesController : ControllerBase
{
    private readonly ModalityRepository _modalityRepository;
    private readonly ILogger<ModalitiesController> _logger;

    public ModalitiesController(ModalityRepository modalityRepository, ILogger<ModalitiesController> logger)
    {
        _modalityRepository = modalityRepository;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Modality>>>> GetAll()
    {
        var modalities = await _modalityRepository.GetAllAsync();
        return Ok(ApiResponse<List<Modality>>.Ok(modalities));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<Modality>>> GetById(int id)
    {
        var modality = await _modalityRepository.GetByIdAsync(id);
        if (modality is null)
            return NotFound(ApiResponse<Modality>.Fail($"Modality {id} not found."));

        return Ok(ApiResponse<Modality>.Ok(modality));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Modality>>> Create([FromBody] CreateModalityRequest request)
    {
        var created = await _modalityRepository.CreateAsync(
            request.Name, request.Room, request.Status,
            request.ModalityTypeId, request.IsRetired, request.AeTitle,
            request.SupportsWorklist, request.SupportsMpps, request.FacilityId);

        _logger.LogInformation("Modality created: {ModalityId} ({Name})", created.ModalityId, created.Name);
        return CreatedAtAction(nameof(GetById), new { id = created.ModalityId },
            ApiResponse<Modality>.Ok(created, "Modality created successfully."));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<Modality>>> Update(int id, [FromBody] UpdateModalityRequest request)
    {
        var updated = await _modalityRepository.UpdateAsync(id,
            request.Name, request.Room, request.Status,
            request.ModalityTypeId, request.IsRetired, request.AeTitle,
            request.SupportsWorklist, request.SupportsMpps, request.FacilityId);

        if (updated is null)
            return NotFound(ApiResponse<Modality>.Fail($"Modality {id} not found."));

        _logger.LogInformation("Modality updated: {ModalityId} ({Name})", updated.ModalityId, updated.Name);
        return Ok(ApiResponse<Modality>.Ok(updated, "Modality updated successfully."));
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse>> Delete(int id)
    {
        var (deleted, hasReferences) = await _modalityRepository.DeleteAsync(id);

        if (hasReferences)
            return Conflict(ApiResponse.Fail(
                "Cannot delete modality — it is referenced by existing order procedures."));

        if (!deleted)
            return NotFound(ApiResponse.Fail($"Modality {id} not found."));

        _logger.LogInformation("Modality deleted: {ModalityId}", id);
        return Ok(ApiResponse.Ok("Modality deleted successfully."));
    }
}
