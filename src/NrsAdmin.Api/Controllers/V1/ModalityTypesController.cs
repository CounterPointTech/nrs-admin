using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/modality-types")]
[Authorize]
public class ModalityTypesController : ControllerBase
{
    private readonly ModalityTypeRepository _modalityTypeRepository;
    private readonly ILogger<ModalityTypesController> _logger;

    public ModalityTypesController(ModalityTypeRepository modalityTypeRepository,
        ILogger<ModalityTypesController> logger)
    {
        _modalityTypeRepository = modalityTypeRepository;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ModalityType>>>> GetAll()
    {
        var types = await _modalityTypeRepository.GetAllAsync();
        return Ok(ApiResponse<List<ModalityType>>.Ok(types));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<ModalityType>>> GetById(string id)
    {
        var type = await _modalityTypeRepository.GetByIdAsync(id);
        if (type is null)
            return NotFound(ApiResponse<ModalityType>.Fail($"Modality type '{id}' not found."));

        return Ok(ApiResponse<ModalityType>.Ok(type));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ModalityType>>> Create([FromBody] CreateModalityTypeRequest request)
    {
        var exists = await _modalityTypeRepository.ExistsAsync(request.ModalityTypeId);
        if (exists)
            return Conflict(ApiResponse<ModalityType>.Fail(
                $"Modality type '{request.ModalityTypeId}' already exists."));

        var created = await _modalityTypeRepository.CreateAsync(request.ModalityTypeId, request.Description);

        _logger.LogInformation("Modality type created: {ModalityTypeId}", created.ModalityTypeId);
        return CreatedAtAction(nameof(GetById), new { id = created.ModalityTypeId },
            ApiResponse<ModalityType>.Ok(created, "Modality type created successfully."));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> Delete(string id)
    {
        var (deleted, hasReferences) = await _modalityTypeRepository.DeleteAsync(id);

        if (hasReferences)
            return Conflict(ApiResponse.Fail(
                "Cannot delete modality type — it is referenced by existing modalities."));

        if (!deleted)
            return NotFound(ApiResponse.Fail($"Modality type '{id}' not found."));

        _logger.LogInformation("Modality type deleted: {ModalityTypeId}", id);
        return Ok(ApiResponse.Ok("Modality type deleted successfully."));
    }
}
