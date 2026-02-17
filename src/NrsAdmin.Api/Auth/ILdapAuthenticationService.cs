namespace NrsAdmin.Api.Auth;

public interface ILdapAuthenticationService
{
    Task<LdapAuthResult> AuthenticateAsync(string username, string? userDomain, string password);
}

public record LdapAuthResult(bool Success, string? ErrorMessage = null);
