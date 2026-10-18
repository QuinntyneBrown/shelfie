// Acceptance Test
// Traces to: L2-054
// Description: The package installs as a .NET tool whose command is shelfie-admin.

using System.Diagnostics;

namespace ShelfieAdmin.Tests;

public class PackagingTests
{
    static async Task<CliRun> Run(string file, params string[] args)
    {
        var start = new ProcessStartInfo(file) { RedirectStandardOutput = true, RedirectStandardError = true };
        foreach (var arg in args) start.ArgumentList.Add(arg);
        using var process = Process.Start(start)!;
        var stdout = process.StandardOutput.ReadToEndAsync();
        var stderr = process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();
        return new CliRun(process.ExitCode, await stdout, await stderr);
    }

    [Fact]
    public async Task Given_the_package_when_installed_as_a_tool_then_shelfie_admin_prints_its_version()
    {
        var packages = Directory.CreateTempSubdirectory("shelfie-admin-nupkg-").FullName;
        var tools = Directory.CreateTempSubdirectory("shelfie-admin-tools-").FullName;
        var project = Path.Combine(LocalApi.RepoRoot, "apps", "admin-cli", "src", "ShelfieAdmin", "ShelfieAdmin.csproj");

        var pack = await Run("dotnet", "pack", project, "-c", "Release", "-o", packages);
        Assert.True(pack.ExitCode == 0, pack.Stdout + pack.Stderr);
        var install = await Run("dotnet", "tool", "install", "ShelfieAdmin", "--tool-path", tools, "--add-source", packages);
        Assert.True(install.ExitCode == 0, install.Stdout + install.Stderr);

        var version = await Run(Path.Combine(tools, OperatingSystem.IsWindows() ? "shelfie-admin.exe" : "shelfie-admin"), "--version");

        Assert.Equal(0, version.ExitCode);
        Assert.Equal("1.0.0", version.Stdout.Trim());
    }
}
