using System.ComponentModel.DataAnnotations;

namespace Foxel.Models.Request.Tag
{
    public class FilteredTagsRequest
    {
        [Range(1, int.MaxValue, ErrorMessage = "页码必须大于0")]
        public int Page { get; set; } = 1;

        [Range(1, 100, ErrorMessage = "每页数量必须在1-100之间")]
        public int PageSize { get; set; } = 20;
        
        public string? SearchQuery { get; set; }
        
        // 排序方式：name, pictureCount, createdAt
        public string? SortBy { get; set; } = "pictureCount";
        
        // 排序方向：asc, desc
        public string? SortDirection { get; set; } = "desc";
    }
}
