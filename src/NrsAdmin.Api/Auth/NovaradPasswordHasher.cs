using System.Security.Cryptography;
using System.Text;

namespace NrsAdmin.Api.Auth;

/// <summary>
/// Verifies passwords against Novarad's shared.users table.
/// password_format column determines the algorithm:
///   0 = Clear text (legacy)
///   1 = SHA1 with salt
///   2 = SHA256 with salt
/// </summary>
public class NovaradPasswordHasher
{
    public bool VerifyPassword(string inputPassword, string storedHash, string? salt, int? passwordFormat)
    {
        return passwordFormat switch
        {
            0 => VerifyClearText(inputPassword, storedHash),
            1 => VerifySha1(inputPassword, storedHash, salt),
            2 => VerifySha256(inputPassword, storedHash, salt),
            _ => VerifySha256(inputPassword, storedHash, salt) // Default to SHA256
        };
    }

    private static bool VerifyClearText(string input, string stored)
    {
        return string.Equals(input, stored, StringComparison.Ordinal);
    }

    private static bool VerifySha1(string input, string storedHash, string? salt)
    {
        var salted = string.IsNullOrEmpty(salt) ? input : input + salt;
        var bytes = Encoding.UTF8.GetBytes(salted);
        var hash = SHA1.HashData(bytes);
        var hashString = Convert.ToBase64String(hash);
        return string.Equals(hashString, storedHash, StringComparison.Ordinal);
    }

    private static bool VerifySha256(string input, string storedHash, string? salt)
    {
        var salted = string.IsNullOrEmpty(salt) ? input : input + salt;
        var bytes = Encoding.UTF8.GetBytes(salted);
        var hash = SHA256.HashData(bytes);
        var hashString = Convert.ToBase64String(hash);
        return string.Equals(hashString, storedHash, StringComparison.Ordinal);
    }
}
