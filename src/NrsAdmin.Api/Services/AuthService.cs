using System.Collections.Concurrent;
using NrsAdmin.Api.Auth;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Services;

public class AuthService
{
    private readonly UserRepository _userRepository;
    private readonly NovaradPasswordHasher _passwordHasher;
    private readonly JwtTokenService _jwtTokenService;
    private readonly ILogger<AuthService> _logger;

    // In-memory refresh token store (keyed by userId → refreshToken + expiry)
    // In production, consider Redis or a DB table
    private static readonly ConcurrentDictionary<int, RefreshTokenEntry> RefreshTokens = new();

    public AuthService(
        UserRepository userRepository,
        NovaradPasswordHasher passwordHasher,
        JwtTokenService jwtTokenService,
        ILogger<AuthService> logger)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _logger = logger;
    }

    public async Task<ApiResponse<LoginResponse>> LoginAsync(string username, string password)
    {
        var user = await _userRepository.GetByUsernameAsync(username);
        if (user is null)
        {
            _logger.LogWarning("Login attempt for unknown user: {Username}", username);
            return ApiResponse<LoginResponse>.Fail("Invalid username or password.");
        }

        if (user.AccountIsLocked)
        {
            _logger.LogWarning("Login attempt for locked account: {Username}", username);
            return ApiResponse<LoginResponse>.Fail("Account is locked. Contact your administrator.");
        }

        if (user.UseAdAuthentication || user.IsLdapUser)
        {
            return ApiResponse<LoginResponse>.Fail("AD/LDAP authentication is not supported in NRS Admin. Use local credentials.");
        }

        var isValid = _passwordHasher.VerifyPassword(
            password,
            user.Password ?? string.Empty,
            user.PasswordSalt,
            user.PasswordFormat);

        if (!isValid)
        {
            _logger.LogWarning("Invalid password for user: {Username}", username);
            return ApiResponse<LoginResponse>.Fail("Invalid username or password.");
        }

        var roles = await _userRepository.GetUserRolesAsync(user.UserId);
        var accessToken = _jwtTokenService.GenerateAccessToken(user.UserId, user.UserName, roles);
        var refreshToken = _jwtTokenService.GenerateRefreshToken();

        RefreshTokens[user.UserId] = new RefreshTokenEntry(refreshToken, DateTime.UtcNow.AddDays(7));

        _logger.LogInformation("User {Username} logged in successfully", username);

        return ApiResponse<LoginResponse>.Ok(new LoginResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            User = new UserInfo
            {
                UserId = user.UserId,
                Username = user.UserName,
                DisplayName = $"{user.FirstName} {user.LastName}".Trim(),
                FirstName = user.FirstName,
                LastName = user.LastName,
                Roles = roles
            }
        });
    }

    public async Task<ApiResponse<LoginResponse>> RefreshAsync(string accessToken, string refreshToken)
    {
        var principal = _jwtTokenService.GetPrincipalFromExpiredToken(accessToken);
        if (principal is null)
            return ApiResponse<LoginResponse>.Fail("Invalid access token.");

        var userIdClaim = principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim is null || !int.TryParse(userIdClaim.Value, out var userId))
            return ApiResponse<LoginResponse>.Fail("Invalid token claims.");

        if (!RefreshTokens.TryGetValue(userId, out var stored) ||
            stored.Token != refreshToken ||
            stored.Expiry < DateTime.UtcNow)
        {
            return ApiResponse<LoginResponse>.Fail("Invalid or expired refresh token.");
        }

        var user = await _userRepository.GetByUsernameAsync(
            principal.Identity?.Name ?? string.Empty);

        if (user is null)
            return ApiResponse<LoginResponse>.Fail("User not found.");

        var roles = await _userRepository.GetUserRolesAsync(userId);
        var newAccessToken = _jwtTokenService.GenerateAccessToken(userId, user.UserName, roles);
        var newRefreshToken = _jwtTokenService.GenerateRefreshToken();

        RefreshTokens[userId] = new RefreshTokenEntry(newRefreshToken, DateTime.UtcNow.AddDays(7));

        return ApiResponse<LoginResponse>.Ok(new LoginResponse
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshToken,
            User = new UserInfo
            {
                UserId = user.UserId,
                Username = user.UserName,
                DisplayName = $"{user.FirstName} {user.LastName}".Trim(),
                FirstName = user.FirstName,
                LastName = user.LastName,
                Roles = roles
            }
        });
    }

    public async Task<ApiResponse<UserInfo>> GetCurrentUserAsync(int userId)
    {
        // Look up by ID - need to find username first from claims
        // For now, use a direct approach
        var user = await _userRepository.GetByUserIdAsync(userId);
        if (user is null)
            return ApiResponse<UserInfo>.Fail("User not found.");

        var roles = await _userRepository.GetUserRolesAsync(userId);

        return ApiResponse<UserInfo>.Ok(new UserInfo
        {
            UserId = user.UserId,
            Username = user.UserName,
            DisplayName = $"{user.FirstName} {user.LastName}".Trim(),
            FirstName = user.FirstName,
            LastName = user.LastName,
            Roles = roles
        });
    }

    private record RefreshTokenEntry(string Token, DateTime Expiry);
}
