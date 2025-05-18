using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Metadata.Profiles.Exif;
using System.Globalization;
using Foxel.Models;
using SixLabors.ImageSharp.PixelFormats;

namespace Foxel.Utils;

/// <summary>
/// 图片处理工具类
/// </summary>
public static class ImageHelper
{
    /// <summary>
    /// 获取完整URL路径
    /// </summary>
    /// <param name="serverUrl">服务器URL</param>
    /// <param name="relativePath">相对路径</param>
    /// <returns>完整URL路径</returns>
    public static string GetFullPath(string serverUrl, string relativePath)
    {
        if (string.IsNullOrEmpty(relativePath))
            return string.Empty;
        if (relativePath.StartsWith("https://"))
            return relativePath;
        return $"{serverUrl.TrimEnd('/')}{relativePath}";
    }

    /// <summary>
    /// 创建缩略图
    /// </summary>
    /// <param name="originalPath">原始图片路径</param>
    /// <param name="thumbnailPath">缩略图保存路径</param>
    /// <param name="width">缩略图宽度</param>
    /// <param name="quality">压缩质量(1-100)</param>
    /// <returns>生成的缩略图的文件大小（字节）</returns>
    public static async Task<long> CreateThumbnailAsync(string originalPath, string thumbnailPath, int width,
        int quality = 75)
    {
        // 获取原始文件大小
        var originalFileInfo = new FileInfo(originalPath);
        long originalSize = originalFileInfo.Length;

        using var image = await Image.LoadAsync(originalPath);

        // 去除EXIF元数据以减小文件大小
        image.Metadata.ExifProfile = null;

        image.Mutate(x => x.Resize(new ResizeOptions
        {
            Size = new Size(width, 0),
            Mode = ResizeMode.Max
        }));

        string extension = Path.GetExtension(thumbnailPath).ToLower();

        // 根据原图大小动态调整质量
        int adjustedQuality = AdjustQualityByFileSize(originalSize, extension, quality);

        if (extension == ".jpg" || extension == ".jpeg")
        {
            await image.SaveAsJpegAsync(thumbnailPath, new SixLabors.ImageSharp.Formats.Jpeg.JpegEncoder
            {
                Quality = adjustedQuality
            });
        }
        else if (extension == ".png")
        {
            await image.SaveAsPngAsync(thumbnailPath, new SixLabors.ImageSharp.Formats.Png.PngEncoder
            {
                CompressionLevel = SixLabors.ImageSharp.Formats.Png.PngCompressionLevel.BestCompression,
                ColorType = SixLabors.ImageSharp.Formats.Png.PngColorType.RgbWithAlpha, // 确保使用最优的颜色类型
                FilterMethod = SixLabors.ImageSharp.Formats.Png.PngFilterMethod.Adaptive // 使用自适应过滤
            });
        }
        else
        {
            await image.SaveAsync(thumbnailPath);
        }

        var thumbnailFileInfo = new FileInfo(thumbnailPath);
        if (thumbnailFileInfo.Length < originalSize) return thumbnailFileInfo.Length;

        // 再次尝试优化，但不改变扩展名
        if (extension == ".png")
        {
            await image.SaveAsPngAsync(thumbnailPath, new SixLabors.ImageSharp.Formats.Png.PngEncoder
            {
                CompressionLevel = SixLabors.ImageSharp.Formats.Png.PngCompressionLevel.BestCompression,
                FilterMethod = SixLabors.ImageSharp.Formats.Png.PngFilterMethod.Adaptive
            });
            thumbnailFileInfo = new FileInfo(thumbnailPath);
        }
        else if (extension == ".jpg" || extension == ".jpeg")
        {
            // 如果是 JPEG，尝试降低质量进一步压缩
            await image.SaveAsJpegAsync(thumbnailPath, new SixLabors.ImageSharp.Formats.Jpeg.JpegEncoder
            {
                Quality = Math.Max(adjustedQuality - 10, 60) // 再降低质量但不低于60
            });
            thumbnailFileInfo = new FileInfo(thumbnailPath);
        }

        return thumbnailFileInfo.Length;
    }

