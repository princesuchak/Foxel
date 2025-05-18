using System.Net.Http.Headers;
using System.Text.Json.Serialization;
using Foxel.Services.Interface;
using Foxel.Utils;

namespace Foxel.Services;

public class AiService : IAiService
{
    private readonly HttpClient _httpClient;
    private readonly IConfigService _configService;

    public AiService(HttpClient httpClient, IConfigService configService)
    {
        _httpClient = httpClient;
        _configService = configService;
        string apiKey = _configService["AI:ApiKey"];
        string baseUrl = _configService["AI:ApiEndpoint"];
        _httpClient.BaseAddress = new Uri(baseUrl);
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
    }

    public async Task<(string title, string description)> AnalyzeImageAsync(string base64Image)
    {
        try
        {
            string model = _configService["AI:Model"];
            var imageUrl = new ImageUrl
            {
                Url = $"data:image/jpeg;base64,{base64Image}"
            };

            var imageContent = new ImageUrlContent
            {
                Type = "image_url",
                ImageUrl = imageUrl
            };

            var textContent = new TextContent
            {
                Type = "text",
                Text =
                    "请详细分析这张图片，并提供全面的描述，以便用于向量嵌入和基于文本的图像搜索。描述需要包含：主体对象、场景环境、色彩特点、构图布局、风格特征、情绪氛围、细节特征等关键元素。请提供一个简短有力的标题，然后提供详细描述。\n\n请以JSON格式返回，格式如下：\n{\"title\": \"简短概括图片的核心内容\", \"description\": \"全面详细的描述，包含上述所有元素，使用丰富精确的词汇，避免笼统表达\"}\n\n请确保返回有效的JSON格式。"
            };

            var message = new ChatMessage
            {
                Role = "user",
                Content = new MessageContent[] { imageContent, textContent }
            };

            var requestContent = new ChatCompletionRequest
            {
                Model = model,
                Messages = [message],
                Stream = false,
                MaxTokens = 800,
                Temperature = 0.5,
                TopP = 0.8,
                TopK = 50
            };

            var response = await _httpClient.PostAsJsonAsync("/v1/chat/completions", requestContent);
            response.EnsureSuccessStatusCode();

            var responseContent = await response.Content.ReadFromJsonAsync<AiResponse>();
            if (responseContent?.Choices == null || responseContent.Choices.Length == 0)
            {
                return ("未能获取标题", "未能获取描述");
            }

            var aiMessage = responseContent.Choices[0].Message.Content;
            return AiHelper.ExtractTitleAndDescription(aiMessage);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"AI分析图片时出错: {ex.Message}");
            return ("处理失败", $"AI分析过程中发生错误: {ex.Message}");
        }
    }

    public async Task<List<string>> MatchTagsAsync(string description, List<string> availableTags)
    {
        try
        {
            if (availableTags.Count == 0)
                return new List<string>();

            string model = _configService["AI:Model"] ?? "deepseek-ai/deepseek-vl2"; // Assuming model can still be dynamic or default
            var tagsText = string.Join(", ", availableTags);
            var textContent = new TextContent
            {
                Type = "text",
                Text =
                    $"以下是一组标签：[{tagsText}]。\n\n请从这些标签中严格选择与下面描述内容高度相关的标签（最多选择5个）。只选择确实匹配的标签，如果找不到完全匹配或高度相关的标签，宁可返回空数组也不要选择不太相关的标签。\n\n描述内容：{description}\n\n请以JSON格式返回，格式如下：\n{{\"tags\": [\"标签1\", \"标签2\", \"标签3\"]}}\n\n请确保返回有效的JSON格式前面不要加```，并且只包含确实匹配的标签名称。"
            };

            var message = new ChatMessage
            {
                Role = "user",
                Content = new MessageContent[] { textContent }
            };

            var requestContent = new ChatCompletionRequest
            {
                Model = model,
                Messages = new ChatMessage[] { message },
                Stream = false,
                MaxTokens = 200,
                Temperature = 0.1, // 降低温度使结果更确定性
                TopP = 0.95,
                TopK = 50
            };

            var response = await _httpClient.PostAsJsonAsync("/v1/chat/completions", requestContent);
            response.EnsureSuccessStatusCode();

            var responseContent = await response.Content.ReadFromJsonAsync<AiResponse>();
            if (responseContent?.Choices == null || responseContent.Choices.Length == 0)
            {
                return new List<string>();
            }

            var aiMessage = responseContent.Choices[0].Message.Content;

            if (string.IsNullOrEmpty(aiMessage))
                return new List<string>();

            if (aiMessage.Contains("{") && aiMessage.Contains("}"))
            {
                try
                {
                    int jsonStartIndex = aiMessage.IndexOf('{');
                    int jsonEndIndex = aiMessage.LastIndexOf('}') + 1;

                    if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex)
                    {
                        string jsonPart = aiMessage[jsonStartIndex..jsonEndIndex];
                        var options = new System.Text.Json.JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        };

                        var result =
                            System.Text.Json.JsonSerializer.Deserialize<AiHelper.TagsResult>(jsonPart, options);
                        if (result is { Tags.Length: > 0 })
                        {
                            // 确保返回的标签真的在可用标签列表中
                            var availableTagsSet = new HashSet<string>(availableTags, StringComparer.OrdinalIgnoreCase);
                            var matchedTags = new List<string>();

                            foreach (var tagName in result.Tags)
                            {
                                if (string.IsNullOrWhiteSpace(tagName))
                                    continue;

                                // 找到大小写完全匹配的标签
                                var exactMatch = availableTags.FirstOrDefault(t =>
                                    string.Equals(t, tagName, StringComparison.OrdinalIgnoreCase));

                                if (exactMatch != null)
                                {
                                    matchedTags.Add(exactMatch);
                                }
                            }

                            return matchedTags.Distinct().ToList();
                        }
                    }
                }
                catch (System.Text.Json.JsonException)
                {
                    // JSON解析失败，返回空列表
                    return new List<string>();
                }
            }

            // 解析失败或没有找到匹配标签，返回空列表
            return new List<string>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"AI匹配标签时出错: {ex.Message}");
            return new List<string>();
        }
    }

    public async Task<List<string>> GenerateTagsFromImageAsync(string base64Image, List<string> availableTags,
        bool allowNewTags = false)
    {
        try
        {

            string model = _configService["AI:Model"] ?? "deepseek-ai/deepseek-vl2"; // Assuming model can still be dynamic or default

            var imageUrl = new ImageUrl
            {
                Url = $"data:image/jpeg;base64,{base64Image}"
            };

            var imageContent = new ImageUrlContent
            {
                Type = "image_url",
                ImageUrl = imageUrl
            };

            string promptText;

            if (allowNewTags)
            {
                // 如果允许新标签，则提供现有标签作为参考，但允许生成新标签
                promptText = availableTags.Count > 0
                    ? $"可以参考这些现有标签：[{string.Join(", ", availableTags)}]，但也可以生成其他与图片内容相关的新标签。\n\n请为图片生成5个最相关的标签，优先使用已有标签，但如果有更恰当的新标签也可以使用。\n\n请以JSON格式返回，格式如下：\n{{\"tags\": [\"标签1\", \"标签2\", \"标签3\", \"标签4\", \"标签5\"]}}\n\n请确保返回有效的JSON格式。"
                    : "请为图片生成5个最相关的标签，每个标签应该是简短且描述性的词语或短语。\n\n请以JSON格式返回，格式如下：\n{\"tags\": [\"标签1\", \"标签2\", \"标签3\", \"标签4\", \"标签5\"]}\n\n请确保返回有效的JSON格式。";
            }
            else
            {
                // 如果不允许新标签，则只能从已有标签中选择
                if (availableTags.Count == 0)
                    return new List<string>();

                var tagsText = string.Join(", ", availableTags);
                promptText =
                    $"以下是一组标签：[{tagsText}]。\n\n请从这些标签中严格选择与图片内容高度相关的标签（最多选择5个）。只选择确实匹配的标签，如果找不到完全匹配或高度相关的标签，宁可返回空数组也不要选择不太相关的标签。\n\n请以JSON格式返回，格式如下：\n{{\"tags\": [\"标签1\", \"标签2\", \"标签3\"]}}\n\n请确保返回有效的JSON格式，并且只包含上述列表中的标签名称。";
            }

            var textContent = new TextContent
            {
                Type = "text",
                Text = promptText
            };

            var message = new ChatMessage
            {
                Role = "user",
                Content = new MessageContent[] { imageContent, textContent }
            };

            var requestContent = new ChatCompletionRequest
            {
                Model = model,
                Messages = new ChatMessage[] { message },
                Stream = false,
                MaxTokens = 200,
                Temperature = 0.1, // 降低温度使结果更确定性
                TopP = 0.95,
                TopK = 50
            };

            var response = await _httpClient.PostAsJsonAsync("/v1/chat/completions", requestContent);
            response.EnsureSuccessStatusCode();

            var responseContent = await response.Content.ReadFromJsonAsync<AiResponse>();
            if (responseContent?.Choices == null || responseContent.Choices.Length == 0)
            {
                return new List<string>();
            }

            var aiMessage = responseContent.Choices[0].Message.Content;

            if (string.IsNullOrEmpty(aiMessage))
                return new List<string>();

            if (aiMessage.Contains("{") && aiMessage.Contains("}"))
            {
                try
                {
                    int jsonStartIndex = aiMessage.IndexOf('{');
                    int jsonEndIndex = aiMessage.LastIndexOf('}') + 1;

                    if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex)
                    {
                        string jsonPart = aiMessage[jsonStartIndex..jsonEndIndex];
                        var options = new System.Text.Json.JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        };

                        var result =
                            System.Text.Json.JsonSerializer.Deserialize<AiHelper.TagsResult>(jsonPart, options);
                        if (result is { Tags.Length: > 0 })
                        {
                            var matchedTags = new List<string>();

                            foreach (var tagName in result.Tags)
                            {
                                if (string.IsNullOrWhiteSpace(tagName))
                                    continue;

                                // 如果允许新标签，直接添加
                                if (allowNewTags)
                                {
                                    matchedTags.Add(tagName.Trim());
                                }
                                else
                                {
                                    // 否则只添加已有标签列表中的标签
                                    var exactMatch = availableTags.FirstOrDefault(t =>
                                        string.Equals(t, tagName, StringComparison.OrdinalIgnoreCase));

                                    if (exactMatch != null)
                                    {
                                        matchedTags.Add(exactMatch);
                                    }
                                }
                            }

                            return matchedTags.Distinct().ToList();
                        }
                    }
                }
                catch (System.Text.Json.JsonException)
                {
                    // JSON解析失败，返回空列表
                    return new List<string>();
                }
            }

            // 解析失败或没有找到匹配标签，返回空列表
            return new List<string>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"AI从图片生成标签时出错: {ex.Message}");
            return new List<string>();
        }
    }

    public async Task<float[]> GetEmbeddingAsync(string text)
    {
        try
        {

            string model = _configService["AI:EmbeddingModel"];

            var requestContent = new
            {
                model = model,
                input = text,
                encoding_format = "float"
            };

            var response = await _httpClient.PostAsJsonAsync("/v1/embeddings", requestContent);
            response.EnsureSuccessStatusCode();

            var embedResult = await response.Content.ReadFromJsonAsync<EmbeddingResponse>();
            if (embedResult?.Data == null || embedResult.Data.Length == 0)
            {
                Console.WriteLine("嵌入向量API返回空结果");
                return Array.Empty<float>();
            }

            return embedResult.Data[0].Embedding;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"获取嵌入向量时出错: {ex.Message}");
            return Array.Empty<float>();
        }
    }

    // 从EmbeddingService移植的私有记录类
    private record EmbeddingResponse
    {
        [JsonPropertyName("data")] public EmbeddingData[] Data { get; set; } = Array.Empty<EmbeddingData>();
    }

    private record EmbeddingData
    {
        [JsonPropertyName("embedding")] public float[] Embedding { get; set; } = Array.Empty<float>();
    }

    private class AiResponse
    {
        [JsonPropertyName("choices")] public Choice[] Choices { get; set; } = Array.Empty<Choice>();
    }

    private class Choice
    {
        [JsonPropertyName("message")] public Message Message { get; set; } = new Message();
    }

    private class Message
    {
        [JsonPropertyName("content")] public string Content { get; set; } = string.Empty;
    }
}

