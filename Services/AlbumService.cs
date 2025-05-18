using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Foxel.Models;
using Foxel.Models.DataBase;
using Foxel.Models.Response.Album;
using Foxel.Models.Response.Picture;
using Foxel.Services.Interface;
using Foxel.Utils;

namespace Foxel.Services;

public class AlbumService : IAlbumService
{
    private readonly IDbContextFactory<MyDbContext> _contextFactory;
    private readonly IConfigService _configuration;
    private readonly IHttpContextAccessor _httpContextAccessor;
    
    private string ServerUrl => _configuration["AppSettings:ServerUrl"];
    
    public AlbumService(IDbContextFactory<MyDbContext> contextFactory, IConfigService configuration, IHttpContextAccessor httpContextAccessor)
    {
        _contextFactory = contextFactory;
        _configuration = configuration;
        _httpContextAccessor = httpContextAccessor;
    }
    
    public async Task<PaginatedResult<AlbumResponse>> GetAlbumsAsync(int page = 1, int pageSize = 10, int? userId = null)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;
        
        await using var dbContext = await _contextFactory.CreateDbContextAsync();
        
        // 构建查询
        IQueryable<Album> query = dbContext.Albums
            .Include(a => a.User)
            .OrderByDescending(a => a.CreatedAt);
        
        // 如果指定了用户ID，则只获取该用户的相册
        if (userId.HasValue)
        {
            query = query.Where(a => a.UserId == userId.Value);
        }
        
        // 获取总数和分页数据
        var totalCount = await query.CountAsync();
        var albums = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        
        // 获取每个相册中的图片数量
        var albumIds = albums.Select(a => a.Id).ToList();
        var albumPictureCounts = await dbContext.Pictures
            .Where(p => p.AlbumId != null && albumIds.Contains(p.AlbumId.Value))
            .GroupBy(p => p.AlbumId)
            .Select(g => new { AlbumId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.AlbumId!.Value, x => x.Count);
        
        // 转换为响应模型
        var albumResponses = albums.Select(a => new AlbumResponse
        {
            Id = a.Id,
            Name = a.Name,
            Description = a.Description,
            PictureCount = albumPictureCounts.TryGetValue(a.Id, out var count) ? count : 0,
            UserId = a.UserId,
            Username = a.User?.UserName,
            CreatedAt = a.CreatedAt,
            UpdatedAt = a.UpdatedAt
        }).ToList();
        
        return new PaginatedResult<AlbumResponse>
        {
            Data = albumResponses,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }
    
    public async Task<AlbumResponse> GetAlbumByIdAsync(int id)
    {
        await using var dbContext = await _contextFactory.CreateDbContextAsync();
        
        var album = await dbContext.Albums
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == id);
        
        if (album == null)
            throw new KeyNotFoundException($"找不到ID为{id}的相册");
        
        // 获取相册中图片的数量
        var pictureCount = await dbContext.Pictures
            .Where(p => p.AlbumId == id)
            .CountAsync();
            
        // 转换为响应模型
        var response = new AlbumResponse
        {
            Id = album.Id,
            Name = album.Name,
            Description = album.Description,
            PictureCount = pictureCount,
            UserId = album.UserId,
            Username = album.User?.UserName,
            CreatedAt = album.CreatedAt,
            UpdatedAt = album.UpdatedAt
        };
        
        return response;
    }
    
    public async Task<AlbumResponse> CreateAlbumAsync(string name, string? description, int userId)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("相册名称不能为空", nameof(name));
            
        await using var dbContext = await _contextFactory.CreateDbContextAsync();
        
        // 检查用户是否存在
        var user = await dbContext.Users.FindAsync(userId);
        if (user == null)
            throw new KeyNotFoundException($"找不到ID为{userId}的用户");
            
        // 创建新相册
        var album = new Album
        {
            Name = name.Trim(),
            Description = description?.Trim() ?? string.Empty,
            UserId = userId,
            User = user,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        dbContext.Albums.Add(album);
        await dbContext.SaveChangesAsync();
        
        // 转换为响应模型
        return new AlbumResponse
        {
            Id = album.Id,
            Name = album.Name,
            Description = album.Description,
            PictureCount = 0,
            UserId = album.UserId,
            Username = user.UserName,
            CreatedAt = album.CreatedAt,
            UpdatedAt = album.UpdatedAt
        };
    }
    
