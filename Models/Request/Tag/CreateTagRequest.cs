using System.ComponentModel.DataAnnotations;

namespace Foxel.Models.Request.Tag;

public class CreateTagRequest
{
    [Required]
    [StringLength(50)]
    public string Name { get; set; } = string.Empty;
    
    [StringLength(200)]
    public string? Description { get; set; }
}
