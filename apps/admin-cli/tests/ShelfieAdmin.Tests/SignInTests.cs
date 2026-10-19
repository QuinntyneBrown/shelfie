// Acceptance Test
// Traces to: L2-054, L2-055, L2-063
// Description: Sign the CLI in with an admin token, choose the target, and fail clearly without a usable token.

using System.Text.Json;

namespace ShelfieAdmin.Tests;

public class SignInTests
{
    [Fact]
    public async Task Given_a_valid_token_when_login_runs_then_it_is_stored_and_whoami_shows_the_token_without_its_value()
    {
        await using var api = await LocalApi.StartAsync();
        var token = await api.CreateTokenAsync("read");

        var login = await AdminCli.RunAsync(["login", "--api-url", api.Url], stdin: token + "\n");
        var whoami = await AdminCli.RunAsync(api, "whoami");

        Assert.Equal(0, login.ExitCode);
        Assert.Contains($"Signed in to {api.Url} as laptop (read)", login.Stdout);
        Assert.Equal(0, whoami.ExitCode);
        Assert.Contains("laptop", whoami.Stdout);
        Assert.Contains("read", whoami.Stdout);
        Assert.Contains(DateTime.UtcNow.AddDays(30).ToString("yyyy-MM-dd"), whoami.Stdout);
        foreach (var output in new[] { login.Stdout, login.Stderr, whoami.Stdout, whoami.Stderr })
            Assert.DoesNotContain(token, output);
    }

    [Fact]
    public async Task Given_json_when_whoami_runs_then_only_the_API_JSON_is_printed()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api, "read");

        var whoami = await AdminCli.RunAsync(api, "whoami", "--json");

        Assert.Equal(0, whoami.ExitCode);
        using var json = JsonDocument.Parse(whoami.Stdout);
        Assert.Equal("laptop", json.RootElement.GetProperty("name").GetString());
        Assert.Equal(["id", "name", "scopes", "expiresAt"], json.RootElement.EnumerateObject().Select(p => p.Name));
    }

    [Fact]
    public async Task Given_a_token_the_API_refuses_when_login_runs_then_nothing_is_stored_and_the_exit_code_is_2()
    {
        await using var api = await LocalApi.StartAsync();

        var login = await AdminCli.RunAsync(["login", "--api-url", api.Url], stdin: "shfa_" + new string('x', 43) + "\n");
        var whoami = await AdminCli.RunAsync(api, "whoami");

        Assert.Equal(2, login.ExitCode);
        Assert.Contains("not a valid admin token", login.Stderr);
        Assert.Equal("", login.Stdout);
        Assert.Equal(2, whoami.ExitCode);
        Assert.Contains("No admin token", whoami.Stderr);
    }

    [Fact]
    public async Task Given_no_stored_token_when_a_command_runs_then_it_says_to_log_in_and_exits_2_without_output()
    {
        await using var api = await LocalApi.StartAsync();

        var run = await AdminCli.RunAsync(api, "whoami");

        Assert.Equal(2, run.ExitCode);
        Assert.Equal($"No admin token for {api.Url}. Run: shelfie-admin login --api-url {api.Url}", run.Stderr.Trim());
        Assert.Equal("", run.Stdout);
    }

    [Fact]
    public async Task Given_an_expired_token_when_a_command_runs_then_it_names_the_expiry_and_exits_2()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);
        await api.SqlAsync("UPDATE admin_token SET expires_at = '2026-01-02T03:04:05.000Z'");

        var run = await AdminCli.RunAsync(api, "whoami");

        Assert.Equal(2, run.ExitCode);
        Assert.Matches(@"^The admin token expired on 2026-01-02T03:04:05\.000Z\. Create a new token and run shelfie-admin login\. \(SHF-[0-9A-F]{4}\)$", run.Stderr.Trim());
    }

    [Fact]
    public async Task Given_a_revoked_token_when_a_command_runs_then_it_says_so_and_exits_2()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);
        await api.SqlAsync("UPDATE admin_token SET revoked_at = '2026-10-18T00:00:00.000Z'");

        var run = await AdminCli.RunAsync(api, "whoami");

        Assert.Equal(2, run.ExitCode);
        Assert.StartsWith("The admin token was revoked. Create a new token and run shelfie-admin login.", run.Stderr.Trim());
    }

    [Fact]
    public async Task Given_logout_then_the_stored_token_is_removed()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);

        var logout = await AdminCli.RunAsync(api, "logout");
        var whoami = await AdminCli.RunAsync(api, "whoami");

        Assert.Equal(0, logout.ExitCode);
        Assert.Contains($"Signed out of {api.Url}", logout.Stdout);
        Assert.Equal(2, whoami.ExitCode);
    }

    [Fact]
    public async Task Given_no_option_and_no_variable_then_the_target_is_production()
    {
        var run = await AdminCli.RunAsync(["whoami"]);

        Assert.Equal(2, run.ExitCode);
        Assert.StartsWith("No admin token for https://app.shelfie.kids.", run.Stderr.Trim());
    }

    [Fact]
    public async Task Given_SHELFIE_ADMIN_URL_then_it_is_the_target_and_api_url_wins_over_it()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);
        var env = new Dictionary<string, string> { ["SHELFIE_ADMIN_URL"] = api.Url };

        var fromVariable = await AdminCli.RunAsync(["whoami"], env: env);
        var fromOption = await AdminCli.RunAsync(["whoami", "--api-url", "http://localhost:1"], env: env);

        Assert.Equal(0, fromVariable.ExitCode);
        Assert.Contains("laptop", fromVariable.Stdout);
        Assert.Equal(2, fromOption.ExitCode);
        Assert.Contains("No admin token for http://localhost:1.", fromOption.Stderr);
    }

    [Fact]
    public async Task Given_an_http_URL_that_is_not_local_then_the_command_fails_before_any_request()
    {
        var run = await AdminCli.RunAsync(["login", "--api-url", "http://app.shelfie.kids"], stdin: "anything\n");

        Assert.Equal(1, run.ExitCode);
        Assert.Contains("HTTPS is required for http://app.shelfie.kids", run.Stderr);
    }

    [Fact]
    public async Task Given_an_API_that_cannot_be_reached_then_the_message_names_it_and_the_exit_code_is_1()
    {
        var run = await AdminCli.RunAsync(["login", "--api-url", "http://127.0.0.1:1"], stdin: "shfa_x\n");

        Assert.Equal(1, run.ExitCode);
        Assert.EndsWith("Cannot reach http://127.0.0.1:1.", run.Stderr.Trim());
        Assert.Equal("", run.Stdout);
    }

    [Fact]
    public async Task Given_help_then_every_command_and_option_is_listed()
    {
        var run = await AdminCli.RunAsync(["--help"]);

        Assert.Equal(0, run.ExitCode);
        foreach (var name in new[] { "login", "logout", "whoami", "--api-url", "--json", "--version" })
            Assert.Contains(name, run.Stdout);
    }
}
