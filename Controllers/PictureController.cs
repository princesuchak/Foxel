using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Foxel.Models;
using Foxel.Models.DataBase;
using Foxel.Models.Request.Picture;
using Foxel.Models.Response.Picture;
using Foxel.Services.Interface;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Foxel.Controllers;

[Authorize]
[Route("api/picture")]
public class PictureController(IPictureService pictureService,IConfigService configService) : BaseApiController
{
    [HttpGet("get_pictures")]
    public async Task<ActionResult<PaginatedResult<PictureResponse>>> GetPictures(
        [FromQuery] FilteredPicturesRequest request)
    {
        try
        {
            List<string>? tagsList = null;
            if (!string.IsNullOrWhiteSpace(request.Tags))
            {
                tagsList = request.Tags.Split(',')
                    .Select(t => t.Trim())
                    .Where(t => !string.IsNullOrWhiteSpace(t))
                    .ToList();
            }

            var currentUserId = GetCurrentUserId();

            var result = await pictureService.GetPicturesAsync(
                request.Page,
                request.PageSize,
                request.SearchQuery,
                tagsList,
                request.StartDate,
                request.EndDate,
                currentUserId,
                request.SortBy,
                request.OnlyWithGps,
                request.UseVectorSearch,
                request.SimilarityThreshold,
                request.ExcludeAlbumId,
                request.AlbumId,
                request.OnlyFavorites,
                request.OwnerId,
                request.IncludeAllPublic
            );

            return PaginatedSuccess(result.Data, result.TotalCount, result.Page, result.PageSize);
        }
        catch (Exception ex)
        {
            return PaginatedError<PictureResponse>($"获取图片失败: {ex.Message}", 500);
        }
    }

