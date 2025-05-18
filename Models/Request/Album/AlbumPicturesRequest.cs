namespace Foxel.Models.Request.Album;

public class AlbumPicturesRequest
{
    public int AlbumId { get; set; }
    public List<int> PictureIds { get; set; } = new();
}
