using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Services;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request.Username, request.Password);
        if (!result.Success)
            return Unauthorized(result);

        return Ok(result);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Refresh([FromBody] RefreshRequest request)
    {
        var result = await _authService.RefreshAsync(request.AccessToken, request.RefreshToken);
        if (!result.Success)
            return Unauthorized(result);

        return Ok(result);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<UserInfo>>> Me()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim is null || !int.TryParse(userIdClaim.Value, out var userId))
            return Unauthorized(ApiResponse<UserInfo>.Fail("Invalid token."));

        var result = await _authService.GetCurrentUserAsync(userId);
        if (!result.Success)
            return NotFound(result);

        return Ok(result);
    }
}
