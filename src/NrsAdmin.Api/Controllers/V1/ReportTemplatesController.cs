using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Services;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/report-templates")]
[Authorize]
public class ReportTemplatesController : ControllerBase
{
    private readonly ReportTemplateService _templateService;
    private readonly ILogger<ReportTemplatesController> _logger;

    public ReportTemplatesController(ReportTemplateService templateService, ILogger<ReportTemplatesController> logger)
    {
        _templateService = templateService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ReportTemplateInfo>>>> ListTemplates()
    {
        var templates = await _templateService.ListTemplatesAsync();
        return Ok(ApiResponse<List<ReportTemplateInfo>>.Ok(templates));
    }

    [HttpGet("{name}")]
    public async Task<ActionResult<ApiResponse<string>>> ReadTemplate(string name)
    {
        try
        {
            var content = await _templateService.ReadTemplateAsync(name);
            return Ok(ApiResponse<string>.Ok(content));
        }
        catch (FileNotFoundException)
        {
            return NotFound(ApiResponse.Fail($"Template '{name}' not found."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
    }

    [HttpPut("{name}")]
    public async Task<ActionResult<ApiResponse>> SaveTemplate(string name, [FromBody] SaveReportTemplateRequest request)
    {
        try
        {
            await _templateService.SaveTemplateAsync(name, request.Content);
            return Ok(ApiResponse.Ok("Template saved successfully."));
        }
        catch (FileNotFoundException)
        {
            return NotFound(ApiResponse.Fail($"Template '{name}' not found."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse>> CreateTemplate([FromBody] CreateReportTemplateRequest request)
    {
        try
        {
            await _templateService.CreateTemplateAsync(request.Name, request.Content);
            return Ok(ApiResponse.Ok($"Template '{request.Name}' created successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
    }

    [HttpDelete("{name}")]
    public async Task<ActionResult<ApiResponse>> DeleteTemplate(string name)
    {
        try
        {
            // Check if template is in use by any facility
            var facilities = await _templateService.GetFacilitiesUsingTemplateAsync(name);
            if (facilities.Count > 0)
            {
                return Conflict(ApiResponse<List<string>>.Fail(
                    $"Cannot delete template '{name}' — it is in use by {facilities.Count} facility/facilities.",
                    facilities));
            }

            await _templateService.DeleteTemplateAsync(name);
            return Ok(ApiResponse.Ok($"Template '{name}' deleted successfully."));
        }
        catch (FileNotFoundException)
        {
            return NotFound(ApiResponse.Fail($"Template '{name}' not found."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
    }

    [HttpPost("{name}/duplicate")]
    public async Task<ActionResult<ApiResponse>> DuplicateTemplate(string name, [FromBody] DuplicateReportTemplateRequest request)
    {
        try
        {
            await _templateService.DuplicateTemplateAsync(name, request.NewName);
            return Ok(ApiResponse.Ok($"Template duplicated as '{request.NewName}'."));
        }
        catch (FileNotFoundException)
        {
            return NotFound(ApiResponse.Fail($"Source template '{name}' not found."));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
    }

    [HttpGet("backups")]
    public ActionResult<ApiResponse<List<ReportTemplateBackup>>> ListBackups()
    {
        var backups = _templateService.ListBackups();
        return Ok(ApiResponse<List<ReportTemplateBackup>>.Ok(backups));
    }

    [HttpPost("backups/restore/{fileName}")]
    public async Task<ActionResult<ApiResponse>> RestoreFromBackup(string fileName)
    {
        try
        {
            await _templateService.RestoreFromBackupAsync(fileName);
            return Ok(ApiResponse.Ok($"Template restored from backup '{fileName}'."));
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

    [HttpGet("placeholders")]
    public ActionResult<ApiResponse<List<TemplatePlaceholder>>> GetPlaceholders()
    {
        var placeholders = ReportTemplateService.GetPlaceholders();
        return Ok(ApiResponse<List<TemplatePlaceholder>>.Ok(placeholders));
    }

    [HttpGet("sections")]
    public ActionResult<ApiResponse<List<TemplateSection>>> GetSections()
    {
        var sections = ReportTemplateService.GetSections();
        return Ok(ApiResponse<List<TemplateSection>>.Ok(sections));
    }

    [HttpPost("preview")]
    public ActionResult<ApiResponse<string>> RenderPreview([FromBody] RenderPreviewRequest request)
    {
        var rendered = _templateService.RenderPreview(request.Content);
        return Ok(ApiResponse<string>.Ok(rendered));
    }
}
