using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Foxel.Models.DataBase;
using Foxel.Services.Interface;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Foxel.Models.Request.Auth;
using static Foxel.Utils.AuthHelper;

namespace Foxel.Services;

public class AuthService(IDbContextFactory<MyDbContext> dbContextFactory, IConfigService configuration)
    : IAuthService
{
    public async Task<(bool success, string message, User? user)> RegisterUserAsync(RegisterRequest request)
    {
        await using var context = await dbContextFactory.CreateDbContextAsync();
        var existingUser = await context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (existingUser != null)
        {
            return (false, "该邮箱已被注册", null);
        }

        existingUser = await context.Users.FirstOrDefaultAsync(u => u.UserName == request.UserName);
        if (existingUser != null)
        {
            return (false, "该用户名已被使用", null);
        }

        var user = new User
        {
            UserName = request.UserName,
            Email = request.Email,
            PasswordHash = HashPassword(request.Password),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return (true, "用户注册成功", user);
    }

    public async Task<(bool success, string message, User? user)> AuthenticateUserAsync(LoginRequest request)
    {
        await using var context = await dbContextFactory.CreateDbContextAsync();
        var user = await context.Users.Include(x => x.Role).FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null)
        {
            return (false, "用户不存在", null);
        }

        if (!VerifyPassword(request.Password, user.PasswordHash))
        {
            return (false, "密码错误", null);
        }

        return (true, "登录成功", user);
    }

    public Task<string> GenerateJwtTokenAsync(User user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.UserName)
        };
        if (user.Role != null)
        {
            claims.Add(new Claim(ClaimTypes.Role, user.Role.Name));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:SecretKey"] ??
                                                                  throw new InvalidOperationException(
                                                                      "JWT Secret key not found")));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.AddYears(1);
        var token = new JwtSecurityToken(
            issuer: configuration["Jwt:Issuer"],
            audience: configuration["Jwt:Audience"],
            claims: claims,
            expires: expires,
            signingCredentials: creds
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        return Task.FromResult(tokenString);
    }

    public async Task<User?> GetUserByIdAsync(int userId)
    {
        await using var context = await dbContextFactory.CreateDbContextAsync();
        return await context.Users.Include(x => x.Role).FirstOrDefaultAsync(u => u.Id == userId);
    }

    public async Task<(bool success, string message, User? user)> FindOrCreateGitHubUserAsync(
        string githubId, string? githubName, string? email)
    {
        if (string.IsNullOrEmpty(email))
        {
            return (false, "GitHub账号未提供邮箱地址", null);
        }

        await using var context = await dbContextFactory.CreateDbContextAsync();

        var user = await context.Users.Include(x => x.Role).FirstOrDefaultAsync(u => u.Email == email);

        if (user == null)
        {
            user = new User
            {
                UserName = $"{githubName}",
                Email = email,
                PasswordHash = HashPassword(Guid.NewGuid().ToString()),
                GithubId = githubId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();
            return (true, "GitHub用户注册成功", user);
        }

        if (string.IsNullOrEmpty(user.GithubId))
        {
            user.GithubId = githubId;
            user.UpdatedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();
        }

        return (true, "GitHub用户登录成功", user);
    }

    public async Task<(bool success, string message, User? user)> UpdateUserInfoAsync(int userId, UpdateUserRequest request)
    {
        await using var context = await dbContextFactory.CreateDbContextAsync();
        var user = await context.Users.Include(x => x.Role).FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            return (false, "用户不存在", null);
        }

        // 检查用户名是否已存在
        if (!string.IsNullOrEmpty(request.UserName) && request.UserName != user.UserName)
        {
            var existingUserName = await context.Users.AnyAsync(u => u.UserName == request.UserName);
            if (existingUserName)
            {
                return (false, "该用户名已被使用", null);
            }
            user.UserName = request.UserName;
        }

        // 检查邮箱是否已存在
        if (!string.IsNullOrEmpty(request.Email) && request.Email != user.Email)
        {
            var existingEmail = await context.Users.AnyAsync(u => u.Email == request.Email);
            if (existingEmail)
            {
                return (false, "该邮箱已被注册", null);
            }
            user.Email = request.Email;
        }

        // 如果要修改密码，验证当前密码
        if (!string.IsNullOrEmpty(request.NewPassword))
        {
            if (string.IsNullOrEmpty(request.CurrentPassword))
            {
                return (false, "需要提供当前密码", null);
            }

            if (!VerifyPassword(request.CurrentPassword, user.PasswordHash))
            {
                return (false, "当前密码不正确", null);
            }

            user.PasswordHash = HashPassword(request.NewPassword);
        }

        user.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();

        return (true, "用户信息更新成功", user);
    }

    public string GetGitHubLoginUrl()
    {
        string githubClientId = configuration["Authentication:GitHubClientId"];
        string githubCallback = configuration["Authentication:GitHubCallbackUrl"];
        return $"https://github.com/login/oauth/authorize?client_id={Uri.EscapeDataString(githubClientId)}&redirect_uri={Uri.EscapeDataString(githubCallback)}";
    }

    public async Task<(bool success, string message, string? token)> ProcessGitHubCallbackAsync(string code)
    {
        if (string.IsNullOrEmpty(code))
        {
            return (false, "GitHub授权码无效", null);
        }

        string githubClientId = configuration["Authentication:GitHubClientId"];
        string githubClientSecret = configuration["Authentication:GitHubClientSecret"];
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
            return (false, $"获取GitHub访问令牌失败: {errorContent}", null);
        }

        var tokenResponseContent = await tokenResponse.Content.ReadAsStringAsync();
        var tokenJson = System.Text.Json.JsonDocument.Parse(tokenResponseContent);

        if (!tokenJson.RootElement.TryGetProperty("access_token", out var accessTokenElement) ||
            accessTokenElement.GetString() == null)
        {
            Console.WriteLine($"GitHub响应中未找到access_token: {tokenResponseContent}");
            return (false, "获取GitHub访问令牌失败，响应中未包含令牌。", null);
        }

        var accessToken = accessTokenElement.GetString();

        httpClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

        var userResponse = await httpClient.GetAsync(githubUserApiUrl);
        if (!userResponse.IsSuccessStatusCode)
        {
            var errorContent = await userResponse.Content.ReadAsStringAsync();
            Console.WriteLine($"获取GitHub用户信息失败: {userResponse.StatusCode}, {errorContent}");
            return (false, $"获取GitHub用户信息失败: {errorContent}", null);
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
            return (false, "无法从GitHub获取用户ID", null);
        }

        var (isSuccess, message, user) = await FindOrCreateGitHubUserAsync(githubUserId, name ?? loginName, email);
        
        if (!isSuccess || user == null)
        {
            Console.WriteLine($"创建或查找GitHub用户失败: {message}");
            return (false, message, null);
        }

        var jwtToken = await GenerateJwtTokenAsync(user);
        return (true, "GitHub授权成功", jwtToken);
    }
}