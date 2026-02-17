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
    private readonly ILogger<StudiesController> _logger;

    public StudiesController(StudyRepository studyRepository, ILogger<StudiesController> logger)
    {
        _studyRepository = studyRepository;
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
