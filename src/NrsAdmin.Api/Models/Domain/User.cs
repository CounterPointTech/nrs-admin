namespace NrsAdmin.Api.Models.Domain;

public class User
{
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Password { get; set; }
    public string? PasswordSalt { get; set; }
    public int? PasswordFormat { get; set; }
    public bool UseAdAuthentication { get; set; }
    public bool IsLdapUser { get; set; }
    public string? Domain { get; set; }
    public bool AccountIsLocked { get; set; }
}
