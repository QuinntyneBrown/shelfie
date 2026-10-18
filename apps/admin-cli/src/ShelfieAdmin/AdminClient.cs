using System.Net.Http.Json;
using System.Text.Json;

namespace ShelfieAdmin;

/// <summary>A successful response: the body as sent, and parsed.</summary>
public sealed record ApiResult(string Json, JsonElement Root);

/// <summary>A response the API refused, read from its problem document.</summary>
public sealed class AdminApiException(int status, string type, string? requestId, JsonElement body) : Exception(type)
{
    public int Status { get; } = status;
    public string Type { get; } = type;
    public string? RequestId { get; } = requestId;
    public JsonElement Body { get; } = body;
}

/// <summary>Calls /api/admin/v1 on the target with the admin token as a bearer token.</summary>
public sealed class AdminClient
{
    static readonly JsonSerializerOptions BodyOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    readonly HttpClient http;

    public AdminClient(Target target, string token)
    {
        http = new HttpClient { BaseAddress = new Uri($"{target.BaseUrl}/api/admin/v1/") };
        http.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", $"Bearer {token}");
    }

    public Task<ApiResult> GetAsync(string path) => SendAsync(HttpMethod.Get, path);

    public async Task<ApiResult> SendAsync(HttpMethod method, string path, object? body = null, bool dryRun = false)
    {
        using var request = new HttpRequestMessage(method, dryRun ? $"{path}?dryRun=true" : path);
        if (body != null) request.Content = JsonContent.Create(body, options: BodyOptions);
        using var response = await http.SendAsync(request);
        var json = await response.Content.ReadAsStringAsync();
        JsonElement root;
        try
        {
            root = JsonDocument.Parse(json).RootElement.Clone();
        }
        catch (JsonException)
        {
            throw new AdminApiException((int)response.StatusCode, $"http-{(int)response.StatusCode}", null, default);
        }
        if (response.IsSuccessStatusCode) return new ApiResult(json, root);
        throw new AdminApiException(
            (int)response.StatusCode,
            root.TryGetProperty("type", out var type) ? type.GetString() ?? "unknown" : "unknown",
            root.TryGetProperty("requestId", out var id) ? id.GetString() : null,
            root);
    }
}
