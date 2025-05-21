using System.Collections.Concurrent;
using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using Foxel.Models.DataBase;
using Foxel.Services.Interface;
using Foxel.Utils;
using Foxel.Services.StorageProvider;

namespace Foxel.Services;

public sealed class BackgroundTaskQueue : IBackgroundTaskQueue, IDisposable
{
    private readonly Channel<PictureProcessingTask> _queue;
    private readonly ConcurrentDictionary<Guid, PictureProcessingTask> _activeTasks;
    private readonly ConcurrentDictionary<int, PictureProcessingStatus> _pictureStatus;
    private readonly IServiceProvider _serviceProvider;
    private readonly IDbContextFactory<MyDbContext> _contextFactory;
    private readonly List<Task> _processingTasks;
    private readonly SemaphoreSlim _signal;
    private readonly int _maxConcurrentTasks;
    private bool _isDisposed;

    public BackgroundTaskQueue(
        IServiceProvider serviceProvider,
        IDbContextFactory<MyDbContext> contextFactory,
        IConfigService configuration)
    {
        _serviceProvider = serviceProvider;
        _contextFactory = contextFactory;
        _activeTasks = new ConcurrentDictionary<Guid, PictureProcessingTask>();
        _pictureStatus = new ConcurrentDictionary<int, PictureProcessingStatus>();
        _processingTasks = new List<Task>();
        _maxConcurrentTasks = configuration.GetValueAsync("BackgroundTasks:MaxConcurrentTasks", 4).Result;
        _signal = new SemaphoreSlim(_maxConcurrentTasks);
        var options = new BoundedChannelOptions(10000)
        {
            FullMode = BoundedChannelFullMode.Wait
        };
        _queue = Channel.CreateBounded<PictureProcessingTask>(options);
    }

    public async Task<Guid> QueuePictureProcessingTaskAsync(int pictureId, string originalFilePath)
    {
        var task = new PictureProcessingTask
        {
            Id = Guid.NewGuid(),
            PictureId = pictureId,
            OriginalFilePath = originalFilePath,
            CreatedAt = DateTime.UtcNow
        };

        // 更新状态字典
        var status = new PictureProcessingStatus
        {
            TaskId = task.Id,
            PictureId = pictureId,
            Status = ProcessingStatus.Pending,
            Progress = 0,
            CreatedAt = DateTime.UtcNow
        };

        // 将用户ID添加到任务状态中，这样可以按用户过滤任务
        using var scope = _serviceProvider.CreateScope();
        await using var dbContext = await _contextFactory.CreateDbContextAsync();
        var picture = await dbContext.Pictures
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == pictureId);

        if (picture != null)
        {
            status.PictureName = picture.Name;
            task.UserId = picture.UserId;
        }

        _pictureStatus[pictureId] = status;
        _activeTasks[task.Id] = task;
        await _queue.Writer.WriteAsync(task);

        // 启动处理器，如果没有正在运行
        StartProcessor();

