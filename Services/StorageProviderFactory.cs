using Foxel.Models.DataBase;
using Foxel.Services.Interface;
using Foxel.Services.StorageProvider;

namespace Foxel.Services;

public class StorageProviderFactory(
    LocalStorageProvider localStorageProvider, 
    TelegramStorageProvider telegramStorageProvider,
    S3StorageProvider s3StorageProvider) : IStorageProviderFactory
{
    public IStorageProvider GetProvider(StorageType storageType)
    {
        return storageType switch
        {
            StorageType.Local => localStorageProvider,
            StorageType.Telegram => telegramStorageProvider,
            StorageType.S3 => s3StorageProvider,
            _ => throw new ArgumentException($"不支持的存储类型: {storageType}")
        };
    }
}
