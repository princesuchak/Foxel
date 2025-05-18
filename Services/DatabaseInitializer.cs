using Foxel.Models.DataBase;
using Foxel.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace Foxel.Services;

public class DatabaseInitializer(
    IDbContextFactory<MyDbContext> contextFactory,
    IConfigService configService,
    ILogger<DatabaseInitializer> logger)
    : IDatabaseInitializer
{
    public async Task InitializeAsync()
    {
        logger.LogInformation("开始初始化数据库配置...");

        using var context = await contextFactory.CreateDbContextAsync();

        // 确保数据库已创建
        await context.Database.EnsureCreatedAsync();

        // 初始化JWT配置 -
        await EnsureConfigExistsAsync("Jwt:SecretKey", "ChAtPiCdEfAuLtSeCrEtKeY2023_Extended_Secure_Key");
        await EnsureConfigExistsAsync("Jwt:Issuer", "Foxel");
        await EnsureConfigExistsAsync("Jwt:Audience", "FoxelUsers");

        // 初始化GitHub认证配置
        await EnsureConfigExistsAsync("Authentication:GitHubClientId", "placeholder_replace_with_actual_github_client_id");
        await EnsureConfigExistsAsync("Authentication:GitHubClientSecret", "placeholder_replace_with_actual_github_client_secret");

        logger.LogInformation("数据库配置初始化完成");
    }

    private async Task EnsureConfigExistsAsync(string key, string value)
    {
        if (!await configService.ExistsAsync(key))
        {
            logger.LogInformation("创建配置项: {Key}", key);
            await configService.SetConfigAsync(key, value, $"自动创建的{key}配置");
        }
    }
}
