using Foxel.Services.Interface;

namespace Foxel.Services;

public class QueuedHostedService(
    ILogger<QueuedHostedService> logger,
    IServiceProvider serviceProvider)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("后台队列处理服务已启动");

        try
        {
            // 从数据库恢复未完成的任务
            using var scope = serviceProvider.CreateScope();
            var backgroundTaskQueue = scope.ServiceProvider.GetRequiredService<IBackgroundTaskQueue>();
            await backgroundTaskQueue.RestoreUnfinishedTasksAsync();
            logger.LogInformation("已完成未处理任务的恢复");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "恢复未完成任务时出错");
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(1000, stoppingToken);
        }
        logger.LogInformation("后台队列处理服务已停止");
    }
}
