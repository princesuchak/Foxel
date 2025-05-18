namespace Foxel.Models.Request.Picture;

public class UpdatePictureRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public List<string>? Tags { get; set; }
}
