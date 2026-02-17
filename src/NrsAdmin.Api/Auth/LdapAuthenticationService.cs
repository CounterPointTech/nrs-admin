using System.DirectoryServices.Protocols;
using System.Net;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;

namespace NrsAdmin.Api.Auth;

public class LdapAuthenticationService : ILdapAuthenticationService
{
    private readonly IOptionsMonitor<LdapSettings> _settings;
    private readonly ILogger<LdapAuthenticationService> _logger;

    public LdapAuthenticationService(
        IOptionsMonitor<LdapSettings> settings,
        ILogger<LdapAuthenticationService> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    public async Task<LdapAuthResult> AuthenticateAsync(string username, string? userDomain, string password)
    {
        var settings = _settings.CurrentValue;

        if (!settings.Enabled)
        {
            _logger.LogInformation("LDAP authentication is disabled. User {Username} cannot authenticate via AD/LDAP", username);
            return new LdapAuthResult(false, "AD/LDAP authentication is not configured. Contact your administrator to enable LDAP settings.");
        }

        if (string.IsNullOrWhiteSpace(settings.Server))
        {
            _logger.LogWarning("LDAP server is not configured. Cannot authenticate user {Username}", username);
            return new LdapAuthResult(false, "AD/LDAP authentication is not configured. Contact your administrator to enable LDAP settings.");
        }

        var bindIdentity = BuildBindIdentity(username, userDomain, settings.DomainSuffix);
        if (bindIdentity is null)
        {
            _logger.LogWarning("Cannot determine LDAP bind identity for user {Username} (domain: {Domain}, suffix: {Suffix})",
                username, userDomain, settings.DomainSuffix);
            return new LdapAuthResult(false, "AD/LDAP authentication is not configured. Contact your administrator to enable LDAP settings.");
        }

        _logger.LogInformation("Attempting LDAP bind for user {Username} as {BindIdentity} against {Server}:{Port}",
            username, bindIdentity, settings.Server, settings.Port);

        // S.DS.P Bind() is synchronous — run on thread pool to avoid blocking
        return await Task.Run(() => PerformLdapBind(bindIdentity, password, settings));
    }

    private LdapAuthResult PerformLdapBind(string bindIdentity, string password, LdapSettings settings)
    {
        LdapConnection? connection = null;
        try
        {
            var directoryIdentifier = new LdapDirectoryIdentifier(settings.Server!, settings.Port);
            var credential = new NetworkCredential(bindIdentity, password);

            connection = new LdapConnection(directoryIdentifier, credential, AuthType.Basic)
            {
                AutoBind = false
            };

            connection.SessionOptions.ProtocolVersion = 3;
            connection.Timeout = TimeSpan.FromMilliseconds(settings.ConnectionTimeoutMs);

            if (settings.UseSsl)
            {
                connection.SessionOptions.SecureSocketLayer = true;
            }

            if (!settings.ValidateSslCertificates)
            {
                connection.SessionOptions.VerifyServerCertificate = (_, _) => true;
            }

            connection.Bind();

            _logger.LogInformation("LDAP bind succeeded for {BindIdentity} against {Server}:{Port}",
                bindIdentity, settings.Server, settings.Port);

            return new LdapAuthResult(true);
        }
        catch (LdapException ex) when (ex.ErrorCode == 49)
        {
            // Error 49 = invalid credentials
            _logger.LogWarning("LDAP bind failed for {BindIdentity}: invalid credentials (error 49)", bindIdentity);
            return new LdapAuthResult(false, "Invalid username or password.");
        }
        catch (LdapException ex)
        {
            _logger.LogError(ex, "LDAP error authenticating {BindIdentity} against {Server}:{Port} (error code {ErrorCode})",
                bindIdentity, settings.Server, settings.Port, ex.ErrorCode);
            return new LdapAuthResult(false, "Authentication service temporarily unavailable.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during LDAP authentication for {BindIdentity} against {Server}:{Port}",
                bindIdentity, settings.Server, settings.Port);
            return new LdapAuthResult(false, "Authentication service temporarily unavailable.");
        }
        finally
        {
            connection?.Dispose();
        }
    }

    private static string? BuildBindIdentity(string username, string? userDomain, string? configDomainSuffix)
    {
        // If the user's domain from DB looks like a FQDN (contains "."), use UPN format: user@domain.fqdn
        if (!string.IsNullOrWhiteSpace(userDomain) && userDomain.Contains('.'))
        {
            return $"{username}@{userDomain}";
        }

        // If a domain suffix is configured in settings, use UPN format: user@configured.suffix
        if (!string.IsNullOrWhiteSpace(configDomainSuffix))
        {
            return $"{username}@{configDomainSuffix}";
        }

        // If we have a short domain name (NetBIOS), use down-level format: DOMAIN\user
        if (!string.IsNullOrWhiteSpace(userDomain))
        {
            return $"{userDomain}\\{username}";
        }

        // No domain info available — cannot construct bind identity
        return null;
    }
}
