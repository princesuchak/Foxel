using Foxel.Services.Interface;

namespace Foxel.Services.StorageProvider;

public class LocalStorageProvider(IConfigService config) : IStorageProvider
{
    private readonly string _baseDirectory = Path.Combine(Directory.GetCurrentDirectory(), "Uploads");
    private readonly string _serverUrl = config["AppSettings:ServerUrl"];

    public async Task<string> SaveAsync(Stream fileStream, string fileName, string contentType)
    {
        string currentDate = DateTime.Now.ToString("yyyy/MM");
        string folder = Path.Combine(_baseDirectory, currentDate);
        Directory.CreateDirectory(folder);

        string ext = Path.GetExtension(fileName);
        string newFileName = $"{Guid.NewGuid()}{ext}";
        string filePath = Path.Combine(folder, newFileName);

        await using var output = new FileStream(filePath, FileMode.Create);
        await fileStream.CopyToAsync(output);
        return $"/Uploads/{currentDate}/{newFileName}";
    }

    public Task DeleteAsync(string storagePath)
    {
        string fullPath = Path.Combine(Directory.GetCurrentDirectory(), storagePath.TrimStart('/'));
        if (File.Exists(fullPath))
            File.Delete(fullPath);
        return Task.CompletedTask;
    }

    public string GetUrl(string? storagePath)
    {
        if (string.IsNullOrEmpty(storagePath))
            return $"/images/unavailable.gif";
        return $"{_serverUrl}{storagePath}";
    }


    public Task<string> DownloadFileAsync(string storagePath)
    {
        string fullPath = Path.Combine(Directory.GetCurrentDirectory(), storagePath.TrimStart('/'));
        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException($"找不到文件: {fullPath}");
        }
        return Task.FromResult(fullPath);
    }
}