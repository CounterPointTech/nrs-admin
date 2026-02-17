namespace NrsAdmin.Api.Configuration;

public class LdapSettings
{
    /// <summary>Master toggle — when false, AD/LDAP users get a "not configured" message.</summary>
    public bool Enabled { get; set; }

    /// <summary>LDAP server hostname or IP (e.g., "dc01.hospital.local").</summary>
    public string? Server { get; set; }

    /// <summary>LDAP port. 389 = LDAP, 636 = LDAPS.</summary>
    public int Port { get; set; } = 389;

    /// <summary>Use LDAPS (TLS/SSL) for the connection.</summary>
    public bool UseSsl { get; set; }

    /// <summary>FQDN suffix for UPN bind (e.g., "hospital.local"). Combined with username to form user@hospital.local.</summary>
    public string? DomainSuffix { get; set; }

    /// <summary>Connection timeout in milliseconds.</summary>
    public int ConnectionTimeoutMs { get; set; } = 10_000;

    /// <summary>Validate the LDAP server's SSL certificate. Set to false only for development/testing.</summary>
    public bool ValidateSslCertificates { get; set; } = true;
}