public class ChatCompletionRequest
{
    [JsonPropertyName("model")] public string Model { get; set; } = string.Empty;

    [JsonPropertyName("messages")] public ChatMessage[] Messages { get; set; } = Array.Empty<ChatMessage>();

    [JsonPropertyName("stream")] public bool Stream { get; set; }

    [JsonPropertyName("max_tokens")] public int MaxTokens { get; set; }

    [JsonPropertyName("temperature")] public double Temperature { get; set; }

    [JsonPropertyName("top_p")] public double TopP { get; set; }

    [JsonPropertyName("top_k")] public int TopK { get; set; }
}

public class ChatMessage
{
    [JsonPropertyName("role")] public string Role { get; set; } = string.Empty;

    [JsonPropertyName("content")] public MessageContent[] Content { get; set; } = Array.Empty<MessageContent>();
}

[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(TextContent), typeDiscriminator: "text")]
[JsonDerivedType(typeof(ImageUrlContent), typeDiscriminator: "image_url")]
public abstract class MessageContent
{
    [JsonPropertyName("type")] public string Type { get; set; } = string.Empty;
}

public class TextContent : MessageContent
{
    [JsonPropertyName("text")] public string Text { get; set; } = string.Empty;
}

public class ImageUrlContent : MessageContent
{
    [JsonPropertyName("image_url")] public ImageUrl ImageUrl { get; set; } = new();
}

public class ImageUrl
{
    [JsonPropertyName("url")] public string Url { get; set; } = string.Empty;
}