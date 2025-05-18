using System.Security.Claims;
using Foxel.Models;
using Foxel.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Foxel.Models.Request.Auth;
using Foxel.Models.Response.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace Foxel.Controllers;

[Route("api/auth")]
public class AuthController(IUserService userService) : BaseApiController
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
    public IActionResult GitHubLogin(string returnUrl = "/")
    {
        try
        {
            var properties = new AuthenticationProperties
            { 
                RedirectUri = Url.Action("GitHubCallback", new { returnUrl }),
                Items = { { "returnUrl", returnUrl } },
                // 添加超时设置
                AllowRefresh = true,
                ExpiresUtc = DateTimeOffset.UtcNow.AddMinutes(10),
                IsPersistent = false
            };
            return Challenge(properties, "GitHub");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"GitHub登录异常: {ex}");
            return Redirect("/login?error=github_login_error");
        }
    }

    [HttpGet("github/callback")]
    public async Task<IActionResult> GitHubCallback(string returnUrl = "/")
    {
        try
        {
            var authenticateResult = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            if (!authenticateResult.Succeeded)
            {
                Console.WriteLine("GitHub认证失败: 无法获取认证结果");
                return Redirect("/login?error=github_auth_failed");
            }
            // 获取GitHub用户信息
            var githubId = authenticateResult.Principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var githubLogin = authenticateResult.Principal.FindFirst("urn:github:login")?.Value;
            var githubEmail = authenticateResult.Principal.FindFirst(ClaimTypes.Email)?.Value;

            Console.WriteLine($"GitHub用户信息: ID={githubId}, Login={githubLogin}, Email={githubEmail}");

            if (string.IsNullOrEmpty(githubId) || string.IsNullOrEmpty(githubLogin))
            {
                return Redirect("/login?error=github_missing_info");
            }

            // 登出Cookie认证会话
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

            // 查找或创建用户
            var (success, message, user) = await userService.FindOrCreateGitHubUserAsync(
                githubId, githubLogin, githubEmail);
            
            if (!success || user == null)
            {
                return Redirect($"/login?error={Uri.EscapeDataString(message)}");
            }

            // 生成JWT令牌
            var token = await userService.GenerateJwtTokenAsync(user);
            
            // 重定向回前端，携带token参数
            return Redirect($"{returnUrl}?token={Uri.EscapeDataString(token)}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"GitHub回调处理异常: {ex}");
            return Redirect("/login?error=github_callback_error");
        }
    }
}