        return task.Id;
    }

    public async Task<List<PictureProcessingStatus>> GetUserTasksStatusAsync(int userId)
    {
        await using var dbContext = await _contextFactory.CreateDbContextAsync();
        var userPictureIds = await dbContext.Pictures
            .Where(p => p.UserId == userId &&
                        (p.ProcessingStatus == ProcessingStatus.Pending ||
                         p.ProcessingStatus == ProcessingStatus.Processing))
            .Select(p => p.Id)
            .ToListAsync();

        return _pictureStatus.Values
            .Where(s => userPictureIds.Contains(s.PictureId))
            .OrderByDescending(s => s.CreatedAt)
            .ToList();
    }

    public Task<PictureProcessingStatus?> GetPictureProcessingStatusAsync(int pictureId)
    {
        return Task.FromResult(_pictureStatus.GetValueOrDefault(pictureId));
    }

    public async Task RestoreUnfinishedTasksAsync()
    {
        try
        {
            await using var dbContext = await _contextFactory.CreateDbContextAsync();

            // 获取所有未完成的图片处理任务
            var unfinishedPictures = await dbContext.Pictures
                .Where(p => p.ProcessingStatus == ProcessingStatus.Pending ||
                            p.ProcessingStatus == ProcessingStatus.Processing)
                .ToListAsync();

            if (unfinishedPictures.Any())
            {
                Console.WriteLine($"正在恢复 {unfinishedPictures.Count} 个未完成的图片处理任务");

                foreach (var picture in unfinishedPictures)
                {
                    // 构建原始文件路径
                    string relativePath = picture.Path.TrimStart('/');
                    string originalFilePath = Path.Combine(Directory.GetCurrentDirectory(), relativePath);
                    if (File.Exists(originalFilePath))
                    {
                        // 重新加入队列
                        await QueuePictureProcessingTaskAsync(picture.Id, originalFilePath);
                        Console.WriteLine($"已恢复图片处理任务: ID={picture.Id}, 路径={originalFilePath}");
                    }
                    else
                    {
                        // 如果文件不存在，则标记为失败
                        picture.ProcessingStatus = ProcessingStatus.Failed;
                        picture.ProcessingError = "系统重启后找不到原始图片文件";
                        Console.WriteLine($"无法恢复图片处理任务: ID={picture.Id}, 找不到文件: {originalFilePath}");
                    }
                }

                await dbContext.SaveChangesAsync();
            }
            else
            {
                Console.WriteLine("没有需要恢复的图片处理任务");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"恢复未完成的任务时发生错误: {ex.Message}");
        }
    }

    private void StartProcessor()
    {
        // 添加新的处理任务，如果当前任务数量小于最大并发数
        while (_processingTasks.Count(t => !t.IsCompleted) < _maxConcurrentTasks)
        {
            _processingTasks.Add(Task.Run(ProcessTasksAsync));
        }

        // 清理已完成的任务
        _processingTasks.RemoveAll(t => t.IsCompleted);
    }

    private async Task ProcessTasksAsync()
    {
        while (await _queue.Reader.WaitToReadAsync())
        {
            await _signal.WaitAsync();

            try
            {
                if (_queue.Reader.TryRead(out var task))
                {
                    await ProcessPictureAsync(task);
                }
            }
            finally
            {
                _signal.Release();
            }
        }
    }

    private async Task ProcessPictureAsync(PictureProcessingTask task)
    {
        if (!_activeTasks.TryGetValue(task.Id, out _) || !_pictureStatus.TryGetValue(task.PictureId, out var status))
        {
            return;
        }

        // 更新状态为处理中
        await UpdatePictureStatus(task.PictureId, ProcessingStatus.Processing, 0);

        string localFilePath = "";
        bool isTempFile = false;

        try
        {
            using var scope = _serviceProvider.CreateScope();
            var pictureService = scope.ServiceProvider.GetRequiredService<IPictureService>();
            var aiService = scope.ServiceProvider.GetRequiredService<IAiService>();
            var storageProviderFactory = scope.ServiceProvider.GetRequiredService<IStorageProviderFactory>();

            // 1. 获取图片信息
            await UpdatePictureStatus(task.PictureId, ProcessingStatus.Processing, 10);
            var dbContext = await _contextFactory.CreateDbContextAsync();
            var picture = await dbContext.Pictures.FindAsync(task.PictureId);

            if (picture == null)
            {
                throw new Exception($"找不到ID为{task.PictureId}的图片");
            }

            // 根据存储类型获取文件处理路径
            var storageProvider = storageProviderFactory.GetProvider(picture.StorageType);

            // 处理文件获取逻辑
            if (picture.StorageType == StorageType.Local)
            {
                // 本地存储，直接使用文件路径
                localFilePath = Path.Combine(Directory.GetCurrentDirectory(), picture.Path.TrimStart('/'));
            }
            else
            {
                // 非本地存储需要先下载文件
                await UpdatePictureStatus(task.PictureId, ProcessingStatus.Processing, 15);
                localFilePath = await storageProvider.DownloadFileAsync(picture.Path);
                isTempFile = true;
            }

            if (string.IsNullOrEmpty(localFilePath) || !File.Exists(localFilePath))
            {
                throw new Exception($"找不到图片文件: {localFilePath}");
            }

            // 创建缩略图
            await UpdatePictureStatus(task.PictureId, ProcessingStatus.Processing, 20);
            var thumbnailPath = Path.Combine(
                Path.GetDirectoryName(localFilePath)!,
                Path.GetFileNameWithoutExtension(Path.GetFileName(localFilePath)) + "_thumb" +
                Path.GetExtension(localFilePath));

            await ImageHelper.CreateThumbnailAsync(localFilePath, thumbnailPath, 500);

            // 更新缩略图路径到数据库
            await UpdatePictureStatus(task.PictureId, ProcessingStatus.Processing, 25);
            
            if (picture.StorageType == StorageType.Local)
            {
                // 本地存储缩略图
                var relativeThumbnailPath = $"/Uploads/{Path.GetRelativePath("Uploads", Path.GetDirectoryName(thumbnailPath)!)}/{Path.GetFileName(thumbnailPath)}";
                picture.ThumbnailPath = relativeThumbnailPath.Replace('\\', '/');
            }
            else
            {
                // 非本地存储，上传缩略图到对应的存储服务
                using var thumbnailFileStream = new FileStream(thumbnailPath, FileMode.Open, FileAccess.Read);
                var thumbnailFileName = Path.GetFileName(thumbnailPath);
                var thumbnailContentType = Path.GetExtension(thumbnailPath).ToLower() == ".png" ? "image/png" : "image/jpeg";

                // 上传缩略图并获取存储路径或元数据
                string thumbnailStoragePath = await storageProvider.SaveAsync(
                    thumbnailFileStream,
                    thumbnailFileName,
                    thumbnailContentType);

                // 将路径或元数据存储到ThumbnailPath
                picture.ThumbnailPath = thumbnailStoragePath;
            }

            // 3. 提取EXIF信息
            await UpdatePictureStatus(task.PictureId, ProcessingStatus.Processing, 30);
            var exifInfo = await ImageHelper.ExtractExifInfoAsync(localFilePath);
            picture.ExifInfo = exifInfo;

            // 4. 从EXIF中提取拍摄时间并确保是UTC格式
            picture.TakenAt = ImageHelper.ParseExifDateTime(exifInfo.DateTimeOriginal);

            // 5. 将缩略图转换为Base64并调用AI分析
            await UpdatePictureStatus(task.PictureId, ProcessingStatus.Processing, 50);
            string base64Image = await ImageHelper.ConvertImageToBase64(thumbnailPath);
            var (title, description) = await aiService.AnalyzeImageAsync(base64Image);

            // 6. 确定最终标题和描述
            string finalTitle = !string.IsNullOrWhiteSpace(title) && title != "AI生成的标题"
                ? title
                : Path.GetFileNameWithoutExtension(localFilePath);

            string finalDescription = !string.IsNullOrWhiteSpace(description) && description != "AI生成的描述"
                ? description
                : picture.Description;

            picture.Name = finalTitle;
            picture.Description = finalDescription;

            // 7. 生成嵌入向量
            await UpdatePictureStatus(task.PictureId, ProcessingStatus.Processing, 60);
            var combinedText = $"{finalTitle}. {finalDescription}";
            var embedding = await aiService.GetEmbeddingAsync(combinedText);
            picture.Embedding = new Pgvector.Vector(embedding);

            // 8. 获取所有可用标签名称
            await UpdatePictureStatus(task.PictureId, ProcessingStatus.Processing, 70);
            var availableTagNames = await dbContext.Tags.Select(t => t.Name).ToListAsync();

            // 9. 获取匹配的标签名称 - 从图片生成标签
            await UpdatePictureStatus(task.PictureId, ProcessingStatus.Processing, 80);
            var matchedTagNames = await aiService.GenerateTagsFromImageAsync(base64Image, availableTagNames, true);

            // 10. 处理标签
            await UpdatePictureStatus(task.PictureId, ProcessingStatus.Processing, 90);
            var user = await dbContext.Users
                .Include(u => u.Tags)
                .FirstOrDefaultAsync(u => u.Id == picture.UserId);

            if (user != null && matchedTagNames.Any())
            {
                var tagEntities = new List<Tag>();
                foreach (var tagName in matchedTagNames)
                {
                    var existingTag = await dbContext.Tags
                        .Include(t => t.Users)
                        .FirstOrDefaultAsync(t => t.Name.ToLower() == tagName.ToLower());

                    if (existingTag != null)
                    {
                        tagEntities.Add(existingTag);
                        user.Tags ??= new List<Tag>();
                        if (user.Tags.All(t => t.Id != existingTag.Id))
                        {
                            user.Tags.Add(existingTag);
                        }
                    }
                    else
                    {
                        var newTag = new Tag { Name = tagName.Trim(), Description = tagName.Trim() };
                        dbContext.Tags.Add(newTag);
                        await dbContext.SaveChangesAsync();
                        user.Tags ??= new List<Tag>();
                        user.Tags.Add(newTag);
                        tagEntities.Add(newTag);
                    }
                }

                picture.Tags = tagEntities;
            }

            // 11. 更新图片处理状态为完成
            picture.ProcessingStatus = ProcessingStatus.Completed;
            picture.ProcessingProgress = 100;
            await dbContext.SaveChangesAsync();

            // 更新任务状态
            await UpdatePictureStatus(task.PictureId, ProcessingStatus.Completed, 100);
            status.CompletedAt = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            // 更新状态为失败
            await UpdatePictureStatus(task.PictureId, ProcessingStatus.Failed, 0, ex.Message);

            // 记录错误日志
            Console.WriteLine($"图片处理失败: 图片ID={task.PictureId}, 错误: {ex.Message}");
        }
        finally
        {
            // 如果是临时文件，处理完后删除
            if (isTempFile && File.Exists(localFilePath))
            {
                try
                {
                    File.Delete(localFilePath);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"删除临时文件失败: {localFilePath}, 错误: {ex.Message}");
                }
            }

            // 清理活动任务
            _activeTasks.TryRemove(task.Id, out _);

            // 继续处理队列中的下一个任务
            StartProcessor();
        }
    }

    private async Task UpdatePictureStatus(int pictureId, ProcessingStatus status, int progress, string? error = null)
    {
        if (_pictureStatus.TryGetValue(pictureId, out var currentStatus))
        {
            currentStatus.Status = status;
            currentStatus.Progress = progress;
            currentStatus.Error = error;
        }

        // 更新数据库中的状态
        await using var dbContext = await _contextFactory.CreateDbContextAsync();
        var picture = await dbContext.Pictures.FindAsync(pictureId);
        if (picture != null)
        {
            picture.ProcessingStatus = status;
            picture.ProcessingProgress = progress;
            picture.ProcessingError = error;
            await dbContext.SaveChangesAsync();
        }
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    private void Dispose(bool disposing)
    {
        if (_isDisposed) return;

        if (disposing)
        {
            _signal.Dispose();
            Task.WhenAll(_processingTasks).Wait(5000);
        }

        _isDisposed = true;
    }
}

/// <summary>
/// 图片处理任务
/// </summary>
public class PictureProcessingTask
{
    public Guid Id { get; set; }
    public int PictureId { get; set; }
    public string OriginalFilePath { get; set; } = string.Empty;
    public int? UserId { get; set; }
    public DateTime CreatedAt { get; set; }
}