using Foxel.Models;
using Foxel.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Foxel.Models.Request.Auth;
using Foxel.Models.Response.Auth;

namespace Foxel.Controllers;

[Route("api/auth")]
public class AuthController(IAuthService authService, IConfigService configService) : BaseApiController
{
    [HttpPost("register")]
    public async Task<ActionResult<BaseResult<AuthResponse>>> Register([FromBody] RegisterRequest request)
    {
        if (!ModelState.IsValid)
        {
            return Error<AuthResponse>("请求数据无效");
        }

        var (success, message, user) = await authService.RegisterUserAsync(request);
        if (!success)
        {
            return Error<AuthResponse>(message);
        }

        var token = await authService.GenerateJwtTokenAsync(user!);
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

        var (success, message, user) = await authService.AuthenticateUserAsync(request);
        if (!success)
        {
            return Error<AuthResponse>(message, 401);
        }

        var token = await authService.GenerateJwtTokenAsync(user!);
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

        var user = await authService.GetUserByIdAsync(userId.Value);
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
        string githubAuthorizeUrl = authService.GetGitHubLoginUrl();
        return Redirect(githubAuthorizeUrl);
    }

    [HttpGet("github/callback")]
    public async Task<ActionResult<BaseResult<string>>> GitHubCallback(string code)
    {
        var (success, message, token) = await authService.ProcessGitHubCallbackAsync(code);
        
        if (!success || token == null)
        {
            return Redirect($"/login?error=github_auth_failed&message={Uri.EscapeDataString(message)}");
        }
        
        return Redirect($"/login?token={Uri.EscapeDataString(token)}");
    }

    [HttpPut("update")]
    [Authorize]
    public async Task<ActionResult<BaseResult<UserProfile>>> UpdateUserInfo([FromBody] UpdateUserRequest request)
    {
        if (!ModelState.IsValid)
        {
            return Error<UserProfile>("请求数据无效");
        }
        
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Error<UserProfile>("用户ID未找到");
        }

        var (success, message, user) = await authService.UpdateUserInfoAsync(userId.Value, request);
        if (!success || user == null)
        {
            return Error<UserProfile>(message);
        }

        var profile = new UserProfile
        {
            Id = user.Id,
            Email = user.Email,
            UserName = user.UserName,
            RoleName = user.Role?.Name
        };

        return Success(profile, "用户信息更新成功");
    }
}