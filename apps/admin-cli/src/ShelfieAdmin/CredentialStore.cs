using System.ComponentModel;
using System.Diagnostics;

namespace ShelfieAdmin;

/// <summary>Keeps one admin token per base URL in the OS credential store (ADR-0002). The token never touches a command line or a file.</summary>
public static class CredentialStore
{
    const string Service = "shelfie-admin";

    public static void Save(string baseUrl, string token)
    {
        if (OperatingSystem.IsWindows()) WindowsCredentials.Write($"{Service}:{baseUrl}", token);
        else if (OperatingSystem.IsMacOS()) Require(Run("security", ["-i"], $"add-generic-password -U -s {Service} -a {baseUrl} -w {token}\n"));
        else Require(Run("secret-tool", ["store", "--label", $"{Service} {baseUrl}", "service", Service, "url", baseUrl], token));
    }

    public static string? Load(string baseUrl)
    {
        if (OperatingSystem.IsWindows()) return WindowsCredentials.Read($"{Service}:{baseUrl}");
        var (exit, stdout, _) = OperatingSystem.IsMacOS()
            ? Run("security", ["find-generic-password", "-s", Service, "-a", baseUrl, "-w"])
            : Run("secret-tool", ["lookup", "service", Service, "url", baseUrl]);
        var token = stdout.Trim();
        return exit == 0 && token.Length > 0 ? token : null;
    }

    public static void Delete(string baseUrl)
    {
        if (OperatingSystem.IsWindows()) WindowsCredentials.Delete($"{Service}:{baseUrl}");
        else if (OperatingSystem.IsMacOS()) Run("security", ["delete-generic-password", "-s", Service, "-a", baseUrl]);
        else Run("secret-tool", ["clear", "service", Service, "url", baseUrl]);
    }

    static void Require((int Exit, string Stdout, string Stderr) run)
    {
        if (run.Exit != 0) throw new CliException($"The OS credential store refused the token: {run.Stderr.Trim()}");
    }

    static (int Exit, string Stdout, string Stderr) Run(string tool, string[] args, string? stdin = null)
    {
        var start = new ProcessStartInfo(tool) { RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true };
        foreach (var arg in args) start.ArgumentList.Add(arg);
        try
        {
            using var process = Process.Start(start)!;
            if (stdin != null) process.StandardInput.Write(stdin);
            process.StandardInput.Close();
            var stdout = process.StandardOutput.ReadToEndAsync();
            var stderr = process.StandardError.ReadToEnd();
            process.WaitForExit();
            return (process.ExitCode, stdout.Result, stderr);
        }
        catch (Win32Exception)
        {
            throw new CliException($"Cannot use the OS credential store: {tool} is not installed{(tool == "secret-tool" ? " (package libsecret-tools)" : "")}.");
        }
    }
}
