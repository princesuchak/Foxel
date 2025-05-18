using System.ComponentModel.DataAnnotations;

namespace Foxel.Models.Request.Config;

public class SetConfigRequest
{
    [Required(ErrorMessage = "配置键不能为空")]
    [StringLength(50, ErrorMessage = "配置键长度不能超过50个字符")]
    public string Key { get; set; } = string.Empty;
    
    public string? Value { get; set; }
    
    [StringLength(255, ErrorMessage = "描述长度不能超过255个字符")]
    public string? Description { get; set; }
}
