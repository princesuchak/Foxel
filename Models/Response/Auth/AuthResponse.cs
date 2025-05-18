namespace Foxel.Models.Response.Auth;

public class UserProfile
{
    public int Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? RoleName { get; set; }
}

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public UserProfile User { get; set; } = new();
}
