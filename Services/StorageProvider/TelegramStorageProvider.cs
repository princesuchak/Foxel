using Foxel.Services.Interface;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Foxel.Services.StorageProvider;

public class TelegramStorageProvider(IConfigService configService) : IStorageProvider
{
    private readonly string _botToken = configService["Storage:TelegramStorageBotToken"];
    private readonly string _chatId = configService["Storage:TelegramStorageChatId"];
    private readonly string _serverUrl = configService["AppSettings:ServerUrl"];

    public async Task<string> SaveAsync(Stream fileStream, string fileName, string contentType)
    {
        using var httpClient = new HttpClient();
        using var formData = new MultipartFormDataContent();
        formData.Add(new StringContent(_chatId), "chat_id");
        var safeFileName = Path.GetFileNameWithoutExtension(fileName);
        if (safeFileName.Length > 100)
            safeFileName = safeFileName.Substring(0, 100);
        formData.Add(new StringContent(safeFileName), "caption");

        using var memoryStream = new MemoryStream();
        await fileStream.CopyToAsync(memoryStream);
        memoryStream.Position = 0;

        var fileContent = new StreamContent(memoryStream);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);

        formData.Add(fileContent, "document", fileName);

        try
        {
            var response =
                await httpClient.PostAsync($"https://api.telegram.org/bot{_botToken}/sendDocument", formData);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Telegram API 请求失败: 状态码: {response.StatusCode}, 响应: {errorContent}");
                throw new ApplicationException($"Telegram API 请求失败: {response.StatusCode}");
            }

            var responseContent = await response.Content.ReadAsStringAsync();
            var responseObj = JsonSerializer.Deserialize<TelegramResponse>(responseContent);
            if (responseObj == null || !responseObj.Ok || responseObj.Result?.Document == null)
            {
                throw new ApplicationException($"上传文件到 Telegram 失败: {responseContent}");
            }

            var fileId = responseObj.Result.Document.FileId;

