namespace Foxel.Models.Request.Picture;

public class SearchPicturesByTextRequest
{
    public string Query { get; set; } = string.Empty;
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 8;
    public double SimilarityThreshold { get; set; } = 0.36;
}
