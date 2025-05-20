using System.ComponentModel.DataAnnotations;

namespace Foxel.Models.Request.Auth;

public class UpdateUserRequest
{
    [StringLength(50)]
    public string? UserName { get; set; }

    [EmailAddress]
    public string? Email { get; set; }
    
    public string? CurrentPassword { get; set; }
    
    [StringLength(20, MinimumLength = 6)]
    public string? NewPassword { get; set; }
}
