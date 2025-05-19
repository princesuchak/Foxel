using Foxel.Models;
using Foxel.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Foxel.Models.Request.Auth;
using Foxel.Models.Response.Auth;

namespace Foxel.Controllers;

[Route("api/auth")]
public class AuthController(IUserService userService, IConfigService configService) : BaseApiController
{
    [HttpPost("register")]
    public async Task<ActionResult<BaseResult<AuthResponse>>> Register([FromBody] RegisterRequest request)
    {
        if (!ModelState.IsValid)
        {
            return Error<AuthResponse>("请求数据无效");
        }

        var (success, message, user) = await userService.RegisterUserAsync(request);
        if (!success)
        {
            return Error<AuthResponse>(message);
        }

        var token = await userService.GenerateJwtTokenAsync(user!);
        var response = new AuthResponse
        {
            Token = token,
            User = new UserProfile
            {
                Id = user!.Id,
                UserName = user.UserName,
                Email = user.Email,
                RoleName = user.Role?.Name
            }
        };

        return Success(response, "注册成功");
    }

    [HttpPost("login")]
    public async Task<ActionResult<BaseResult<AuthResponse>>> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
        {
            return Error<AuthResponse>("请求数据无效");
        }

        var (success, message, user) = await userService.AuthenticateUserAsync(request);
        if (!success)
        {
            return Error<AuthResponse>(message, 401);
        }

        var token = await userService.GenerateJwtTokenAsync(user!);
        var response = new AuthResponse
        {
            Token = token,
            User = new UserProfile
            {
                Id = user!.Id,
                UserName = user.UserName,
                Email = user.Email,
                RoleName = user.Role?.Name
            }
        };

        return Success(response, "登录成功");
    }

    [HttpGet("get_current_user")]
    [Authorize]
    public async Task<ActionResult<BaseResult<UserProfile>>> GetCurrentUser()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Error<UserProfile>("用户ID未找到");
        }

        var user = await userService.GetUserByIdAsync(userId.Value);
        if (user == null)
        {
            return Error<UserProfile>("未找到用户信息", 404);
        }

        var profile = new UserProfile
        {
            Id = userId.Value,
            Email = user.Email,
            UserName = user.UserName,
            RoleName = user.Role?.Name
        };

        return Success(profile);
    }

    [HttpGet("github/login")]
    public IActionResult GitHubLogin()
    {
        string githubClientId = configService["Authentication:GitHubClientId"];
        string githubCallback = configService["Authentication:GitHubRedirectUri"];
        string githubAuthorizeUrl =
            $"https://github.com/login/oauth/authorize?client_id={Uri.EscapeDataString(githubClientId)}&redirect_uri={Uri.EscapeDataString(githubCallback)}";
        return Redirect(githubAuthorizeUrl);
    }

    [HttpGet("github/callback")]
    public async Task<ActionResult<BaseResult<string>>> GitHubCallback(string code)
    {
        if (string.IsNullOrEmpty(code))
        {
            return Error<string>("GitHub授权码无效");
        }

        string githubClientId = configService["Authentication:GitHubClientId"];
        string githubClientSecret = configService["Authentication:GitHubClientSecret"];
        string githubTokenUrl = "https://github.com/login/oauth/access_token";
        string githubUserApiUrl = "https://api.github.com/user";

        using var httpClient = new HttpClient();
        httpClient.DefaultRequestHeaders.Add("User-Agent", "Foxel");
        httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
        var tokenRequestUrl =
            $"{githubTokenUrl}?client_id={Uri.EscapeDataString(githubClientId)}&client_secret={Uri.EscapeDataString(githubClientSecret)}&code={Uri.EscapeDataString(code)}";
        var tokenResponse = await httpClient.PostAsync(tokenRequestUrl, null);

        if (!tokenResponse.IsSuccessStatusCode)
        {
            var errorContent = await tokenResponse.Content.ReadAsStringAsync();
            Console.WriteLine($"获取GitHub访问令牌失败: {tokenResponse.StatusCode}, {errorContent}");
            return Error<string>($"获取GitHub访问令牌失败: {errorContent}", (int)tokenResponse.StatusCode);
        }

        var tokenResponseContent = await tokenResponse.Content.ReadAsStringAsync();
        var tokenJson = System.Text.Json.JsonDocument.Parse(tokenResponseContent);

        if (!tokenJson.RootElement.TryGetProperty("access_token", out var accessTokenElement) ||
            accessTokenElement.GetString() == null)
        {
            Console.WriteLine($"GitHub响应中未找到access_token: {tokenResponseContent}");
            return Error<string>("获取GitHub访问令牌失败，响应中未包含令牌。");
        }

        var accessToken = accessTokenElement.GetString();

        httpClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

        var userResponse = await httpClient.GetAsync(githubUserApiUrl);
        if (!userResponse.IsSuccessStatusCode)
        {
            var errorContent = await userResponse.Content.ReadAsStringAsync();
            Console.WriteLine($"获取GitHub用户信息失败: {userResponse.StatusCode}, {errorContent}");
            return Error<string>($"获取GitHub用户信息失败: {errorContent}", (int)userResponse.StatusCode);
        }

        var userContent = await userResponse.Content.ReadAsStringAsync();
        var userJson = System.Text.Json.JsonDocument.Parse(userContent);

        string? githubUserId = null;
        string? email = null;
        string? name = null;
        string? loginName = null;

        if (userJson.RootElement.TryGetProperty("id", out var idElement))
        {
            githubUserId = idElement.GetInt64().ToString();
        }

        if (userJson.RootElement.TryGetProperty("email", out var emailElement))
        {
            email = emailElement.GetString();
        }

        if (userJson.RootElement.TryGetProperty("name", out var nameElement))
        {
            name = nameElement.GetString();
        }

        if (userJson.RootElement.TryGetProperty("login", out var loginElement))
        {
            loginName = loginElement.GetString();
        }

        if (string.IsNullOrEmpty(githubUserId))
        {
            return Error<string>("无法从GitHub获取用户ID");
        }


        var (isSuccess, message, user) =
            await userService.FindOrCreateGitHubUserAsync(githubUserId, name ?? loginName, email);

        if (!isSuccess || user == null)
        {
            Console.WriteLine($"创建或查找GitHub用户失败: {message}");
            return Redirect(
                $"/login?error=github_user_creation_failed&message={Uri.EscapeDataString(message)}");
        }

        var token = await userService.GenerateJwtTokenAsync(user);
        return Redirect($"/login?token={Uri.EscapeDataString(token)}");
    }
}