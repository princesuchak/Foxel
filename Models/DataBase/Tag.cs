using System.ComponentModel.DataAnnotations;

namespace Foxel.Models.DataBase;

public class Tag : BaseModel
{
    [Required] [StringLength(50)] public string Name { get; set; } = string.Empty;

    [StringLength(200)] public string Description { get; set; } = string.Empty;

    public ICollection<Picture>? Pictures { get; set; }

    public ICollection<User>? Users { get; set; }
}