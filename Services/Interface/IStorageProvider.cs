namespace Foxel.Services.Interface;

public interface IStorageProvider
{
    /// <summary>
    /// 保存文件
    /// </summary>
    Task<string> SaveAsync(Stream fileStream, string fileName, string contentType);

    /// <summary>
    /// 删除文件
    /// </summary>
    Task DeleteAsync(string storagePath);

    /// <summary>
    /// 获取文件URL
    /// </summary>
    string GetUrl(string storagePath);

    /// <summary>
    /// 下载文件到本地临时目录
    /// </summary>
    /// <param name="storagePath">存储路径</param>
    /// <returns>本地文件路径</returns>
    Task<string> DownloadFileAsync(string storagePath)
    {
        // 默认实现 - 子类应重写此方法
        throw new NotImplementedException("此存储提供者不支持下载文件功能");
    }
}