    /// <summary>
    /// 检查图像是否包含透明像素
    /// </summary>
    /// <param name="image">要检查的图像</param>
    /// <returns>如果图像包含透明像素则返回true</returns>
    private static bool HasTransparency(Image image)
    {
        // 检查图像格式是否支持透明度
        if (image.PixelType.AlphaRepresentation == PixelAlphaRepresentation.None)
        {
            return false; // 图像格式不支持透明度
        }

        // 对于小图片，逐像素检查是否有透明度
        if (image.Width * image.Height <= 1000 * 1000) // 对于不超过1000x1000的图片
        {
            using var imageWithAlpha = image.CloneAs<Rgba32>();

            for (int y = 0; y < imageWithAlpha.Height; y++)
            {
                for (int x = 0; x < imageWithAlpha.Width; x++)
                {
                    if (imageWithAlpha[x, y].A < 255)
                    {
                        return true;
                    }
                }
            }

            return false;
        }
        else
        {
            using var imageWithAlpha = image.CloneAs<Rgba32>();
            int sampleSize = Math.Max(image.Width, image.Height) / 100;
            sampleSize = Math.Max(1, sampleSize);

            for (int y = 0; y < imageWithAlpha.Height; y += sampleSize)
            {
                for (int x = 0; x < imageWithAlpha.Width; x += sampleSize)
                {
                    if (imageWithAlpha[x, y].A < 255)
                    {
                        return true;
                    }
                }
            }

            return false;
        }
    }

    /// <summary>
    /// 根据原始文件大小调整质量参数
    /// </summary>
    private static int AdjustQualityByFileSize(long originalSize, string extension, int baseQuality)
    {
        if (extension == ".jpg" || extension == ".jpeg")
        {
            if (originalSize > 10 * 1024 * 1024) // 10MB
                return Math.Min(baseQuality, 65);
            else if (originalSize > 5 * 1024 * 1024) // 5MB
                return Math.Min(baseQuality, 70);
            else if (originalSize > 1 * 1024 * 1024) // 1MB
                return Math.Min(baseQuality, 75);
        }

        return baseQuality;
    }

    /// <summary>
    /// 将图片转换为Base64编码
    /// </summary>
    /// <param name="imagePath">图片路径</param>
    /// <returns>Base64编码字符串</returns>
    public static async Task<string> ConvertImageToBase64(string imagePath)
    {
        byte[] imageBytes = await File.ReadAllBytesAsync(imagePath);
        return Convert.ToBase64String(imageBytes);
    }

