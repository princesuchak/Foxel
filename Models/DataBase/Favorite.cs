using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Foxel.Models.DataBase;

public class Favorite
{
    [Key]
    public int Id { get; set; }
    
    public User User { get; set; }
    
    public int PictureId { get; set; }
    [ForeignKey("PictureId")]
    public Picture Picture { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
