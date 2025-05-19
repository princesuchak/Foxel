using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Foxel.Models.DataBase;
using Foxel.Services.Interface;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Foxel.Models.Request;
using Foxel.Models.Request.Auth;
using static Foxel.Utils.AuthHelper;

namespace Foxel.Services;

public class UserService(IDbContextFactory<MyDbContext> dbContextFactory, IConfigService configuration)
    : IUserService
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

        var user = await context.Users.FirstOrDefaultAsync(u => u.Email == email);

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
}