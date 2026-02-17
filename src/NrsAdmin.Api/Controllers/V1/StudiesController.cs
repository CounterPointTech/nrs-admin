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

    [HttpGet("{studyId:long}/series")]
    public async Task<ActionResult<ApiResponse<List<Series>>>> GetSeries(long studyId)
    {
        // Verify study exists
        var study = await _studyRepository.GetByIdAsync(studyId);
        if (study is null)
            return NotFound(ApiResponse<List<Series>>.Fail($"Study {studyId} not found."));

        var series = await _studyRepository.GetSeriesAsync(studyId);
        return Ok(ApiResponse<List<Series>>.Ok(series));
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
