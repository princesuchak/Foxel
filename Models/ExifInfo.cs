using System.Text.Json.Serialization;

namespace Foxel.Models;

public class ExifInfo
{
    // 基本图像信息
    public int Width { get; set; }
    public int Height { get; set; }
    
    // 相机信息
    public string? CameraMaker { get; set; }
    public string? CameraModel { get; set; }
    public string? Software { get; set; }
    
    // 拍摄参数
    public string? ExposureTime { get; set; }
    public string? Aperture { get; set; }
    public string? IsoSpeed { get; set; }
    public string? FocalLength { get; set; }
    public string? Flash { get; set; }
    public string? MeteringMode { get; set; }
    public string? WhiteBalance { get; set; }
    
    // 时间信息
    public string? DateTimeOriginal { get; set; }
    
    // 位置信息
    public string? GpsLatitude { get; set; }
    public string? GpsLongitude { get; set; }
    
    // 错误信息
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ErrorMessage { get; set; }
}
