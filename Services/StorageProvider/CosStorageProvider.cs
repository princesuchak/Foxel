using Foxel.Services.Interface;
using COSXML;
using COSXML.Auth;
using COSXML.Model.Object;
using COSXML.Model.Bucket;
using COSXML.Transfer;
using COSXML.CosException;
using COSXML.Model.Tag;

namespace Foxel.Services.StorageProvider;

public class CustomQCloudCredentialProvider : DefaultSessionQCloudCredentialProvider
{
    private readonly IConfigService _configService;

    public CustomQCloudCredentialProvider(IConfigService configService) 
        : base(null, null, 0L, null)
    {
        _configService = configService;
        Refresh();
    }

    public override void Refresh()
    {
        try
        {
            string tmpSecretId = _configService["Storage:CosStorageSecretId"];
            string tmpSecretKey = _configService["Storage:CosStorageSecretKey"];
            string tmpToken = _configService["Storage:CosStorageToken"]; 
            long tmpStartTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            long tmpExpiredTime = tmpStartTime + 7200;
            SetQCloudCredential(tmpSecretId, tmpSecretKey, 
                String.Format("{0};{1}", tmpStartTime, tmpExpiredTime), tmpToken);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"刷新临时密钥时出错: {ex.Message}");
            throw;
        }
    }
}

public class CosStorageProvider : IStorageProvider
{
    private readonly string _secretId;
    private readonly string _secretKey;
    private readonly string _bucketName;
    private readonly string _region;
    private readonly string _cdnUrl;
    private readonly IConfigService _configService;
    private readonly CosXml _cosXmlClient;

    private readonly bool _isPublicRead;

    public CosStorageProvider(IConfigService configService)
    {
        _configService = configService;
        _secretId = configService["Storage:CosStorageSecretId"];
        _secretKey = configService["Storage:CosStorageSecretKey"];
        _bucketName = configService["Storage:CosStorageBucketName"];
        _region = configService["Storage:CosStorageRegion"];
        _cdnUrl = configService["Storage:CosStorageCdnUrl"] ?? string.Empty;
        
        // 检查桶是否为公开读取（从配置获取）
        bool.TryParse(configService["Storage:CosStoragePublicRead"] ?? "false", out _isPublicRead);
        
        // 在构造函数中初始化客户端，作为单例使用
        _cosXmlClient = CreateClient();
    }

    private CosXml CreateClient()
    {
        // 优化配置：启用HTTPS和日志
        var config = new CosXmlConfig.Builder()
            .IsHttps(true)  // 设置默认HTTPS请求
            .SetRegion(_region)
            .SetDebugLog(true)  // 显示日志
            .Build();
            
        // 使用自定义凭证提供者，支持持续更新临时密钥
        var cosCredentialProvider = new CustomQCloudCredentialProvider(_configService);
        
        return new CosXmlServer(config, cosCredentialProvider);
    }

    public async Task<string> SaveAsync(Stream fileStream, string fileName, string contentType)
    {
        try
        {
            // 创建唯一的文件存储路径
            string currentDate = DateTime.Now.ToString("yyyy/MM");
            string ext = Path.GetExtension(fileName);
            string objectKey = $"{currentDate}/{Guid.NewGuid()}{ext}";

            // 创建临时文件
            string tempPath = Path.GetTempFileName();
            try
            {
                using (var fileStream2 = new FileStream(tempPath, FileMode.Create))
                {
                    await fileStream.CopyToAsync(fileStream2);
                }

                var transferConfig = new TransferConfig();
                var transferManager = new TransferManager(_cosXmlClient, transferConfig);
                var uploadTask = new COSXMLUploadTask(_bucketName, objectKey);
                uploadTask.SetSrcPath(tempPath);
                var result = await transferManager.UploadAsync(uploadTask);
                return objectKey;
            }
            finally
            {
                // 确保临时文件被删除
                if (File.Exists(tempPath))
                {
                    File.Delete(tempPath);
                }
            }
        }
        catch (CosClientException clientEx)
        {
            Console.WriteLine($"COS客户端异常: {clientEx}");
            throw;
        }
        catch (CosServerException serverEx)
        {
            Console.WriteLine($"COS服务器异常: {serverEx.GetInfo()}");
            throw;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"上传文件到腾讯云COS时出错: {ex.Message}");
            throw;
        }
    }

    public async Task DeleteAsync(string storagePath)
    {
        try
        {
            if (string.IsNullOrEmpty(storagePath))
                return;

            var request = new DeleteObjectRequest(_bucketName, storagePath);
            await Task.Run(() => _cosXmlClient.DeleteObject(request));
        }
        catch (CosClientException clientEx)
        {
            Console.WriteLine($"COS客户端异常: {clientEx}");
        }
        catch (CosServerException serverEx)
        {
            Console.WriteLine($"COS服务器异常: {serverEx.GetInfo()}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"从腾讯云COS删除文件时出错: {ex.Message}");
        }
    }

    public string GetUrl(string storagePath)
    {
        try
        {
            if (string.IsNullOrEmpty(storagePath))
                return "/images/unavailable.gif";

            // 优先使用CDN
            if (!string.IsNullOrEmpty(_cdnUrl))
                return $"{_cdnUrl}/{storagePath}";

            // 公开读取的桶可直接访问
            if (_isPublicRead)
                return $"https://{_bucketName}.cos.{_region}.myqcloud.com/{storagePath}";

            var bucketParts = _bucketName.Split('-');
            var request = new PreSignatureStruct
            {
                bucket = bucketParts[0],
                appid = bucketParts[1],
                region = _region,
                key = storagePath,
                httpMethod = "GET",
                isHttps = true,
                signDurationSecond = 3600 * 24  
            };
            
            var url = _cosXmlClient.GenerateSignURL(request);
            return url;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"生成腾讯云COS文件URL时出错: {ex.Message}");
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
            var tempDir = Path.Combine(Path.GetTempPath(), "FoxelCosTemp");
            if (!Directory.Exists(tempDir))
            {
                Directory.CreateDirectory(tempDir);
            }

            string fileName = Path.GetFileName(storagePath);
            string localFilePath = Path.Combine(tempDir, fileName);
            var transferConfig = new TransferConfig();
            var transferManager = new TransferManager(_cosXmlClient, transferConfig);
            var downloadTask = new COSXMLDownloadTask(_bucketName, storagePath, tempDir, fileName);
            var result = await transferManager.DownloadAsync(downloadTask);
            return localFilePath;
        }
        catch (CosClientException clientEx)
        {
            Console.WriteLine($"COS客户端异常: {clientEx}");
            throw;
        }
        catch (CosServerException serverEx)
        {
            Console.WriteLine($"COS服务器异常: {serverEx.GetInfo()}");
            throw;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"从腾讯云COS下载文件时出错: {ex.Message}");
            throw;
        }
    }
}
