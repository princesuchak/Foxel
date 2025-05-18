using System.Text;
namespace Foxel.Utils;
using System.Security.Cryptography;

public static class AuthHelper
{
    public static string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(hashedBytes);
    }

    public static bool VerifyPassword(string password, string storedHash)
    {
        var hashedPassword = HashPassword(password);
        return hashedPassword == storedHash;
    }
}