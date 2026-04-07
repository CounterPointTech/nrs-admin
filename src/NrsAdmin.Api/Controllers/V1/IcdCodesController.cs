using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/icd-codes")]
[Authorize]
public class IcdCodesController : ControllerBase
{
    private readonly IcdCodeRepository _repository;
    private readonly ILogger<IcdCodesController> _logger;

    public IcdCodesController(IcdCodeRepository repository, ILogger<IcdCodesController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<IcdCode>>>> Search(
        [FromQuery] IcdCodeSearchRequest request)
    {
        var result = await _repository.SearchAsync(request);
        return Ok(ApiResponse<PagedResponse<IcdCode>>.Ok(result));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<IcdCode>>> GetById(string id)
    {
        var code = await _repository.GetByIdAsync(id);
        if (code is null)
            return NotFound(ApiResponse<IcdCode>.Fail($"ICD code '{id}' not found."));

        return Ok(ApiResponse<IcdCode>.Ok(code));
    }

    [HttpGet("categories")]
    public async Task<ActionResult<ApiResponse<List<IcdCategory>>>> GetCategories(
        [FromQuery] int? version = null)
    {
        var categories = await _repository.GetCategoriesAsync(version);
        return Ok(ApiResponse<List<IcdCategory>>.Ok(categories));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<IcdCode>>> Create(
        [FromBody] CreateIcdCodeRequest request)
    {
        // Check for duplicate ID
        var existing = await _repository.GetByIdAsync(request.IcdCodeId);
        if (existing is not null)
            return Conflict(ApiResponse<IcdCode>.Fail($"ICD code '{request.IcdCodeId}' already exists."));

        var created = await _repository.CreateAsync(request);

        _logger.LogInformation("ICD code created: {IcdCodeId}", created.IcdCodeId);

        return CreatedAtAction(nameof(GetById), new { id = created.IcdCodeId },
            ApiResponse<IcdCode>.Ok(created, "ICD code created successfully."));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<IcdCode>>> Update(
        string id, [FromBody] UpdateIcdCodeRequest request)
    {
        var updated = await _repository.UpdateAsync(id, request);
        if (updated is null)
            return NotFound(ApiResponse<IcdCode>.Fail($"ICD code '{id}' not found."));

        _logger.LogInformation("ICD code updated: {IcdCodeId}", updated.IcdCodeId);

        return Ok(ApiResponse<IcdCode>.Ok(updated, "ICD code updated successfully."));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> Delete(string id)
    {
        var (deleted, hasReferences) = await _repository.DeleteAsync(id);

        if (hasReferences)
            return Conflict(ApiResponse.Fail(
                "Cannot delete ICD code — it is referenced by billing orders. Consider marking it as obsolete instead."));

        if (!deleted)
            return NotFound(ApiResponse.Fail($"ICD code '{id}' not found."));

        _logger.LogInformation("ICD code deleted: {IcdCodeId}", id);
        return Ok(ApiResponse.Ok("ICD code deleted successfully."));
    }

    [HttpPost("{id}/obsolete")]
    public async Task<ActionResult<ApiResponse<IcdCode>>> MarkObsolete(string id)
    {
        var code = await _repository.GetByIdAsync(id);
        if (code is null)
            return NotFound(ApiResponse<IcdCode>.Fail($"ICD code '{id}' not found."));

        if (code.ObsoleteDate.HasValue)
            return BadRequest(ApiResponse<IcdCode>.Fail($"ICD code '{id}' is already marked as obsolete."));

        var updated = await _repository.SetObsoleteAsync(id);
        if (!updated)
            return BadRequest(ApiResponse<IcdCode>.Fail("Failed to mark code as obsolete."));

        _logger.LogInformation("ICD code marked obsolete: {IcdCodeId}", id);

        var refreshed = await _repository.GetByIdAsync(id);
        return Ok(ApiResponse<IcdCode>.Ok(refreshed!, "ICD code marked as obsolete."));
    }

    [HttpPost("{id}/restore")]
    public async Task<ActionResult<ApiResponse<IcdCode>>> Restore(string id)
    {
        var code = await _repository.GetByIdAsync(id);
        if (code is null)
            return NotFound(ApiResponse<IcdCode>.Fail($"ICD code '{id}' not found."));

        if (!code.ObsoleteDate.HasValue)
            return BadRequest(ApiResponse<IcdCode>.Fail($"ICD code '{id}' is not obsolete."));

        var updated = await _repository.RestoreAsync(id);
        if (!updated)
            return BadRequest(ApiResponse<IcdCode>.Fail("Failed to restore code."));

        _logger.LogInformation("ICD code restored: {IcdCodeId}", id);

        var refreshed = await _repository.GetByIdAsync(id);
        return Ok(ApiResponse<IcdCode>.Ok(refreshed!, "ICD code restored successfully."));
    }
}