            var metadata = new TelegramFileMetadata
            {
                FileId = fileId,
                FileUniqueId = responseObj.Result.Document.FileUniqueId,
                MessageId = responseObj.Result.MessageId,
                ChatId = _chatId,
                OriginalFileName = fileName,
                UploadDate = DateTime.UtcNow,
                MimeType = contentType
            };
            return JsonSerializer.Serialize(metadata);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"发送文件到 Telegram 时出错: {ex.Message}");
            throw;
        }
    }

    public async Task DeleteAsync(string storagePath)
    {
        try
        {
            var metadata = JsonSerializer.Deserialize<TelegramFileMetadata>(storagePath);
            if (metadata == null || string.IsNullOrEmpty(metadata.ChatId) || metadata.MessageId <= 0)
            {
                return;
            }

            using var httpClient = new HttpClient();
            var url =
                $"https://api.telegram.org/bot{_botToken}/deleteMessage?chat_id={metadata.ChatId}&message_id={metadata.MessageId}";
            var response = await httpClient.GetAsync(url);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"删除 Telegram 文件时出错: {ex.Message}");
        }
    }

    public string GetUrl(string storagePath)
    {
        try
        {
            var metadata = JsonSerializer.Deserialize<TelegramFileMetadata>(storagePath);
            if (metadata == null || string.IsNullOrEmpty(metadata.FileId))
            {
                throw new ApplicationException("无效的存储路径或元数据");
            }

            return $"{_serverUrl}/api/picture/get_telegram_file?fileId={metadata.FileId}";
        }
        catch (Exception ex)
        {
            Console.WriteLine($"生成 Telegram 文件 URL 时出错: {ex.Message}");
            return $"/images/unavailable.gif";
        }
    }

    /// <summary>
    /// 下载Telegram文件到临时目录
    /// </summary>
    /// <param name="storagePath">存储的元数据JSON</param>
    /// <returns>临时文件的完整路径</returns>
    public async Task<string> DownloadFileAsync(string storagePath)
    {
        try
        {
            var metadata = JsonSerializer.Deserialize<TelegramFileMetadata>(storagePath);
            if (metadata == null || string.IsNullOrEmpty(metadata.FileId))
            {
                throw new ApplicationException("无效的存储路径或元数据");
            }

            using var httpClient = new HttpClient();
            var getFileUrl = $"https://api.telegram.org/bot{_botToken}/getFile?file_id={metadata.FileId}";
            var getFileResponse = await httpClient.GetAsync(getFileUrl);

            if (!getFileResponse.IsSuccessStatusCode)
            {
                var errorContent = await getFileResponse.Content.ReadAsStringAsync();
                throw new ApplicationException($"获取 Telegram 文件路径失败: {getFileResponse.StatusCode}, {errorContent}");
            }

            var getFileContent = await getFileResponse.Content.ReadAsStringAsync();
            var getFileResult = JsonSerializer.Deserialize<TelegramGetFileResponse>(getFileContent);
            if (getFileResult == null || !getFileResult.Ok || string.IsNullOrEmpty(getFileResult.Result?.FilePath))
            {
                throw new ApplicationException("无法解析 Telegram 文件路径");
            }

            var filePath = getFileResult.Result.FilePath;
            var fileUrl = $"https://api.telegram.org/file/bot{_botToken}/{filePath}";

            var fileResponse = await httpClient.GetAsync(fileUrl);
            if (!fileResponse.IsSuccessStatusCode)
            {
                throw new ApplicationException($"下载 Telegram 文件失败: {fileResponse.StatusCode}");
            }

            // 创建临时目录
            var tempDir = Path.Combine(Path.GetTempPath(), "FoxelTelegramTemp");
            if (!Directory.Exists(tempDir))
            {
                Directory.CreateDirectory(tempDir);
            }

            // 创建临时文件名 - 使用原始文件名或使用临时文件名
            string tempFileName = !string.IsNullOrEmpty(metadata.OriginalFileName)
                ? Path.GetFileName(metadata.OriginalFileName)
                : $"{Guid.NewGuid()}{Path.GetExtension(filePath)}";
            string tempFilePath = Path.Combine(tempDir, tempFileName);

            // 保存文件
            using var fileStream = await fileResponse.Content.ReadAsStreamAsync();
            using var outputStream = new FileStream(tempFilePath, FileMode.Create);
            await fileStream.CopyToAsync(outputStream);

            return tempFilePath;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"下载 Telegram 文件时出错: {ex.Message}");
            throw;
        }
    }

    // 用于处理 Telegram API 响应的辅助类
    private class TelegramResponse
    {
        [JsonPropertyName("ok")] public bool Ok { get; set; }

        [JsonPropertyName("result")] public TelegramResult? Result { get; set; }
    }

    private class TelegramResult
    {
        [JsonPropertyName("message_id")] public int MessageId { get; set; }

        [JsonPropertyName("document")] public TelegramDocument? Document { get; set; }
    }

    private class TelegramDocument
    {
        [JsonPropertyName("file_id")] public string FileId { get; set; } = string.Empty;

        [JsonPropertyName("file_unique_id")] public string FileUniqueId { get; set; } = string.Empty;

        [JsonPropertyName("file_name")] public string? FileName { get; set; }

        [JsonPropertyName("mime_type")] public string? MimeType { get; set; }

        [JsonPropertyName("file_size")] public int FileSize { get; set; }
    }

    // 存储关于上传文件的元数据
    private class TelegramFileMetadata
    {
        public string FileId { get; set; } = string.Empty;
        public string FileUniqueId { get; set; } = string.Empty;
        public int MessageId { get; set; }
        public string ChatId { get; set; } = string.Empty;
        public string OriginalFileName { get; set; } = string.Empty;
        public DateTime UploadDate { get; set; }
        public string? MimeType { get; set; }
    }

    private class TelegramGetFileResponse
    {
        [JsonPropertyName("ok")] public bool Ok { get; set; }

        [JsonPropertyName("result")] public TelegramFileResult? Result { get; set; }
    }

    private class TelegramFileResult
    {
        [JsonPropertyName("file_path")] public string? FilePath { get; set; }
    }
}