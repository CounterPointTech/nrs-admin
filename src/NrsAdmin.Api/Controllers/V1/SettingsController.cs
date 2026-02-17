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
}

public class UpdateSettingRequest
{
    public string? Value { get; set; }
}
