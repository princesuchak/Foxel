using System.ComponentModel.DataAnnotations;

namespace Foxel.Models.DataBase;

public class Config : BaseModel
{
    [Required]
    [StringLength(50)]
    public string Key { get; set; } = string.Empty;

    [Required]
    [StringLength(255)]
    public string Value { get; set; } = string.Empty;

    [StringLength(255)]
    public string Description { get; set; } = string.Empty;
}