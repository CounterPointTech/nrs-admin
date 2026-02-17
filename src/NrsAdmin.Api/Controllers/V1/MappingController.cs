using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Services;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/mapping")]
[Authorize]
public class MappingController : ControllerBase
{
    private readonly MappingFileService _mappingService;
    private readonly ILogger<MappingController> _logger;

    public MappingController(MappingFileService mappingService, ILogger<MappingController> logger)
    {
        _mappingService = mappingService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<MappingEntry>>>> GetEntries()
    {
        var entries = await _mappingService.ReadEntriesAsync();
        return Ok(ApiResponse<List<MappingEntry>>.Ok(entries));
    }

    [HttpGet("raw")]
    public async Task<ActionResult<ApiResponse<string>>> GetRaw()
    {
        var content = await _mappingService.ReadRawAsync();
        return Ok(ApiResponse<string>.Ok(content));
    }

    [HttpPut]
    public async Task<ActionResult<ApiResponse>> UpdateEntries([FromBody] UpdateMappingRequest request)
    {
        var errors = _mappingService.ValidateEntries(request.Entries);
        if (errors.Count > 0)
            return BadRequest(ApiResponse.Fail("Mapping validation failed.", errors));

        await _mappingService.WriteEntriesAsync(request.Entries);
        _logger.LogInformation("Mapping file updated via structured editor");
        return Ok(ApiResponse.Ok("Mapping file updated successfully."));
    }

    [HttpPut("raw")]
    public async Task<ActionResult<ApiResponse>> UpdateRaw([FromBody] UpdateMappingRawRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Content))
            return BadRequest(ApiResponse.Fail("Content cannot be empty."));

        await _mappingService.WriteRawAsync(request.Content);
        _logger.LogInformation("Mapping file updated via raw editor");
        return Ok(ApiResponse.Ok("Mapping file updated successfully."));
    }

    [HttpGet("backups")]
    public ActionResult<ApiResponse<List<MappingBackup>>> ListBackups()
    {
        var backups = _mappingService.ListBackups();
        return Ok(ApiResponse<List<MappingBackup>>.Ok(backups));
    }

    [HttpPost("restore/{fileName}")]
    public async Task<ActionResult<ApiResponse>> Restore(string fileName)
    {
        try
        {
            await _mappingService.RestoreFromBackupAsync(fileName);
            _logger.LogInformation("Mapping file restored from backup: {FileName}", fileName);
            return Ok(ApiResponse.Ok($"Mapping file restored from {fileName}."));
        }
        catch (FileNotFoundException)
        {
            return NotFound(ApiResponse.Fail($"Backup file '{fileName}' not found."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
    }
}
