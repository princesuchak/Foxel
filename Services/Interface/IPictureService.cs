using Foxel.Models;
using Foxel.Models.DataBase;
using Foxel.Models.Response.Picture;

namespace Foxel.Services.Interface;

public interface IPictureService
{
    Task<PaginatedResult<PictureResponse>> GetPicturesAsync(
        int page = 1,
        int pageSize = 8,
        string? searchQuery = null,
        List<string>? tags = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        int? userId = null,
        string? sortBy = "newest",
        bool? onlyWithGps = false,
        bool useVectorSearch = false,
        double similarityThreshold = 0.36,
        int? excludeAlbumId = null,
        int? albumId = null,
        bool onlyFavorites = false,
        int? ownerId = null,
        bool includeAllPublic = false
    );
        
    Task<(PictureResponse Picture, int Id)> UploadPictureAsync(
        string fileName, 
        Stream fileStream, 
        string contentType, 
        int? userId, 
        PermissionType permission = PermissionType.Public, 
        int? albumId = null,
        StorageType storageType = StorageType.Telegram
        );
    
    Task<ExifInfo> GetPictureExifInfoAsync(int pictureId);
    
    /// <summary>
    /// 批量删除多张图片
    /// </summary>
    /// <param name="pictureIds">要删除的图片ID列表</param>
    /// <returns>每个图片ID对应的删除结果、可能的错误信息和所有者ID</returns>
    Task<Dictionary<int, (bool Success, string? ErrorMessage, int? UserId)>> DeleteMultiplePicturesAsync(
        List<int> pictureIds);
    
    /// <summary>
    /// 更新图片信息
    /// </summary>
    /// <param name="pictureId">图片ID</param>
    /// <param name="name">新标题（可选）</param>
    /// <param name="description">新描述（可选）</param>
    /// <param name="tags">新标签（可选）</param>
    /// <returns>更新后的图片视图模型和所有者ID</returns>
    Task<(PictureResponse Picture, int? UserId)> UpdatePictureAsync(
        int pictureId, 
        string? name = null, 
        string? description = null,
        List<string>? tags = null);
        
    /// <summary>
    /// 收藏图片
    /// </summary>
    /// <param name="pictureId">图片ID</param>
    /// <param name="userId">用户ID</param>
    /// <returns>成功/失败</returns>
    Task<bool> FavoritePictureAsync(int pictureId, int userId);
    
    /// <summary>
    /// 取消收藏图片
    /// </summary>
    /// <param name="pictureId">图片ID</param>
    /// <param name="userId">用户ID</param>
    /// <returns>成功/失败</returns>
    Task<bool> UnfavoritePictureAsync(int pictureId, int userId);
    
    /// <summary>
    /// 检查图片是否被特定用户收藏
    /// </summary>
    /// <param name="pictureId">图片ID</param>
    /// <param name="userId">用户ID</param>
    /// <returns>是否收藏</returns>
    Task<bool> IsPictureFavoritedByUserAsync(int pictureId, int userId);
    

}