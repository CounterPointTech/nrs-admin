namespace NrsAdmin.Api.Configuration;

public class JwtSettings
{
    public string SecretKey { get; set; } = string.Empty;
    public string Issuer { get; set; } = "NrsAdmin";
    public string Audience { get; set; } = "NrsAdmin";
    public int ExpirationMinutes { get; set; } = 60;
    public int RefreshExpirationDays { get; set; } = 7;
}
