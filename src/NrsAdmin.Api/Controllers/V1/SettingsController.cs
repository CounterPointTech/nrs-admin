using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/settings")]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly SettingsRepository _settingsRepository;

    public SettingsController(SettingsRepository settingsRepository)
    {
        _settingsRepository = settingsRepository;
    }

    // ============== Unified ==============

    [HttpGet("all")]
    public async Task<ActionResult<ApiResponse<List<UnifiedSettingResponse>>>> GetAllSettings()
    {
        var settings = await _settingsRepository.GetAllUnifiedSettingsAsync();
        return Ok(ApiResponse<List<UnifiedSettingResponse>>.Ok(settings));
    }

    [HttpGet("overview")]
    public async Task<ActionResult<ApiResponse<SettingsOverviewResponse>>> GetOverview()
    {
        var overview = await _settingsRepository.GetOverviewAsync();
        return Ok(ApiResponse<SettingsOverviewResponse>.Ok(overview));
    }

    // ============== Shared Settings ==============

    [HttpGet("shared")]
    public async Task<ActionResult<ApiResponse<List<Setting>>>> GetSharedSettings([FromQuery] string? search)
    {
        var settings = await _settingsRepository.GetAllSharedSettingsAsync(search);
        return Ok(ApiResponse<List<Setting>>.Ok(settings));
    }

    [HttpGet("shared/{name}")]
    public async Task<ActionResult<ApiResponse<Setting>>> GetSharedSetting(string name)
    {
        var setting = await _settingsRepository.GetSharedSettingByNameAsync(name);
        if (setting == null)
            return NotFound(ApiResponse<Setting>.Fail($"Setting '{name}' not found"));

        return Ok(ApiResponse<Setting>.Ok(setting));
    }

    [HttpPut("shared/{name}")]
    public async Task<ActionResult<ApiResponse<Setting>>> UpdateSharedSetting(string name, [FromBody] UpdateSettingRequest request)
    {
        var updated = await _settingsRepository.UpdateSharedSettingAsync(name, request.Value);
        if (!updated)
            return NotFound(ApiResponse<Setting>.Fail($"Setting '{name}' not found"));

        var setting = await _settingsRepository.GetSharedSettingByNameAsync(name);
        return Ok(ApiResponse<Setting>.Ok(setting!));
    }

    // ============== Site Settings ==============

    [HttpGet("site")]
    public async Task<ActionResult<ApiResponse<List<SiteSetting>>>> GetSiteSettings([FromQuery] string? search)
    {
        var settings = await _settingsRepository.GetAllSiteSettingsAsync(search);
        return Ok(ApiResponse<List<SiteSetting>>.Ok(settings));
    }

    [HttpGet("site/{name}")]
    public async Task<ActionResult<ApiResponse<SiteSetting>>> GetSiteSetting(string name)
    {
        var setting = await _settingsRepository.GetSiteSettingByNameAsync(name);
        if (setting == null)
            return NotFound(ApiResponse<SiteSetting>.Fail($"Setting '{name}' not found"));

        return Ok(ApiResponse<SiteSetting>.Ok(setting));
    }

    [HttpPut("site/{name}")]
    public async Task<ActionResult<ApiResponse<SiteSetting>>> UpdateSiteSetting(string name, [FromBody] UpdateSettingRequest request)
    {
        var updated = await _settingsRepository.UpdateSiteSettingAsync(name, request.Value);
        if (!updated)
            return NotFound(ApiResponse<SiteSetting>.Fail($"Setting '{name}' not found"));

        var setting = await _settingsRepository.GetSiteSettingByNameAsync(name);
        return Ok(ApiResponse<SiteSetting>.Ok(setting!));
    }

    // ============== PACS Settings ==============

    [HttpGet("pacs/{name}")]
    public async Task<ActionResult<ApiResponse<SimpleSetting>>> GetPacsSetting(string name)
    {
        var setting = await _settingsRepository.GetPacsSettingByNameAsync(name);
        if (setting == null)
            return NotFound(ApiResponse<SimpleSetting>.Fail($"PACS setting '{name}' not found"));
        return Ok(ApiResponse<SimpleSetting>.Ok(setting));
    }

    [HttpPut("pacs/{name}")]
    public async Task<ActionResult<ApiResponse<SimpleSetting>>> UpdatePacsSetting(string name, [FromBody] UpdateSettingRequest request)
    {
        var updated = await _settingsRepository.UpdatePacsSettingAsync(name, request.Value);
        if (!updated)
            return NotFound(ApiResponse<SimpleSetting>.Fail($"PACS setting '{name}' not found"));
        var setting = await _settingsRepository.GetPacsSettingByNameAsync(name);
        return Ok(ApiResponse<SimpleSetting>.Ok(setting!));
    }

    // ============== RIS Settings ==============

    [HttpGet("ris/{name}")]
    public async Task<ActionResult<ApiResponse<SimpleSetting>>> GetRisSetting(string name)
    {
        var setting = await _settingsRepository.GetRisSettingByNameAsync(name);
        if (setting == null)
            return NotFound(ApiResponse<SimpleSetting>.Fail($"RIS setting '{name}' not found"));
        return Ok(ApiResponse<SimpleSetting>.Ok(setting));
    }

    [HttpPut("ris/{name}")]
    public async Task<ActionResult<ApiResponse<SimpleSetting>>> UpdateRisSetting(string name, [FromBody] UpdateSettingRequest request)
    {
        var updated = await _settingsRepository.UpdateRisSettingAsync(name, request.Value);
        if (!updated)
            return NotFound(ApiResponse<SimpleSetting>.Fail($"RIS setting '{name}' not found"));
        var setting = await _settingsRepository.GetRisSettingByNameAsync(name);
        return Ok(ApiResponse<SimpleSetting>.Ok(setting!));
    }

    // ============== Object Store Settings ==============

    [HttpGet("object-store/{name}")]
    public async Task<ActionResult<ApiResponse<SimpleSetting>>> GetObjectStoreSetting(string name)
    {
        var setting = await _settingsRepository.GetObjectStoreSettingByNameAsync(name);
        if (setting == null)
            return NotFound(ApiResponse<SimpleSetting>.Fail($"Object Store setting '{name}' not found"));
        return Ok(ApiResponse<SimpleSetting>.Ok(setting));
    }

    [HttpPut("object-store/{name}")]
    public async Task<ActionResult<ApiResponse<SimpleSetting>>> UpdateObjectStoreSetting(string name, [FromBody] UpdateSettingRequest request)
    {
        var updated = await _settingsRepository.UpdateObjectStoreSettingAsync(name, request.Value);
        if (!updated)
            return NotFound(ApiResponse<SimpleSetting>.Fail($"Object Store setting '{name}' not found"));
        var setting = await _settingsRepository.GetObjectStoreSettingByNameAsync(name);
        return Ok(ApiResponse<SimpleSetting>.Ok(setting!));
    }

    // ============== PACS Options ==============

    [HttpGet("pacs-options/{name}")]
    public async Task<ActionResult<ApiResponse<SimpleSetting>>> GetPacsOption(string name)
    {
        var setting = await _settingsRepository.GetPacsOptionByNameAsync(name);
        if (setting == null)
            return NotFound(ApiResponse<SimpleSetting>.Fail($"PACS option '{name}' not found"));
        return Ok(ApiResponse<SimpleSetting>.Ok(setting));
    }

    [HttpPut("pacs-options/{name}")]
    public async Task<ActionResult<ApiResponse<SimpleSetting>>> UpdatePacsOption(string name, [FromBody] UpdateSettingRequest request)
    {
        var updated = await _settingsRepository.UpdatePacsOptionAsync(name, request.Value);
        if (!updated)
            return NotFound(ApiResponse<SimpleSetting>.Fail($"PACS option '{name}' not found"));
        var setting = await _settingsRepository.GetPacsOptionByNameAsync(name);
        return Ok(ApiResponse<SimpleSetting>.Ok(setting!));
    }

    // ============== RIS Options ==============

    [HttpGet("ris-options/{name}")]
    public async Task<ActionResult<ApiResponse<SimpleSetting>>> GetRisOption(string name)
    {
        var setting = await _settingsRepository.GetRisOptionByNameAsync(name);
        if (setting == null)
            return NotFound(ApiResponse<SimpleSetting>.Fail($"RIS option '{name}' not found"));
        return Ok(ApiResponse<SimpleSetting>.Ok(setting));
    }

    [HttpPut("ris-options/{name}")]
    public async Task<ActionResult<ApiResponse<SimpleSetting>>> UpdateRisOption(string name, [FromBody] UpdateSettingRequest request)
    {
        var updated = await _settingsRepository.UpdateRisOptionAsync(name, request.Value);
        if (!updated)
            return NotFound(ApiResponse<SimpleSetting>.Fail($"RIS option '{name}' not found"));
        var setting = await _settingsRepository.GetRisOptionByNameAsync(name);
        return Ok(ApiResponse<SimpleSetting>.Ok(setting!));
    }
}

public class UpdateSettingRequest
{
    public string? Value { get; set; }
}
