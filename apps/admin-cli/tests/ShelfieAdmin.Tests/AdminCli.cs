using System.Diagnostics;

namespace ShelfieAdmin.Tests;

public sealed record CliRun(int ExitCode, string Stdout, string Stderr);

/// <summary>Runs the built shelfie-admin tool as a child process, the way the operator runs it.</summary>
public static class AdminCli
{
    static readonly string Tool = Path.Combine(AppContext.BaseDirectory, "ShelfieAdmin.dll");

    public static async Task<CliRun> RunAsync(string[] args, string? stdin = null, IDictionary<string, string>? env = null)
    {
        var start = new ProcessStartInfo("dotnet")
        {
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };
        start.ArgumentList.Add(Tool);
        foreach (var arg in args) start.ArgumentList.Add(arg);
        start.Environment.Remove("SHELFIE_ADMIN_URL");
        foreach (var (key, value) in env ?? new Dictionary<string, string>()) start.Environment[key] = value;

        using var process = Process.Start(start)!;
        var stdout = process.StandardOutput.ReadToEndAsync();
        var stderr = process.StandardError.ReadToEndAsync();
        if (stdin != null) await process.StandardInput.WriteAsync(stdin);
        process.StandardInput.Close();
        await process.WaitForExitAsync();
        return new CliRun(process.ExitCode, await stdout, await stderr);
    }

    /// <summary>Runs a command against the local API.</summary>
    public static Task<CliRun> RunAsync(LocalApi api, params string[] args) => RunAsync([.. args, "--api-url", api.Url]);

    /// <summary>Signs the tool in to the local API with a new token and returns the token.</summary>
    public static async Task<string> LoginAsync(LocalApi api, string scopes = "read,write")
    {
        var token = await api.CreateTokenAsync(scopes);
        var run = await RunAsync(["login", "--api-url", api.Url], stdin: token + "\n");
        if (run.ExitCode != 0) throw new InvalidOperationException($"login failed: {run.Stderr}");
        return token;
    }
}
