using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;

namespace ShelfieAdmin.Tests;

/// <summary>The real Node API from apps/api, on a free port with its own freshly seeded PostgreSQL database (the server DATABASE_URL names, as in CI).</summary>
public sealed partial class LocalApi : IAsyncDisposable
{
    internal static readonly string RepoRoot = FindRepoRoot();
    const string QueryScript =
        "const pg = require('pg'); const c = new pg.Client({ connectionString: process.env.DATABASE_URL }); " +
        "c.connect().then(() => c.query(process.argv[1])).then((r) => { console.log(JSON.stringify(r.rows)); return c.end(); })";

    static readonly string AdminUrl = Environment.GetEnvironmentVariable("DATABASE_URL") ?? "postgres://postgres:postgres@localhost:5432/postgres";
    readonly string dbName;
    readonly string dbUrl;
    readonly Process server;

    public string Url { get; }

    LocalApi(string dbName, string dbUrl, Process server, string url)
    {
        this.dbName = dbName;
        this.dbUrl = dbUrl;
        this.server = server;
        Url = url;
    }

    public static async Task<LocalApi> StartAsync()
    {
        var dbName = $"shelfie_cli_{Guid.NewGuid():N}"[..27];
        await Node(AdminUrl, "-e", QueryScript, $"CREATE DATABASE {dbName}");
        var dbUrl = new UriBuilder(AdminUrl) { Path = $"/{dbName}" }.Uri.ToString();
        await Node(dbUrl, "apps/api/src/seed-cli.ts");

        var port = FreePort();
        var start = NodeStart(dbUrl, "apps/api/src/main.ts");
        start.Environment["PORT"] = port.ToString();
        var server = Process.Start(start)!;
        server.BeginOutputReadLine();
        server.BeginErrorReadLine();
        var api = new LocalApi(dbName, dbUrl, server, $"http://localhost:{port}");

        using var http = new HttpClient();
        for (var i = 0; i < 100; i++)
        {
            try
            {
                if ((await http.GetAsync($"{api.Url}/api/health")).StatusCode == HttpStatusCode.OK) return api;
            }
            catch (HttpRequestException) { }
            await Task.Delay(100);
        }
        await api.DisposeAsync();
        throw new InvalidOperationException("The local API did not start");
    }

    /// <summary>Creates an admin token with the server script and returns its value.</summary>
    public async Task<string> CreateTokenAsync(string scopes = "read,write")
    {
        var output = await Node(dbUrl, "apps/api/src/admin-token.ts", "create", "--name", "laptop", "--scopes", scopes);
        return TokenPattern().Match(output).Value;
    }

    /// <summary>Runs SQL against the API's database, for arranging states such as an expired token.</summary>
    public Task<string> SqlAsync(string sql) =>
        Node(dbUrl, "-e", QueryScript, sql);

    public async ValueTask DisposeAsync()
    {
        if (!server.HasExited) server.Kill(entireProcessTree: true);
        await server.WaitForExitAsync();
        server.Dispose();
        await Node(AdminUrl, "-e", QueryScript, $"DROP DATABASE {dbName} WITH (FORCE)");
    }

    static async Task<string> Node(string dbUrl, params string[] args)
    {
        var start = NodeStart(dbUrl, args);
        using var process = Process.Start(start)!;
        var stdout = process.StandardOutput.ReadToEndAsync();
        var stderr = process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();
        if (process.ExitCode != 0) throw new InvalidOperationException($"node {string.Join(' ', args)} failed: {await stderr}");
        return await stdout;
    }

    static ProcessStartInfo NodeStart(string dbUrl, params string[] args)
    {
        var start = new ProcessStartInfo("node") { WorkingDirectory = RepoRoot, RedirectStandardOutput = true, RedirectStandardError = true };
        foreach (var arg in args) start.ArgumentList.Add(arg);
        start.Environment["DATABASE_URL"] = dbUrl;
        return start;
    }

    static int FreePort()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        return ((IPEndPoint)listener.LocalEndpoint).Port;
    }

    static string FindRepoRoot()
    {
        for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir != null; dir = dir.Parent)
            if (File.Exists(Path.Combine(dir.FullName, "apps", "api", "src", "main.ts"))) return dir.FullName;
        throw new InvalidOperationException("Cannot find the repository root");
    }

    [GeneratedRegex(@"shfa_[A-Za-z0-9_-]{43}")]
    private static partial Regex TokenPattern();
}
