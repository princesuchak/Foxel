namespace Foxel.Models.DataBase;

public class AlbumPicture
{
    public int Id { get; set; }
    public int AlbumId { get; set; }
    public int PictureId { get; set; }
    
    // 导航属性
    public Album? Album { get; set; }
    public Picture? Picture { get; set; }
}
