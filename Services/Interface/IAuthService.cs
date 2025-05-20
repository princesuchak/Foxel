using Foxel.Models.DataBase;
using Foxel.Models.Request;
using Foxel.Models.Request.Auth;

namespace Foxel.Services.Interface;

public interface IAuthService
{
    Task<(bool success, string message, User? user)> RegisterUserAsync(RegisterRequest request);
    Task<(bool success, string message, User? user)> AuthenticateUserAsync(LoginRequest request);
    Task<string> GenerateJwtTokenAsync(User user);
    Task<User?> GetUserByIdAsync(int userId);
    Task<(bool success, string message, User? user)> FindOrCreateGitHubUserAsync(
        string githubId, string? githubName, string? email);
    Task<(bool success, string message, User? user)> UpdateUserInfoAsync(int userId, UpdateUserRequest request);
    string GetGitHubLoginUrl();
    Task<(bool success, string message, string? token)> ProcessGitHubCallbackAsync(string code);
}
