using Foxel.Models;
using Foxel.Models.Response.Tag;

namespace Foxel.Services.Interface;

public interface ITagService
{
    Task<PaginatedResult<TagResponse>> GetFilteredTagsAsync(
        int page = 1,
        int pageSize = 20,
        string? searchQuery = null,
        string? sortBy = "pictureCount",
        string? sortDirection = "desc",
        int? minPictureCount = null
    );
    
    Task<TagResponse> GetTagByIdAsync(int id);
    
    Task<TagResponse> CreateTagAsync(string name, string? description = null);
    
    Task<TagResponse> UpdateTagAsync(int id, string? name = null, string? description = null);
    
    Task<bool> DeleteTagAsync(int id);
}
