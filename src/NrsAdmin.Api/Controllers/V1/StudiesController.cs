using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/studies")]
[Authorize]
public class StudiesController : ControllerBase
{
    private static readonly Dictionary<int, string> StatusLabels = new()
    {
        { 0, "New" }, { 1, "In Progress" }, { 2, "Read" }, { 3, "Final" },
        { 4, "Addendum" }, { 5, "Cancelled" }, { 6, "On Hold" }, { 7, "Stat" }
    };

    private readonly StudyRepository _studyRepository;
    private readonly RisRepository _risRepository;
    private readonly ILogger<StudiesController> _logger;

    public StudiesController(
        StudyRepository studyRepository,
        RisRepository risRepository,
        ILogger<StudiesController> logger)
    {
        _studyRepository = studyRepository;
        _risRepository = risRepository;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<StudySearchResult>>>> Search(
        [FromQuery] StudySearchRequest request)
    {
        var result = await _studyRepository.SearchAsync(request);
        return Ok(ApiResponse<PagedResponse<StudySearchResult>>.Ok(result));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<StudyDetail>>> GetById(long id)
    {
        var study = await _studyRepository.GetByIdAsync(id);
        if (study is null)
            return NotFound(ApiResponse<StudyDetail>.Fail($"Study {id} not found."));

        return Ok(ApiResponse<StudyDetail>.Ok(study));
    }

    [HttpGet("{id:long}/unified")]
    public async Task<ActionResult<ApiResponse<UnifiedStudyDetail>>> GetUnified(long id)
    {
        var unified = await _risRepository.GetUnifiedStudyDetailAsync(id);
        if (unified is null)
            return NotFound(ApiResponse<UnifiedStudyDetail>.Fail($"Study {id} not found."));

        return Ok(ApiResponse<UnifiedStudyDetail>.Ok(unified));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ApiResponse<StudyDetail>>> Update(long id, [FromBody] UpdateStudyRequest request)
    {
        var existing = await _studyRepository.GetByIdAsync(id);
        if (existing is null)
            return NotFound(ApiResponse<StudyDetail>.Fail($"Study {id} not found."));

        var updated = await _studyRepository.UpdateAsync(id, request);
        if (!updated)
            return BadRequest(ApiResponse<StudyDetail>.Fail("No fields to update."));

        _logger.LogInformation("Study {StudyId} updated by user", id);

        var refreshed = await _studyRepository.GetByIdAsync(id);
        return Ok(ApiResponse<StudyDetail>.Ok(refreshed!));
    }

    [HttpPost("bulk-status")]
    public async Task<ActionResult<ApiResponse<BulkUpdateResult>>> BulkUpdateStatus(
        [FromBody] BulkUpdateStatusRequest request)
    {
        var count = await _studyRepository.BulkUpdateStatusAsync(request.StudyIds, request.Status);

        _logger.LogInformation(
            "Bulk status update: {Count} studies set to status {Status}",
            count, request.Status);

        return Ok(ApiResponse<BulkUpdateResult>.Ok(new BulkUpdateResult
        {
            UpdatedCount = count,
            RequestedCount = request.StudyIds.Length
        }));
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] StudySearchRequest request)
    {
        var results = await _studyRepository.ExportSearchAsync(request);

        var csv = new StringBuilder();
        csv.AppendLine("StudyID,PatientID,LastName,FirstName,Gender,DOB,StudyDate,Accession,Modality,Status,Facility,Institution,Series,Images");

        foreach (var r in results)
        {
            var statusLabel = StatusLabels.GetValueOrDefault(r.Status, $"Status {r.Status}");
            csv.AppendLine(string.Join(",",
                CsvEscape(r.Id.ToString()),
                CsvEscape(r.PatientId),
                CsvEscape(r.LastName),
                CsvEscape(r.FirstName),
                CsvEscape(r.Gender),
                CsvEscape(r.BirthTime?.ToString("yyyy-MM-dd")),
                CsvEscape(r.StudyDate.ToString("yyyy-MM-dd")),
                CsvEscape(r.Accession),
                CsvEscape(r.Modality),
                CsvEscape(statusLabel),
                CsvEscape(r.FacilityName),
                CsvEscape(r.Institution),
                r.SeriesCount.ToString(),
                r.ImageCount.ToString()
            ));
        }

        var bytes = Encoding.UTF8.GetBytes(csv.ToString());
        return File(bytes, "text/csv", $"studies-export-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv");
    }

    [HttpGet("{studyId:long}/series")]
    public async Task<ActionResult<ApiResponse<List<Series>>>> GetSeries(long studyId)
    {
        var study = await _studyRepository.GetByIdAsync(studyId);
        if (study is null)
            return NotFound(ApiResponse<List<Series>>.Fail($"Study {studyId} not found."));

        var series = await _studyRepository.GetSeriesAsync(studyId);
        return Ok(ApiResponse<List<Series>>.Ok(series));
    }

    [HttpPut("series/{seriesId:long}")]
    public async Task<ActionResult<ApiResponse<List<Series>>>> UpdateSeries(
        long seriesId, [FromBody] UpdateSeriesRequest request)
    {
        var updated = await _studyRepository.UpdateSeriesAsync(seriesId, request);
        if (!updated)
            return BadRequest(ApiResponse<List<Series>>.Fail("No fields to update."));

        _logger.LogInformation("Series {SeriesId} updated", seriesId);

        // Return the refreshed series for the study this series belongs to
        var series = await _studyRepository.GetSeriesForSeriesIdAsync(seriesId);
        return Ok(ApiResponse<List<Series>>.Ok(series));
    }

    // ================================================================
    // RIS Write Endpoints
    // ================================================================

    [HttpPut("{id:long}/ris-patient")]
    public async Task<ActionResult<ApiResponse<UnifiedStudyDetail>>> UpdateRisPatientDetails(
        long id, [FromBody] UpdateRisPatientDetailsRequest request)
    {
        var study = await _studyRepository.GetByIdAsync(id);
        if (study is null)
            return NotFound(ApiResponse<UnifiedStudyDetail>.Fail($"Study {id} not found."));

        var updated = await _risRepository.UpdatePatientDetailsAsync(study.PatientId, request);
        if (!updated)
            return BadRequest(ApiResponse<UnifiedStudyDetail>.Fail("No fields to update."));

        _logger.LogInformation("RIS patient details updated for patient {PatientId} via study {StudyId}", study.PatientId, id);

        var refreshed = await _risRepository.GetUnifiedStudyDetailAsync(id);
        return Ok(ApiResponse<UnifiedStudyDetail>.Ok(refreshed!));
    }

    [HttpPut("{id:long}/ris-report/{reportId:long}")]
    public async Task<ActionResult<ApiResponse<UnifiedStudyDetail>>> UpdateRisReport(
        long id, long reportId, [FromBody] UpdateRisReportRequest request)
    {
        var study = await _studyRepository.GetByIdAsync(id);
        if (study is null)
            return NotFound(ApiResponse<UnifiedStudyDetail>.Fail($"Study {id} not found."));

        var updated = await _risRepository.UpdateReportAsync(reportId, request);
        if (!updated)
            return BadRequest(ApiResponse<UnifiedStudyDetail>.Fail("No fields to update."));

        _logger.LogInformation("RIS report {ReportId} updated via study {StudyId}", reportId, id);

        var refreshed = await _risRepository.GetUnifiedStudyDetailAsync(id);
        return Ok(ApiResponse<UnifiedStudyDetail>.Ok(refreshed!));
    }

    [HttpPost("{id:long}/ris-report")]
    public async Task<ActionResult<ApiResponse<UnifiedStudyDetail>>> CreateRisReport(
        long id, [FromBody] CreateRisReportRequest request)
    {
        var study = await _studyRepository.GetByIdAsync(id);
        if (study is null)
            return NotFound(ApiResponse<UnifiedStudyDetail>.Fail($"Study {id} not found."));

        var reportId = await _risRepository.CreateReportAsync(request);

        _logger.LogInformation("RIS report {ReportId} created on procedure {ProcedureId} via study {StudyId}",
            reportId, request.ProcedureId, id);

        var refreshed = await _risRepository.GetUnifiedStudyDetailAsync(id);
        return Ok(ApiResponse<UnifiedStudyDetail>.Ok(refreshed!));
    }

    [HttpPut("{id:long}/ris-order/{orderId:long}")]
    public async Task<ActionResult<ApiResponse<UnifiedStudyDetail>>> UpdateRisOrder(
        long id, long orderId, [FromBody] UpdateRisOrderRequest request)
    {
        var study = await _studyRepository.GetByIdAsync(id);
        if (study is null)
            return NotFound(ApiResponse<UnifiedStudyDetail>.Fail($"Study {id} not found."));

        var updated = await _risRepository.UpdateOrderAsync(orderId, request);
        if (!updated)
            return BadRequest(ApiResponse<UnifiedStudyDetail>.Fail("No fields to update."));

        _logger.LogInformation("RIS order {OrderId} updated via study {StudyId}", orderId, id);

        var refreshed = await _risRepository.GetUnifiedStudyDetailAsync(id);
        return Ok(ApiResponse<UnifiedStudyDetail>.Ok(refreshed!));
    }

    [HttpPut("{id:long}/ris-procedure/{procedureId:long}")]
    public async Task<ActionResult<ApiResponse<UnifiedStudyDetail>>> UpdateRisProcedure(
        long id, long procedureId, [FromBody] UpdateRisOrderProcedureRequest request)
    {
        var study = await _studyRepository.GetByIdAsync(id);
        if (study is null)
            return NotFound(ApiResponse<UnifiedStudyDetail>.Fail($"Study {id} not found."));

        var updated = await _risRepository.UpdateOrderProcedureAsync(procedureId, request);
        if (!updated)
            return BadRequest(ApiResponse<UnifiedStudyDetail>.Fail("No fields to update."));

        _logger.LogInformation("RIS procedure {ProcedureId} updated via study {StudyId}", procedureId, id);

        var refreshed = await _risRepository.GetUnifiedStudyDetailAsync(id);
        return Ok(ApiResponse<UnifiedStudyDetail>.Ok(refreshed!));
    }

    [HttpPost("{id:long}/link")]
    public async Task<ActionResult<ApiResponse<UnifiedStudyDetail>>> LinkStudy(
        long id, [FromBody] LinkStudyRequest request)
    {
        var study = await _studyRepository.GetByIdAsync(id);
        if (study is null)
            return NotFound(ApiResponse<UnifiedStudyDetail>.Fail($"Study {id} not found."));

        var linked = await _risRepository.LinkStudyToOrderAsync(id, request.OrderId);
        if (!linked)
            return BadRequest(ApiResponse<UnifiedStudyDetail>.Fail("Failed to link study to order."));

        _logger.LogInformation("Study {StudyId} linked to RIS order {OrderId}", id, request.OrderId);

        var refreshed = await _risRepository.GetUnifiedStudyDetailAsync(id);
        return Ok(ApiResponse<UnifiedStudyDetail>.Ok(refreshed!));
    }

    [HttpPost("{id:long}/unlink")]
    public async Task<ActionResult<ApiResponse<UnifiedStudyDetail>>> UnlinkStudy(long id)
    {
        var study = await _studyRepository.GetByIdAsync(id);
        if (study is null)
            return NotFound(ApiResponse<UnifiedStudyDetail>.Fail($"Study {id} not found."));

        var unlinked = await _risRepository.UnlinkStudyAsync(id);
        if (!unlinked)
            return BadRequest(ApiResponse<UnifiedStudyDetail>.Fail("Failed to unlink study."));

        _logger.LogInformation("Study {StudyId} unlinked from RIS orders", id);

        var refreshed = await _risRepository.GetUnifiedStudyDetailAsync(id);
        return Ok(ApiResponse<UnifiedStudyDetail>.Ok(refreshed!));
    }

    [HttpPost("{id:long}/merge-patient")]
    public async Task<ActionResult<ApiResponse<UnifiedStudyDetail>>> MergePatient(
        long id, [FromBody] PatientMergeRequest request)
    {
        var study = await _studyRepository.GetByIdAsync(id);
        if (study is null)
            return NotFound(ApiResponse<UnifiedStudyDetail>.Fail($"Study {id} not found."));

        try
        {
            await _risRepository.MergePatientAsync(request);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Patient merge failed for study {StudyId}", id);
            return BadRequest(ApiResponse<UnifiedStudyDetail>.Fail($"Patient merge failed: {ex.Message}"));
        }

        _logger.LogInformation(
            "Patient merge: {SourcePatient}/{SourceSite} → {TargetPatient}/{TargetSite} via study {StudyId}",
            request.SourcePatientId, request.SourceSiteCode,
            request.TargetPatientId, request.TargetSiteCode, id);

        var refreshed = await _risRepository.GetUnifiedStudyDetailAsync(id);
        return Ok(ApiResponse<UnifiedStudyDetail>.Ok(refreshed!));
    }

    [HttpGet("{id:long}/ris-orders/search")]
    public async Task<ActionResult<ApiResponse<PagedResponse<RisOrder>>>> SearchRisOrders(
        long id, [FromQuery] SearchRisOrdersRequest request)
    {
        var study = await _studyRepository.GetByIdAsync(id);
        if (study is null)
            return NotFound(ApiResponse<PagedResponse<RisOrder>>.Fail($"Study {id} not found."));

        var result = await _risRepository.SearchOrdersForLinkingAsync(request);
        return Ok(ApiResponse<PagedResponse<RisOrder>>.Ok(result));
    }

    [HttpPost("{id:long}/sync-field")]
    public async Task<ActionResult<ApiResponse<UnifiedStudyDetail>>> SyncField(
        long id, [FromBody] SyncFieldRequest request)
    {
        var study = await _studyRepository.GetByIdAsync(id);
        if (study is null)
            return NotFound(ApiResponse<UnifiedStudyDetail>.Fail($"Study {id} not found."));

        var synced = await _risRepository.SyncFieldAsync(id, request);
        if (!synced)
            return BadRequest(ApiResponse<UnifiedStudyDetail>.Fail($"Failed to sync field '{request.FieldName}'."));

        _logger.LogInformation(
            "Field '{Field}' synced to {Target} for study {StudyId}",
            request.FieldName, request.Target, id);

        var refreshed = await _risRepository.GetUnifiedStudyDetailAsync(id);
        return Ok(ApiResponse<UnifiedStudyDetail>.Ok(refreshed!));
    }

    private static string CsvEscape(string? value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }
}

[ApiController]
[Route("api/v1/series")]
[Authorize]
public class SeriesController : ControllerBase
{
    private readonly StudyRepository _studyRepository;

    public SeriesController(StudyRepository studyRepository)
    {
        _studyRepository = studyRepository;
    }

    [HttpGet("{seriesId:long}/datasets")]
    public async Task<ActionResult<ApiResponse<List<Dataset>>>> GetDatasets(long seriesId)
    {
        var datasets = await _studyRepository.GetDatasetsAsync(seriesId);
        return Ok(ApiResponse<List<Dataset>>.Ok(datasets));
    }
}
