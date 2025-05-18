using System.ComponentModel.DataAnnotations;

namespace Foxel.Models.DataBase;

public abstract class BaseModel
{
    [Key] public int Id { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}