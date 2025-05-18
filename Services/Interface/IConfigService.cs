using Foxel.Models.DataBase;

namespace Foxel.Services.Interface;

public interface IConfigService
{
    string this[string key] { get; }
    
    Task<string?> GetValueAsync(string key);
    Task<T?> GetValueAsync<T>(string key, T? defaultValue = default);
    Task<Config?> GetConfigAsync(string key);
    Task<List<Config>> GetAllConfigsAsync();
    
    Task<Config> SetConfigAsync(string key, string value, string? description = null);
    
    Task<bool> DeleteConfigAsync(string key);
    
    Task<bool> ExistsAsync(string key);
}
