using System.ComponentModel.DataAnnotations;

namespace Foxel.Models.DataBase;

public class Album : BaseModel
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string Description { get; set; } = string.Empty;
    public int UserId { get; set; }
    [Required]
    public User User { get; set; }

    public ICollection<Picture>? Pictures { get; set; }
}
