using System.ComponentModel.DataAnnotations;

namespace Foxel.Models.DataBase;

public class Role : BaseModel
{
    [Required]
    [StringLength(50)]
    public string Name { get; set; } = string.Empty;

    [StringLength(200)]
    public string Description { get; set; } = string.Empty;

    public ICollection<User>? Users { get; set; }
}