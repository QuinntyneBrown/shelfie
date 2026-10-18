// Acceptance Test
// Traces to: L2-059, L2-062
// Description: Reset a parent's password from hidden prompts, after a preview and confirmation.

using System.Net;
using System.Net.Http.Json;

namespace ShelfieAdmin.Tests;

public class ResetPasswordTests
{
    const string NewPassword = "brand-new-pass";

    static async Task<HttpStatusCode> SignInAsync(LocalApi api, string password)
    {
        using var http = new HttpClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{api.Url}/api/auth/password")
        {
            Content = JsonContent.Create(new { username = "dad", password, remember = true }),
        };
        request.Headers.Add("X-Requested-With", "Shelfie");
        return (await http.SendAsync(request)).StatusCode;
    }

    [Fact]
    public async Task Given_a_new_password_typed_twice_and_confirmed_then_the_parent_signs_in_with_it_only()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);

        var run = await AdminCli.RunAsync(["users", "reset-password", "p-dad", "--api-url", api.Url], stdin: $"{NewPassword}\n{NewPassword}\ny\n");

        Assert.Equal(0, run.ExitCode);
        Assert.Contains("New password:", run.Stderr);
        Assert.Contains("Continue? [y/N]", run.Stderr);
        Assert.Equal(
            ["Dry run: would set a new password for Dad (p-dad) and end 0 session(s).", "Set a new password for Dad (p-dad) and ended 0 session(s)."],
            run.Stdout.Trim().Split('\n'));
        Assert.DoesNotContain(NewPassword, run.Stdout + run.Stderr);
        Assert.Equal(HttpStatusCode.OK, await SignInAsync(api, NewPassword));
        Assert.Equal(HttpStatusCode.Unauthorized, await SignInAsync(api, "sunny-days-42"));
    }

    [Theory]
    [InlineData("brand-new-pass\nbrand-new-pasS\n", "The two passwords differ.")]
    [InlineData("short\nshort\n", "The password must be at least 8 characters.")]
    public async Task Given_passwords_that_differ_or_are_short_then_no_change_is_sent(string typed, string message)
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);

        var run = await AdminCli.RunAsync(["users", "reset-password", "p-dad", "--api-url", api.Url], stdin: typed + "y\n");

        Assert.Equal(1, run.ExitCode);
        Assert.EndsWith(message, run.Stderr.Trim());
        Assert.Equal("", run.Stdout);
        Assert.Equal(HttpStatusCode.OK, await SignInAsync(api, "sunny-days-42"));
    }

    [Fact]
    public async Task Given_a_reader_then_the_change_is_refused_with_not_a_parent()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);

        var run = await AdminCli.RunAsync(["users", "reset-password", "p-nia", "--yes", "--api-url", api.Url], stdin: $"{NewPassword}\n{NewPassword}\n");

        Assert.Equal(1, run.ExitCode);
        Assert.Matches(@"Refused: not-a-parent\. \(SHF-[0-9A-F]{4}\)$", run.Stderr.Trim());
    }
}
