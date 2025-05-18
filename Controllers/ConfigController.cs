using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Foxel.Models;
using Foxel.Models.DataBase;
using Foxel.Models.Request.Config;
using Foxel.Services.Interface;

namespace Foxel.Controllers;

[Authorize(Roles = "Administrator")]
[Route("api/config")]
public class ConfigController(IConfigService configService) : BaseApiController
{
    [HttpGet("get_configs")]
    public async Task<ActionResult<BaseResult<List<Config>>>> GetConfigs()
    {
        try
        {
            var configs = await configService.GetAllConfigsAsync();
            return Success(configs, "获取所有配置成功");
        }
        catch (Exception ex)
        {
            return Error<List<Config>>($"获取配置失败: {ex.Message}", 500);
        }
    }

    [HttpGet("get_config/{key}")]
    public async Task<ActionResult<BaseResult<Config>>> GetConfig(string key)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(key))
                return Error<Config>("配置键不能为空");

            var config = await configService.GetConfigAsync(key);

            if (config == null)
                return Error<Config>($"找不到键为 '{key}' 的配置", 404);

            return Success(config, "获取配置成功");
        }
        catch (Exception ex)
        {
            return Error<Config>($"获取配置失败: {ex.Message}", 500);
        }
    }

    [HttpPost("set_config")]
    public async Task<ActionResult<BaseResult<Config>>> SetConfig([FromBody] SetConfigRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Key))
                return Error<Config>("配置键不能为空");

            var config = await configService.SetConfigAsync(
                request.Key.Trim(),
                request.Value ?? string.Empty,
                request.Description);

            return Success(config, "配置设置成功");
        }
        catch (Exception ex)
        {
            return Error<Config>($"设置配置失败: {ex.Message}", 500);
        }
    }

    [HttpPost("delete_config")]
    public async Task<ActionResult<BaseResult<bool>>> DeleteConfig([FromBody] string key)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(key))
                return Error<bool>("配置键不能为空");

            var result = await configService.DeleteConfigAsync(key);

            if (!result)
                return Error<bool>($"找不到键为 '{key}' 的配置", 404);

            return Success(true, $"成功删除键为 '{key}' 的配置");
        }
        catch (Exception ex)
        {
            return Error<bool>($"删除配置失败: {ex.Message}", 500);
        }
    }
}