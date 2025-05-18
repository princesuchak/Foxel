using Foxel.Models.DataBase;
using Foxel.Services.Interface;
using Foxel.Services.StorageProvider;
using Microsoft.Extensions.DependencyInjection;

namespace Foxel.Services;

public class StorageProviderFactory : IStorageProviderFactory
{
    private readonly IServiceProvider _serviceProvider;

    public StorageProviderFactory(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public IStorageProvider GetProvider(StorageType storageType)
    {
        return storageType switch
        {
            StorageType.Local => _serviceProvider.GetRequiredService<LocalStorageProvider>(),
            StorageType.Telegram => _serviceProvider.GetRequiredService<TelegramStorageProvider>(),
            _ => throw new ArgumentOutOfRangeException(nameof(storageType), $"不支持的存储类型: {storageType}")
        };
    }
}
