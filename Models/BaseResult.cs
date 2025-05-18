namespace Foxel.Models;

public class BaseResult<T>
{
    public string Message { get; set; } = string.Empty;
    public bool Success { get; set; } = true;
    public T? Data { get; set; }
    public int StatusCode { get; set; } = 200;
}

public class BaseResult
{
    public string Message { get; set; } = string.Empty;
    public bool Success { get; set; } = true;
    public int Data { get; set; }
    public int StatusCode { get; set; } = 200;
}