    [AllowAnonymous]
    [HttpPost("upload_picture")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<BaseResult<PictureResponse>>> UploadPicture(
        [FromForm] UploadPictureRequest request)
    {
        if (request.File.Length == 0)
            return Error<PictureResponse>("没有上传文件");

        try
        {
            var userId = GetCurrentUserId();
            
            await using var stream = request.File.OpenReadStream();
            var result = await pictureService.UploadPictureAsync(
                request.File.FileName,
                stream,
                request.File.ContentType,
                userId,
                (PermissionType)request.Permission!,
                request.AlbumId
            );

            var picture = result.Picture;

            return Success(picture, "图片上传成功");
        }
        catch (KeyNotFoundException ex)
        {
            return Error<PictureResponse>(ex.Message, 404);
        }
        catch (Exception ex)
        {
            return Error<PictureResponse>($"上传图片失败: {ex.Message}", 500);
        }
    }

    [HttpPost("delete_pictures")]
    public async Task<ActionResult<BaseResult<object>>> DeleteMultiplePictures(
        [FromBody] DeleteMultiplePicturesRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null)
                return Error<object>("无法识别用户信息");

            if (!request.PictureIds.Any())
                return Error<object>("未提供要删除的图片ID");

            // 获取删除结果
            var results = await pictureService.DeleteMultiplePicturesAsync(request.PictureIds);

            // 权限验证和处理结果
            var unauthorizedIds = new List<int>();
            var notFoundIds = new List<int>();
            var successIds = new List<int>();
            var errors = new Dictionary<int, string>();

            foreach (var (pictureId, (success, errorMessage, ownerId)) in results)
            {
                // 检查权限
                if (ownerId.HasValue && ownerId.Value != currentUserId.Value)
                {
                    unauthorizedIds.Add(pictureId);
                    continue;
                }

                if (!success)
                {
                    notFoundIds.Add(pictureId);
                }
                else if (!string.IsNullOrEmpty(errorMessage))
                {
                    errors[pictureId] = errorMessage;
                }
                else
                {
                    successIds.Add(pictureId);
                }
            }

            // 如果有未授权或其他错误，返回适当的响应
            if (unauthorizedIds.Any() || notFoundIds.Any() || errors.Any())
            {
                var messages = new List<string>();

                if (unauthorizedIds.Any())
                    messages.Add($"无权删除以下图片: {string.Join(", ", unauthorizedIds)}");

                if (notFoundIds.Any())
                    messages.Add($"找不到以下图片: {string.Join(", ", notFoundIds)}");

                if (errors.Any())
                    messages.Add(string.Join("; ", errors.Select(e => $"图片ID {e.Key}: {e.Value}")));

                return StatusCode(207, new BaseResult<object>
                {
                    Success = successIds.Any(),
                    Message = string.Join("; ", messages),
                    StatusCode = 207,
                    Data = new
                    {
                        SuccessCount = successIds.Count,
                        SuccessIds = successIds,
                        UnauthorizedIds = unauthorizedIds,
                        NotFoundIds = notFoundIds,
                        Errors = errors
                    }
                });
            }

            return Success<object>($"成功删除 {successIds.Count} 张图片");
        }
        catch (Exception ex)
        {
            return Error<object>($"删除图片失败: {ex.Message}", 500);
        }
    }

    [HttpPost("update_picture")]
    public async Task<ActionResult<BaseResult<PictureResponse>>> UpdatePicture(
        [FromBody] UpdatePictureRequestWithId request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null)
                return Error<PictureResponse>("无法识别用户信息");

            var (picture, ownerId) = await pictureService.UpdatePictureAsync(
                request.Id, request.Name, request.Description, request.Tags);

            // 权限验证
            if (ownerId.HasValue && ownerId.Value != currentUserId.Value)
            {
                return Error<PictureResponse>("您没有权限更新此图片", 403);
            }

            return Success(picture, "图片信息已成功更新");
        }
        catch (KeyNotFoundException)
        {
            return Error<PictureResponse>("找不到要更新的图片", 404);
        }
        catch (Exception ex)
        {
            return Error<PictureResponse>($"更新图片失败: {ex.Message}", 500);
        }
    }

    [HttpPost("favorite")]
    public async Task<ActionResult<BaseResult<bool>>> FavoritePicture([FromBody] FavoriteRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Error<bool>("无法识别用户信息", 401);

            var result = await pictureService.FavoritePictureAsync(request.PictureId, userId.Value);
            return Success(result, "图片收藏成功");
        }
        catch (KeyNotFoundException)
        {
            return Error<bool>("找不到指定图片", 404);
        }
        catch (InvalidOperationException ex)
        {
            return Error<bool>(ex.Message);
        }
        catch (Exception ex)
        {
            return Error<bool>($"收藏图片失败: {ex.Message}", 500);
        }
    }

    [HttpPost("unfavorite")]
    public async Task<ActionResult<BaseResult<bool>>> UnfavoritePicture([FromBody] FavoriteRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Error<bool>("无法识别用户信息", 401);

            var result = await pictureService.UnfavoritePictureAsync(request.PictureId, userId.Value);
            return Success(result, "已取消收藏");
        }
        catch (KeyNotFoundException)
        {
            return Error<bool>("找不到指定图片或收藏记录", 404);
        }
        catch (Exception ex)
        {
            return Error<bool>($"取消收藏失败: {ex.Message}", 500);
        }
    }

    [HttpGet("get_telegram_file")]
    [AllowAnonymous]
    public async Task<IActionResult> GetTelegramFile([FromQuery] string fileId)
    {
        try
        {
            var botToken = configService["Storage:TelegramStorageBotToken"];
            if (string.IsNullOrEmpty(botToken))
                return BadRequest("Telegram Bot Token 未配置");

            using var httpClient = new HttpClient();
            var getFileUrl = $"https://api.telegram.org/bot{botToken}/getFile?file_id={fileId}";
            var getFileResponse = await httpClient.GetAsync(getFileUrl);

            if (!getFileResponse.IsSuccessStatusCode)
            {
                var errorContent = await getFileResponse.Content.ReadAsStringAsync();
                return StatusCode((int)getFileResponse.StatusCode, $"获取文件路径失败: {errorContent}");
            }

            var getFileContent = await getFileResponse.Content.ReadAsStringAsync();
            var getFileResult = JsonSerializer.Deserialize<TelegramGetFileResponse>(getFileContent);
            if (getFileResult == null || !getFileResult.Ok || string.IsNullOrEmpty(getFileResult.Result?.FilePath))
            {
                return BadRequest("无法解析 Telegram 文件路径");
            }

            var filePath = getFileResult.Result.FilePath;
            var fileUrl = $"https://api.telegram.org/file/bot{botToken}/{filePath}";

            var fileResponse = await httpClient.GetAsync(fileUrl);
            if (!fileResponse.IsSuccessStatusCode)
            {
                return StatusCode((int)fileResponse.StatusCode, "下载文件失败");
            }

            var contentType = fileResponse.Content.Headers.ContentType?.ToString() ?? "application/octet-stream";
            var fileStream = await fileResponse.Content.ReadAsStreamAsync();

            return File(fileStream, contentType);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"代理获取文件失败: {ex.Message}");
        }
    }

    // 用于解析 Telegram getFile API 响应的辅助类
    private class TelegramGetFileResponse
    {
        [JsonPropertyName("ok")]
        public bool Ok { get; set; }

        [JsonPropertyName("result")]
        public TelegramFileResult? Result { get; set; }
    }

    private class TelegramFileResult
    {
        [JsonPropertyName("file_path")]
        public string? FilePath { get; set; }
    }
}