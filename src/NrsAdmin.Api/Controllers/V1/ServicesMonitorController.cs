using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Services;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/services-monitor")]
[Authorize]
public class ServicesMonitorController : ControllerBase
{
    private readonly ServicesMonitorService _service;
    private readonly ILogger<ServicesMonitorController> _logger;

    public ServicesMonitorController(ServicesMonitorService service, ILogger<ServicesMonitorController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpGet]
    public ActionResult<ApiResponse<ServicesSnapshot>> Get()
    {
        var snapshot = _service.GetSnapshot();
        return Ok(ApiResponse<ServicesSnapshot>.Ok(snapshot));
    }

    [HttpPost("{name}/start")]
    public ActionResult<ApiResponse<ServiceInfo>> Start(string name) =>
        Control(name, ServicesMonitorService.ServiceAction.Start);

    [HttpPost("{name}/stop")]
    public ActionResult<ApiResponse<ServiceInfo>> Stop(string name) =>
        Control(name, ServicesMonitorService.ServiceAction.Stop);

    [HttpPost("{name}/restart")]
    public ActionResult<ApiResponse<ServiceInfo>> Restart(string name) =>
        Control(name, ServicesMonitorService.ServiceAction.Restart);

    private ActionResult<ApiResponse<ServiceInfo>> Control(string name, ServicesMonitorService.ServiceAction action)
    {
        var user = User.FindFirst(ClaimTypes.Name)?.Value ?? "unknown";
        _logger.LogInformation("Service control requested — user {User} action {Action} service {Name}", user, action, name);

        var result = _service.Control(name, action);
        if (result.Success && result.ServiceInfo is not null)
            return Ok(ApiResponse<ServiceInfo>.Ok(result.ServiceInfo, $"{action} succeeded."));

        return BadRequest(ApiResponse.Fail(result.Error ?? $"{action} failed."));
    }
}
