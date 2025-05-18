using System.ComponentModel.DataAnnotations;
using Foxel.Models.DataBase;

namespace Foxel.Models.Request.Picture;

public class UploadPictureRequest
{
    [Required] public IFormFile File { get; set; } = null!;

    public int? Permission { get; set; } = 1;

    public int? AlbumId { get; set; } = null;
}