    public async Task<AlbumResponse> UpdateAlbumAsync(int id, string name, string? description, int? userId = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("相册名称不能为空", nameof(name));
            
        await using var dbContext = await _contextFactory.CreateDbContextAsync();
        
        // 获取相册
        var album = await dbContext.Albums
            .Include(a => a.User)
            .Include(a => a.Pictures)
            .FirstOrDefaultAsync(a => a.Id == id);
            
        if (album == null)
            throw new KeyNotFoundException($"找不到ID为{id}的相册");
            
        // 权限检查 - 只有相册的创建者或系统管理员可以更新
        if (userId.HasValue && album.UserId != userId.Value)
        {
            // 检查用户是否是管理员
            var user = await dbContext.Users.FindAsync(userId.Value);
            if (user == null)
            {
                throw new UnauthorizedAccessException("您没有权限更新此相册");
            }
        }
        
        // 更新相册信息
        album.Name = name.Trim();
        album.Description = description?.Trim() ?? album.Description;
        album.UpdatedAt = DateTime.UtcNow;
        
        await dbContext.SaveChangesAsync();
        
        // 转换为响应模型
        return new AlbumResponse
        {
            Id = album.Id,
            Name = album.Name,
            Description = album.Description,
            PictureCount = album.Pictures?.Count ?? 0,
            UserId = album.UserId,
            Username = album.User?.UserName,
            CreatedAt = album.CreatedAt,
            UpdatedAt = album.UpdatedAt
        };
    }
    
    public async Task<bool> DeleteAlbumAsync(int id)
    {
        await using var dbContext = await _contextFactory.CreateDbContextAsync();
        
        var album = await dbContext.Albums.FindAsync(id);
        if (album == null)
            return false;
            
        // 注意：相册删除前，需要确保关联的图片被正确处理
        // 这里只移除相册，而不删除图片
        
        dbContext.Albums.Remove(album);
        await dbContext.SaveChangesAsync();
        
        return true;
    }
    
    public async Task<bool> AddPictureToAlbumAsync(int albumId, int pictureId)
    {
        await using var dbContext = await _contextFactory.CreateDbContextAsync();
        
        // 获取相册和图片
        var album = await dbContext.Albums.FindAsync(albumId);
        if (album == null)
            throw new KeyNotFoundException($"找不到ID为{albumId}的相册");
            
        var picture = await dbContext.Pictures.FindAsync(pictureId);
        if (picture == null)
            throw new KeyNotFoundException($"找不到ID为{pictureId}的图片");
            
        // 将图片添加到相册
        picture.AlbumId = albumId;
        picture.Album = album;
        
        await dbContext.SaveChangesAsync();
        
        return true;
    }
    
    public async Task<bool> RemovePictureFromAlbumAsync(int albumId, int pictureId)
    {
        await using var dbContext = await _contextFactory.CreateDbContextAsync();
        
        // 获取图片
        var picture = await dbContext.Pictures
            .FirstOrDefaultAsync(p => p.Id == pictureId && p.AlbumId == albumId);
            
        if (picture == null)
            throw new KeyNotFoundException($"在相册中找不到ID为{pictureId}的图片");
            
        // 从相册中移除图片
        picture.AlbumId = null;
        picture.Album = null;
        
        await dbContext.SaveChangesAsync();
        
        return true;
    }

    public async Task<bool> AddPicturesToAlbumAsync(int albumId, List<int> pictureIds)
    {
        await using var dbContext = await _contextFactory.CreateDbContextAsync();
        
        var album = await dbContext.Albums.FindAsync(albumId) 
            ?? throw new KeyNotFoundException("相册不存在");
        
        // 检查是否有权限修改此相册
        var currentUser = _httpContextAccessor.HttpContext?.User;
        if (currentUser != null)
        {
            var userId = int.Parse(currentUser.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (album.UserId != userId)
            {
                throw new UnauthorizedAccessException("您没有权限修改此相册");
            }
        }
        
        var successCount = 0;
        
        foreach (var pictureId in pictureIds)
        {
            var picture = await dbContext.Pictures.FindAsync(pictureId);
            if (picture == null) continue; // 跳过不存在的图片
            
            // 直接更新 Picture 的 AlbumId
            if (picture.AlbumId != albumId)
            {
                picture.AlbumId = albumId;
                successCount++;
            }
        }
        
        if (successCount > 0)
        {
            await dbContext.SaveChangesAsync();
            return true;
        }
        
        return false;
    }
}
