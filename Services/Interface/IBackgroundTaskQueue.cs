using Foxel.Models.DataBase;

namespace Foxel.Services.Interface;

/// <summary>
/// 后台任务队列接口
/// </summary>
public interface IBackgroundTaskQueue
{
    /// <summary>
    /// 将图片处理任务添加到队列
    /// </summary>
    /// <param name="pictureId">图片ID</param>
    /// <param name="originalFilePath">原始图片路径</param>
    /// <returns>任务ID</returns>
    Task<Guid> QueuePictureProcessingTaskAsync(int pictureId, string originalFilePath);
    
    /// <summary>
    /// 获取用户的所有任务状态
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <returns>该用户的任务状态列表</returns>
    Task<List<PictureProcessingStatus>> GetUserTasksStatusAsync(int userId);
    
    /// <summary>
    /// 获取特定图片的处理状态
    /// </summary>
    /// <param name="pictureId">图片ID</param>
    /// <returns>处理状态</returns>
    Task<PictureProcessingStatus?> GetPictureProcessingStatusAsync(int pictureId);

    /// <summary>
    /// 恢复未完成的任务
    /// </summary>
    Task RestoreUnfinishedTasksAsync();
}

/// <summary>
/// 图片处理状态
/// </summary>
public class PictureProcessingStatus
{
    public int PictureId { get; set; }
    public Guid TaskId { get; set; }
    public string PictureName { get; set; } = string.Empty;
    public ProcessingStatus Status { get; set; }
    public int Progress { get; set; }  // 0-100
    public string? Error { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
