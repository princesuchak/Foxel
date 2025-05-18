using Foxel.Models.DataBase;
using Foxel.Services.Interface;

namespace Foxel.Services.Interface;

public interface IStorageProviderFactory
{
    /// <summary>
    /// 根据存储类型获取对应的存储提供者
    /// </summary>
    /// <param name="storageType">存储类型</param>
    /// <returns>存储提供者实例</returns>
    IStorageProvider GetProvider(StorageType storageType);
}
