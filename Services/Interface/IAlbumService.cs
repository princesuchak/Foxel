using Foxel.Models;
using Foxel.Models.Response;
using Foxel.Models.Response.Album;

namespace Foxel.Services.Interface;

public interface IAlbumService
{
    Task<PaginatedResult<AlbumResponse>> GetAlbumsAsync(int page = 1, int pageSize = 10, int? userId = null);
    Task<AlbumResponse> GetAlbumByIdAsync(int id);
    Task<AlbumResponse> CreateAlbumAsync(string name, string? description, int userId);
    Task<AlbumResponse> UpdateAlbumAsync(int id, string name, string? description, int? userId = null);
    Task<bool> DeleteAlbumAsync(int id);
    Task<bool> AddPictureToAlbumAsync(int albumId, int pictureId);
    Task<bool> AddPicturesToAlbumAsync(int albumId, List<int> pictureIds);
    Task<bool> RemovePictureFromAlbumAsync(int albumId, int pictureId);
}
