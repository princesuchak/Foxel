namespace Foxel.Utils;

public static class AiHelper
{
    /// <summary>
    /// 从AI响应中提取标题和描述
    /// </summary>
    /// <param name="aiResponse">AI生成的响应文本</param>
    /// <returns>包含标题和描述的元组</returns>
    public static (string title, string description) ExtractTitleAndDescription(string aiResponse)
    {
        string title = "AI生成的标题";
        string description = "AI生成的描述";

        try
        {
            // 尝试解析JSON响应
            if (aiResponse.Contains("{") && aiResponse.Contains("}"))
            {
                // 提取JSON部分
                int jsonStartIndex = aiResponse.IndexOf('{');
                int jsonEndIndex = aiResponse.LastIndexOf('}') + 1;

                if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex)
                {
                    string jsonPart = aiResponse[jsonStartIndex..jsonEndIndex];
                    var options = new System.Text.Json.JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    };

                    try
                    {
                        var result = System.Text.Json.JsonSerializer.Deserialize<ImageAnalysisResult>(jsonPart, options);
                        if (result != null)
                        {
                            if (!string.IsNullOrWhiteSpace(result.Title))
                                title = result.Title;

                            if (!string.IsNullOrWhiteSpace(result.Description))
                                description = result.Description;

                            return (title, description);
                        }
                    }
                    catch (System.Text.Json.JsonException)
                    {
                        // JSON解析失败，继续尝试文本解析
                    }
                }
            }

            // 回退到文本解析逻辑
            var titleMarker = "标题：";
            var descMarker = "描述：";

            var titleIndex = aiResponse.IndexOf(titleMarker, StringComparison.Ordinal);
            var descIndex = aiResponse.IndexOf(descMarker, StringComparison.Ordinal);

            if (titleIndex >= 0 && descIndex > titleIndex)
            {
                titleIndex += titleMarker.Length;
                var titleEndIndex = descIndex;
                title = aiResponse[titleIndex..titleEndIndex].Trim();

                descIndex += descMarker.Length;
                description = aiResponse[descIndex..].Trim();
            }
            else if (titleIndex >= 0)
            {
                titleIndex += titleMarker.Length;
                title = aiResponse[titleIndex..].Trim();
            }
            else if (descIndex >= 0)
            {
                descIndex += descMarker.Length;
                description = aiResponse[descIndex..].Trim();
            }
            else
            {
                description = aiResponse.Trim();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"解析AI响应时出错: {ex.Message}");
            description = $"原始AI响应: {aiResponse}";
        }

        return (title, description);
    }

    // 用于解析JSON的类
    public class ImageAnalysisResult
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    public class TagsResult
    {
        public string[] Tags { get; set; } = Array.Empty<string>();
    }
}
