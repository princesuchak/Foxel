namespace Foxel.Services.Interface;

public interface IAiService
{
    /// <summary>
    /// 分析图像并返回标题和描述
    /// </summary>
    /// <param name="base64Image">Base64格式的图像数据</param>
    /// <returns>图像的标题和描述</returns>
    Task<(string title, string description)> AnalyzeImageAsync(string base64Image);
    
    /// <summary>
    /// 基于描述匹配标签
    /// </summary>
    /// <param name="description">图片描述</param>
    /// <param name="availableTags">可用标签列表</param>
    /// <returns>匹配的标签名称列表</returns>
    Task<List<string>> MatchTagsAsync(string description, List<string> availableTags);
    
    /// <summary>
    /// 直接从图像生成标签
    /// </summary>
    /// <param name="base64Image">Base64格式的图像数据</param>
    /// <param name="availableTags">可用标签列表</param>
    /// <param name="allowNewTags">是否允许生成新标签(不在availableTags中的标签)</param>
    /// <returns>匹配的标签名称列表</returns>
    Task<List<string>> GenerateTagsFromImageAsync(string base64Image, List<string> availableTags, bool allowNewTags = false);

    /// <summary>
    /// 获取文本的嵌入向量
    /// </summary>
    /// <param name="text">需要进行嵌入的文本</param>
    /// <returns>表示文本语义的浮点数组向量</returns>
    Task<float[]> GetEmbeddingAsync(string text);
}
