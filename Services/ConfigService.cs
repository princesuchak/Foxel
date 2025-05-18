using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Foxel.Models.DataBase;
using Foxel.Services.Interface;
using System.Text.Json;

namespace Foxel.Services;

public class ConfigService(
    IDbContextFactory<MyDbContext> contextFactory,
    IMemoryCache memoryCache,
    ILogger<ConfigService> logger)
    : IConfigService
{
    // 缓存过期时间
    private readonly TimeSpan _cacheExpiration = TimeSpan.FromMinutes(30);

    public string this[string key] => GetValueAsync(key).GetAwaiter().GetResult() ?? string.Empty;

    public async Task<string?> GetValueAsync(string key)
    {
        // 尝试从缓存获取配置值
        if (memoryCache.TryGetValue($"config:{key}", out string? cachedValue))
        {
            return cachedValue;
        }

        // 如果缓存中没有，从数据库获取
        await using var context = await contextFactory.CreateDbContextAsync();
        var config = await context.Configs.FirstOrDefaultAsync(c => c.Key == key);

        if (config == null)
        {
            // 尝试从环境变量获取
            string? envVarKey = key.ToUpper().Replace(".", "_").Replace("-", "_");
            string? envVarValue = Environment.GetEnvironmentVariable(envVarKey);

            if (!string.IsNullOrEmpty(envVarValue))
            {
                memoryCache.Set($"config:{key}", envVarValue, _cacheExpiration);
                return envVarValue;
            }

            return null;
        }

        // 将配置值添加到缓存
        memoryCache.Set($"config:{key}", config.Value, _cacheExpiration);

        return config.Value;
    }

    public async Task<T?> GetValueAsync<T>(string key, T? defaultValue = default)
    {
        var value = await GetValueAsync(key);

        if (string.IsNullOrEmpty(value))
            return defaultValue;

        try
        {
            return JsonSerializer.Deserialize<T>(value);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "无法将配置值反序列化为所需类型: {Type}", typeof(T).Name);
            return defaultValue;
        }
    }

    public async Task<Config?> GetConfigAsync(string key)
    {
        await using var context = await contextFactory.CreateDbContextAsync();
        return await context.Configs.FirstOrDefaultAsync(c => c.Key == key);
    }

    public async Task<List<Config>> GetAllConfigsAsync()
    {
        await using var context = await contextFactory.CreateDbContextAsync();
        return await context.Configs.OrderBy(c => c.Key).ToListAsync();
    }

    public async Task<Config> SetConfigAsync(string key, string value, string? description = null)
    {
        if (string.IsNullOrWhiteSpace(key))
            throw new ArgumentException("配置键不能为空", nameof(key));

        await using var context = await contextFactory.CreateDbContextAsync();

        var config = await context.Configs.FirstOrDefaultAsync(c => c.Key == key);

        if (config == null)
        {
            // 创建新配置
            config = new Config
            {
                Key = key,
                Value = value,
                Description = description ?? string.Empty,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            context.Configs.Add(config);
        }
        else
        {
            // 更新现有配置
            config.Value = value;
            if (description != null)
            {
                config.Description = description;
            }
            config.UpdatedAt = DateTime.UtcNow;
        }
        await context.SaveChangesAsync();
        memoryCache.Set($"config:{key}", value, _cacheExpiration);
        return config;
    }

    public async Task<bool> DeleteConfigAsync(string key)
    {
        await using var context = await contextFactory.CreateDbContextAsync();

        var config = await context.Configs.FirstOrDefaultAsync(c => c.Key == key);
        if (config == null)
            return false;

        context.Configs.Remove(config);
        await context.SaveChangesAsync();
        memoryCache.Remove($"config:{key}");
        return true;
    }

    public async Task<bool> ExistsAsync(string key)
    {
        await using var context = await contextFactory.CreateDbContextAsync();
        return await context.Configs.AnyAsync(c => c.Key == key);
    }
}
