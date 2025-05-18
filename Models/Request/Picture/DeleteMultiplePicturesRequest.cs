namespace Foxel.Models.Request.Picture;

public class DeleteMultiplePicturesRequest
{
    public List<int> PictureIds { get; set; } = new();
}
