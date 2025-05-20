using Foxel.Services.Interface;
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Transfer;

namespace Foxel.Services.StorageProvider;

public class S3StorageProvider : IStorageProvider
{
    private readonly string _accessKey;
    private readonly string _secretKey;
    private readonly string _bucketName;
    private readonly string _region;
    private readonly string _endpoint;
    private readonly bool _usePathStyleUrls;
    private readonly string _serverUrl;
    private readonly string _cdnUrl;

    public S3StorageProvider(IConfigService configService)
    {
        _accessKey = configService["Storage:S3StorageAccessKey"];
        _secretKey = configService["Storage:S3StorageSecretKey"];
        _bucketName = configService["Storage:S3StorageBucketName"];
        _region = configService["Storage:S3StorageRegion"];
        _serverUrl = configService["AppSettings:ServerUrl"];
        _cdnUrl = configService["Storage:S3StorageCdnUrl"] ?? string.Empty;
        _endpoint = configService["Storage:S3StorageEndpoint"] ?? $"https://s3.{_region}.amazonaws.com";
        _usePathStyleUrls = bool.TryParse(configService["Storage:S3StorageUsePathStyleUrls"], out var usePathStyle) && usePathStyle;
    }

    private AmazonS3Client CreateClient()
    {
        var config = new AmazonS3Config
        {
            ServiceURL = _endpoint,
            UseHttp = !_endpoint.StartsWith("https", StringComparison.OrdinalIgnoreCase),
            ForcePathStyle = _usePathStyleUrls
        };

        if (!string.IsNullOrEmpty(_region) && _endpoint.Contains("amazonaws.com"))
        {
            config.RegionEndpoint = Amazon.RegionEndpoint.GetBySystemName(_region);
        }
        
        return new AmazonS3Client(
            _accessKey,
            _secretKey,
            config
        );
    }

    public async Task<string> SaveAsync(Stream fileStream, string fileName, string contentType)
    {
        try
        {
            // 创建唯一的文件存储路径
            string currentDate = DateTime.Now.ToString("yyyy/MM");
            string ext = Path.GetExtension(fileName);
            string objectKey = $"{currentDate}/{Guid.NewGuid()}{ext}";

            using var client = CreateClient();
            using var transferUtility = new TransferUtility(client);
            
            var uploadRequest = new TransferUtilityUploadRequest
            {
                InputStream = fileStream,
                Key = objectKey,
                BucketName = _bucketName,
                ContentType = contentType
            };

            await transferUtility.UploadAsync(uploadRequest);
            
            // 返回文件的路径
            return objectKey;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"上传文件到S3时出错: {ex.Message}");
            throw;
        }
    }

    public async Task DeleteAsync(string storagePath)
    {
        try
        {
            if (string.IsNullOrEmpty(storagePath))
                return;

            using var client = CreateClient();
            var deleteRequest = new DeleteObjectRequest
            {
                BucketName = _bucketName,
                Key = storagePath
            };

            await client.DeleteObjectAsync(deleteRequest);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"从S3删除文件时出错: {ex.Message}");
        }
    }

    public string GetUrl(string storagePath)
    {
        try
        {
            if (string.IsNullOrEmpty(storagePath))
                return "/images/unavailable.gif";

            // 如果配置了CDN URL，使用CDN
            if (!string.IsNullOrEmpty(_cdnUrl))
            {
                return $"{_cdnUrl}/{storagePath}";
            }

            // 否则使用S3直链或生成预签名URL
            using var client = CreateClient();
            var request = new GetPreSignedUrlRequest
            {
                BucketName = _bucketName,
                Key = storagePath,
                Expires = DateTime.UtcNow.AddHours(1) // URL有效期1小时
            };

            return client.GetPreSignedURL(request);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"生成S3文件URL时出错: {ex.Message}");
            return "/images/unavailable.gif";
        }
    }

    public async Task<string> DownloadFileAsync(string storagePath)
    {
        try
        {
            if (string.IsNullOrEmpty(storagePath))
            {
                throw new ArgumentException("存储路径不能为空");
            }

            // 创建临时目录
            var tempDir = Path.Combine(Path.GetTempPath(), "FoxelS3Temp");
            if (!Directory.Exists(tempDir))
            {
                Directory.CreateDirectory(tempDir);
            }

            // 创建临时文件名
            string fileName = Path.GetFileName(storagePath);
            string tempFilePath = Path.Combine(tempDir, fileName);

            // 下载文件
            using var client = CreateClient();
            var request = new GetObjectRequest
            {
                BucketName = _bucketName,
                Key = storagePath
            };

            using var response = await client.GetObjectAsync(request);
            using var fileStream = new FileStream(tempFilePath, FileMode.Create);
            await response.ResponseStream.CopyToAsync(fileStream);

            return tempFilePath;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"从S3下载文件时出错: {ex.Message}");
            throw;
        }
    }
}
