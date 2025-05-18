using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Foxel.Models;
using Foxel.Services.Interface;

namespace Foxel.Controllers;

[Authorize]
[Route("api/background-tasks")]
public class BackgroundTaskController : BaseApiController
{
    private readonly IBackgroundTaskQueue _backgroundTaskQueue;

    public BackgroundTaskController(IBackgroundTaskQueue backgroundTaskQueue)
    {
        _backgroundTaskQueue = backgroundTaskQueue;
    }

    [HttpGet("user-tasks")]
    public async Task<ActionResult<BaseResult<List<PictureProcessingStatus>>>> GetUserTasks()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Error<List<PictureProcessingStatus>>("无法识别用户信息", 401);

            var tasks = await _backgroundTaskQueue.GetUserTasksStatusAsync(userId.Value);
            return Success(tasks, "成功获取任务列表");
        }
        catch (Exception ex)
        {
            return Error<List<PictureProcessingStatus>>($"获取任务状态失败: {ex.Message}", 500);
        }
    }

    [HttpGet("picture-status/{pictureId}")]
    public async Task<ActionResult<BaseResult<PictureProcessingStatus>>> GetPictureStatus(int pictureId)
    {
        try
        {
            var status = await _backgroundTaskQueue.GetPictureProcessingStatusAsync(pictureId);
            if (status == null)
                return Error<PictureProcessingStatus>("找不到该图片的处理状态", 404);

            return Success(status, "成功获取图片处理状态");
        }
        catch (Exception ex)
        {
            return Error<PictureProcessingStatus>($"获取图片处理状态失败: {ex.Message}", 500);
        }
    }
}