    /// <summary>
    /// 提取图片的EXIF信息
    /// </summary>
    /// <param name="imagePath">图片路径</param>
    /// <returns>EXIF信息对象</returns>
    public static async Task<ExifInfo> ExtractExifInfoAsync(string imagePath)
    {
        var exifInfo = new ExifInfo();

        try
        {
            // 确保文件存在
            if (!File.Exists(imagePath))
            {
                exifInfo.ErrorMessage = "找不到图片文件";
                return exifInfo;
            }

            // 使用ImageSharp读取EXIF信息
            using var image = await Image.LoadAsync(imagePath);
            var exifProfile = image.Metadata.ExifProfile;

            // 添加基本图像信息
            exifInfo.Width = image.Width;
            exifInfo.Height = image.Height;

            if (exifProfile != null)
            {
                // 提取相机信息
                if (exifProfile.TryGetValue(ExifTag.Make, out var make))
                    exifInfo.CameraMaker = make.Value;

                if (exifProfile.TryGetValue(ExifTag.Model, out var model))
                    exifInfo.CameraModel = model.Value;

                if (exifProfile.TryGetValue(ExifTag.Software, out var software))
                    exifInfo.Software = software.Value;

                // 提取拍摄参数
                if (exifProfile.TryGetValue(ExifTag.ExposureTime, out var exposureTime))
                    exifInfo.ExposureTime = exposureTime.Value.ToString();

                if (exifProfile.TryGetValue(ExifTag.FNumber, out var fNumber))
                    exifInfo.Aperture = $"f/{fNumber.Value}";

                if (exifProfile.TryGetValue(ExifTag.ISOSpeedRatings, out var iso))
                {
                    if (iso.Value is { Length: > 0 } isoArray)
                    {
                        exifInfo.IsoSpeed = isoArray[0].ToString();
                    }
                    else
                    {
                        exifInfo.IsoSpeed = iso.Value?.ToString();
                    }
                }

                if (exifProfile.TryGetValue(ExifTag.FocalLength, out var focalLength))
                    exifInfo.FocalLength = $"{focalLength.Value}mm";

                if (exifProfile.TryGetValue(ExifTag.Flash, out var flash))
                    exifInfo.Flash = flash.Value.ToString();

                if (exifProfile.TryGetValue(ExifTag.MeteringMode, out var meteringMode))
                    exifInfo.MeteringMode = meteringMode.Value.ToString();

                if (exifProfile.TryGetValue(ExifTag.WhiteBalance, out var whiteBalance))
                    exifInfo.WhiteBalance = whiteBalance.Value.ToString();

                // 提取时间信息并确保存储为字符串
                if (exifProfile.TryGetValue(ExifTag.DateTimeOriginal, out var dateTime))
                {
                    exifInfo.DateTimeOriginal = dateTime.Value;

                    // 解析日期时间
                    if (DateTime.TryParseExact(dateTime.Value, "yyyy:MM:dd HH:mm:ss", CultureInfo.InvariantCulture,
                            DateTimeStyles.None, out _))
                    {
                        // 只在ExifInfo中保留原始字符串格式
                    }
                }

                // 提取GPS信息
                if (exifProfile.TryGetValue(ExifTag.GPSLatitude, out var latitude) &&
                    exifProfile.TryGetValue(ExifTag.GPSLatitudeRef, out var latitudeRef))
                {
                    string? latRef = latitudeRef.Value;
                    exifInfo.GpsLatitude = ConvertGpsCoordinateToString(latitude.Value, latRef == "S");
                }

                if (exifProfile.TryGetValue(ExifTag.GPSLongitude, out var longitude) &&
                    exifProfile.TryGetValue(ExifTag.GPSLongitudeRef, out var longitudeRef))
                {
                    string? longRef = longitudeRef.Value;
                    exifInfo.GpsLongitude = ConvertGpsCoordinateToString(longitude.Value, longRef == "W");
                }
            }
        }
        catch (Exception ex)
        {
            exifInfo.ErrorMessage = $"提取EXIF信息时出错: {ex.Message}";
        }

        return exifInfo;
    }

    /// <summary>
    /// 将GPS坐标转换为字符串表示
    /// </summary>
    /// <param name="rationals">GPS坐标的有理数数组（度、分、秒）</param>
    /// <param name="isNegative">是否为负值（南纬/西经）</param>
    /// <returns>十进制格式的GPS坐标</returns>
    private static string? ConvertGpsCoordinateToString(Rational[]? rationals, bool isNegative)
    {
        if (rationals == null || rationals.Length < 3)
            return null;

        try
        {
            // 度分秒转换为十进制度
            double degrees = rationals[0].Numerator / (double)rationals[0].Denominator;
            double minutes = rationals[1].Numerator / (double)rationals[1].Denominator;
            double seconds = rationals[2].Numerator / (double)rationals[2].Denominator;

            double coordinate = degrees + (minutes / 60) + (seconds / 3600);

            // 如果是南纬或西经，则为负值
            if (isNegative)
                coordinate = -coordinate;

            return coordinate.ToString(CultureInfo.InvariantCulture);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// 从EXIF信息中解析拍摄时间
    /// </summary>
    /// <param name="dateTimeOriginal">EXIF中的拍摄时间字符串</param>
    /// <returns>UTC格式的日期时间，如果解析失败则返回null</returns>
    public static DateTime? ParseExifDateTime(string? dateTimeOriginal)
    {
        if (string.IsNullOrEmpty(dateTimeOriginal))
            return null;

        if (DateTime.TryParseExact(dateTimeOriginal, "yyyy:MM:dd HH:mm:ss", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var parsedDate))
        {
            return DateTime.SpecifyKind(parsedDate, DateTimeKind.Local).ToUniversalTime();
        }

        return null;
    }
}