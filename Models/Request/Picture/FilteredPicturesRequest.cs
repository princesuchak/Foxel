using System.ComponentModel.DataAnnotations;

namespace Foxel.Models.Request.Picture
{
    public class FilteredPicturesRequest
    {
        [Range(1, int.MaxValue, ErrorMessage = "页码必须大于0")]
        public int Page { get; set; } = 1;

        [Range(1, 100, ErrorMessage = "每页数量必须在1-100之间")]
        public int PageSize { get; set; } = 8;

        public string? SearchQuery { get; set; }

        public string? Tags { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public string? SortBy { get; set; } = "newest";

        public bool OnlyWithGps { get; set; } = false;

        public bool UseVectorSearch { get; set; } = false;

        public double SimilarityThreshold { get; set; } = 0.36;

        public int? ExcludeAlbumId { get; set; }

        public int? AlbumId { get; set; }

        public bool OnlyFavorites { get; set; } = false;

        public int? OwnerId { get; set; }

        public bool IncludeAllPublic { get; set; } = false;
    }
}