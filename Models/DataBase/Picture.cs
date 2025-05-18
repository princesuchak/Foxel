using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using Vector = Pgvector.Vector;

namespace Foxel.Models.DataBase;

public enum StorageType
{
    Local = 0,
    Telegram = 1,
}

public class Picture : BaseModel
{
    [StringLength(255)] public string Name { get; set; } = string.Empty;

    [StringLength(1024)] public string Path { get; set; } = string.Empty;

    [StringLength(1024)] public string? ThumbnailPath { get; set; } = string.Empty;

    [StringLength(2000)] public string Description { get; set; } = string.Empty;
    [Column(TypeName = "vector(1024)")] public Vector? Embedding { get; set; }

    public DateTime? TakenAt { get; set; }

    [Column(TypeName = "jsonb")] public string? ExifInfoJson { get; set; }

    [NotMapped]
    public ExifInfo? ExifInfo
    {
        get => ExifInfoJson != null ? JsonSerializer.Deserialize<ExifInfo>(ExifInfoJson) : null;
        set => ExifInfoJson = value != null ? JsonSerializer.Serialize(value) : null;
    }

    public StorageType StorageType { get; set; } = StorageType.Local;

    public ICollection<Tag>? Tags { get; set; }
    public int? UserId { get; set; }

    public User? User { get; set; }

    public int? AlbumId { get; set; }
    public Album? Album { get; set; }

    public ICollection<Favorite>? Favorites { get; set; }

    public bool ContentWarning { get; set; } = false;
    public PermissionType Permission { get; set; } = PermissionType.Public;

    public ProcessingStatus ProcessingStatus { get; set; } = ProcessingStatus.Pending;
    public string? ProcessingError { get; set; }
    public int ProcessingProgress { get; set; } = 0;
}

public enum PermissionType
{
    Public = 0,
    Friends = 1,
    Private = 2
}

public enum ProcessingStatus
{
    Pending,      // 等待处理
    Processing,   // 处理中
    Completed,    // 处理完成
    Failed        // 处理失败
}