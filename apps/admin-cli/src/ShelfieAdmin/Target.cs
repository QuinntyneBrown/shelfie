namespace ShelfieAdmin;

/// <summary>The Shelfie instance a command talks to.</summary>
public sealed record Target(string BaseUrl)
{
    const string Production = "https://app.shelfie.kids";

    /// <summary>--api-url, else SHELFIE_ADMIN_URL, else production. Plain http is allowed only for this machine (ADR-0005).</summary>
    public static Target Resolve(string? option)
    {
        var url = (option ?? Environment.GetEnvironmentVariable("SHELFIE_ADMIN_URL") ?? Production).TrimEnd('/');
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || (uri.Scheme != "https" && uri.Scheme != "http"))
            throw new CliException($"{url} is not an http or https URL.");
        if (uri.Scheme == "http" && uri.Host != "localhost" && uri.Host != "127.0.0.1")
            throw new CliException($"HTTPS is required for {url}; plain http is allowed only for localhost and 127.0.0.1.");
        return new Target(url);
    }
}
