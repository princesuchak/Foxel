using System.ComponentModel.DataAnnotations;

namespace Foxel.Models.DataBase;

public class User : BaseModel
{
    [Required] [StringLength(50)] public required string UserName { get; set; }

    [Required]
    [EmailAddress]
    [StringLength(100)]
    public required string Email { get; set; }

    [Required] [StringLength(255)] public required string PasswordHash { get; set; }

    [StringLength(255)] public string? GithubId { get; set; }
    public int? RoleId { get; set; }
    
    public Role? Role { get; set; }

    public ICollection<Favorite>? Favorites { get; set; }

    public ICollection<Tag>? Tags { get; set; }

    public ICollection<Album>? Albums { get; set; }
}