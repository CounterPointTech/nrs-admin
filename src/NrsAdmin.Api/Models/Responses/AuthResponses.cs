namespace NrsAdmin.Api.Models.Responses;

public class LoginResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public UserInfo User { get; set; } = new();
}

public class UserInfo
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public List<string> Roles { get; set; } = [];
}
