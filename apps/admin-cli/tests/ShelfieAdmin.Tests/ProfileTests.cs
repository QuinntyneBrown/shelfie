// Acceptance Test
// Traces to: L2-168, L2-062, L2-063
// Description: List authors and volunteers, approve and hide their profiles, with dry run and refusals.

using System.Net.Http.Json;
using System.Text.Json;

namespace ShelfieAdmin.Tests;

public class ProfileTests
{
    static string[] Lines(CliRun run) => run.Stdout.Split('\n', StringSplitOptions.RemoveEmptyEntries);

    /// <summary>Rosa joins as an author and Sam as a volunteer through the web app's own route; returns their ids.</summary>
    static async Task<(string Rosa, string Sam)> JoinAsync(LocalApi api)
    {
        using var http = new HttpClient();
        foreach (var (kind, name, username) in new[] { ("author", "Rosa Delgado", "rosawrites"), ("volunteer", "Sam Okafor", "samreads") })
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{api.Url}/api/auth/join")
            {
                Content = JsonContent.Create(new { kind, name, email = $"{username}@example.com", username, password = "long-enough-1" }),
            };
            request.Headers.Add("X-Requested-With", "Shelfie");
            (await http.SendAsync(request)).EnsureSuccessStatusCode();
        }
        var rows = JsonDocument.Parse(await api.SqlAsync("SELECT id, username FROM profile WHERE household_id IS NULL")).RootElement;
        string IdOf(string username) => rows.EnumerateArray().Single(r => r.GetProperty("username").GetString() == username).GetProperty("id").GetString()!;
        return (IdOf("rosawrites"), IdOf("samreads"));
    }

    static async Task<string> StatusAsync(LocalApi api, string id) =>
        JsonDocument.Parse(await api.SqlAsync($"SELECT status FROM directory_profile WHERE profile_id = '{id}'")).RootElement[0].GetProperty("status").GetString()!;

    [Fact]
    public async Task Given_profiles_list_then_each_author_and_volunteer_is_shown_waiting_with_kind_and_e_mail()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api, "read");
        var (rosa, sam) = await JoinAsync(api);

        var run = await AdminCli.RunAsync(api, "profiles", "list");

        Assert.Equal(0, run.ExitCode);
        Assert.Matches(@"^ID\s+KIND\s+NAME\s+EMAIL\s+STATUS\s+BOOKS\s+ABOUT$", Lines(run)[0].TrimEnd());
        Assert.Matches($@"^{rosa}\s+author\s+Rosa Delgado\s+rosawrites@example.com\s+pending\s+0\s*$", Lines(run).Single(l => l.StartsWith(rosa)));
        Assert.Matches($@"^{sam}\s+volunteer\s+Sam Okafor\s+samreads@example.com\s+pending\s+0\s*$", Lines(run).Single(l => l.StartsWith(sam)));
    }

    [Fact]
    public async Task Given_profiles_list_with_json_then_stdout_is_the_API_JSON_with_what_they_wrote()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api, "read");
        var (rosa, _) = await JoinAsync(api);

        var run = await AdminCli.RunAsync(api, "profiles", "list", "--json");

        Assert.Equal(0, run.ExitCode);
        var first = JsonDocument.Parse(run.Stdout).RootElement.EnumerateArray().Single(p => p.GetProperty("id").GetString() == rosa);
        Assert.Equal("author", first.GetProperty("kind").GetString());
        Assert.Equal(JsonValueKind.Null, first.GetProperty("website").ValueKind);
    }

    [Fact]
    public async Task Given_approve_then_the_profile_is_approved_and_the_operator_is_told_whose()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);
        var (rosa, _) = await JoinAsync(api);

        var run = await AdminCli.RunAsync(api, "profiles", "approve", rosa);

        Assert.Equal(0, run.ExitCode);
        Assert.Equal($"Approved Rosa Delgado (author, {rosa}).", run.Stdout.Trim());
        Assert.Equal("approved", await StatusAsync(api, rosa));
    }

    [Fact]
    public async Task Given_hide_with_dry_run_then_nothing_changes_and_hide_then_hides_it()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);
        var (_, sam) = await JoinAsync(api);
        await AdminCli.RunAsync(api, "profiles", "approve", sam);

        var dryRun = await AdminCli.RunAsync(api, "profiles", "hide", sam, "--dry-run");

        Assert.Equal(0, dryRun.ExitCode);
        Assert.Equal($"Dry run: would hide Sam Okafor (volunteer, {sam}).", dryRun.Stdout.Trim());
        Assert.Equal("approved", await StatusAsync(api, sam));

        var run = await AdminCli.RunAsync(api, "profiles", "hide", sam);

        Assert.Equal($"Hid Sam Okafor (volunteer, {sam}).", run.Stdout.Trim());
        Assert.Equal("hidden", await StatusAsync(api, sam));
    }

    [Fact]
    public async Task Given_a_parent_s_id_then_approve_is_refused_with_not_a_directory_profile()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);

        var run = await AdminCli.RunAsync(api, "profiles", "approve", "p-dad");

        Assert.Equal(1, run.ExitCode);
        Assert.Matches(@"Refused: not-a-directory-profile\. \(SHF-[0-9A-F]{4}\)$", run.Stderr.Trim());
    }
}
