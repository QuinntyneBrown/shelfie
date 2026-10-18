// Acceptance Test
// Traces to: L2-060, L2-062, L2-063
// Description: Correct a chapter log's read-on day and delete the newest chapter log, with dry runs and confirmation.

namespace ShelfieAdmin.Tests;

public class LogWriteTests
{
    static async Task<string> LogRow(LocalApi api, string book, string id) =>
        (await AdminCli.RunAsync(api, "logs", "list", "--book", book)).Stdout.Split('\n').Single(l => l.StartsWith(id + " "));

    [Fact]
    public async Task Given_logs_correct_with_a_past_day_then_the_read_on_day_changes()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);

        var run = await AdminCli.RunAsync(api, "logs", "correct", "b-web-c3", "--read-on", "2026-10-11");

        Assert.Equal(0, run.ExitCode);
        Assert.Equal("Moved chapter 3 of Charlotte’s Web from 2026-10-10 to 2026-10-11.", run.Stdout.Trim());
        Assert.Matches(@"^b-web-c3\s+3\s+2026-10-11\s", await LogRow(api, "b-web", "b-web-c3"));
    }

    [Fact]
    public async Task Given_logs_correct_with_dry_run_then_nothing_changes()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);

        var run = await AdminCli.RunAsync(api, "logs", "correct", "b-web-c3", "--read-on", "2026-10-11", "--dry-run");

        Assert.Equal("Dry run: would move chapter 3 of Charlotte’s Web from 2026-10-10 to 2026-10-11.", run.Stdout.Trim());
        Assert.Matches(@"^b-web-c3\s+3\s+2026-10-10\s", await LogRow(api, "b-web", "b-web-c3"));
    }

    [Fact]
    public async Task Given_a_future_day_then_the_correction_is_refused_with_exit_1()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);

        var run = await AdminCli.RunAsync(api, "logs", "correct", "b-web-c3", "--read-on", DateTime.UtcNow.AddDays(2).ToString("yyyy-MM-dd"));

        Assert.Equal(1, run.ExitCode);
        Assert.StartsWith("Refused: future-date.", run.Stderr.Trim());
    }

    static async Task<bool> LogExists(LocalApi api, string book, string id) =>
        (await AdminCli.RunAsync(api, "logs", "list", "--book", book)).Stdout.Contains(id + " ");

    [Fact]
    public async Task Given_logs_delete_answered_y_then_it_previews_asks_and_deletes()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);

        var run = await AdminCli.RunAsync(["logs", "delete", "b-bfg-c2", "--api-url", api.Url], stdin: "y\n");

        Assert.Equal(0, run.ExitCode);
        Assert.Contains("Continue? [y/N]", run.Stderr);
        Assert.Equal(
            ["Dry run: would delete chapter 2 of The BFG and its 1 answer(s).", "Deleted chapter 2 of The BFG and its 1 answer(s)."],
            run.Stdout.Trim().Split('\n'));
        Assert.False(await LogExists(api, "b-bfg", "b-bfg-c2"));
    }

    [Theory]
    [InlineData("n\n")]
    [InlineData("")]
    public async Task Given_logs_delete_answered_anything_but_y_then_it_aborts_with_exit_3_and_nothing_changes(string answer)
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);

        var run = await AdminCli.RunAsync(["logs", "delete", "b-bfg-c2", "--api-url", api.Url], stdin: answer);

        Assert.Equal(3, run.ExitCode);
        Assert.EndsWith("Aborted", run.Stderr.Trim());
        Assert.True(await LogExists(api, "b-bfg", "b-bfg-c2"));
    }

    [Fact]
    public async Task Given_logs_delete_with_yes_then_nothing_is_asked_and_the_log_is_deleted()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);

        var run = await AdminCli.RunAsync(api, "logs", "delete", "b-bfg-c2", "--yes");

        Assert.Equal(0, run.ExitCode);
        Assert.DoesNotContain("Continue?", run.Stderr);
        Assert.False(await LogExists(api, "b-bfg", "b-bfg-c2"));
    }

    [Fact]
    public async Task Given_logs_delete_with_dry_run_then_nothing_is_asked_or_deleted()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);

        var run = await AdminCli.RunAsync(api, "logs", "delete", "b-bfg-c2", "--dry-run");

        Assert.Equal(0, run.ExitCode);
        Assert.Equal("Dry run: would delete chapter 2 of The BFG and its 1 answer(s).", run.Stdout.Trim());
        Assert.DoesNotContain("Continue?", run.Stderr);
        Assert.True(await LogExists(api, "b-bfg", "b-bfg-c2"));
    }

    [Fact]
    public async Task Given_a_log_that_is_not_the_newest_then_the_preview_is_refused_and_nothing_is_asked()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);

        var run = await AdminCli.RunAsync(["logs", "delete", "b-bfg-c1", "--api-url", api.Url], stdin: "y\n");

        Assert.Equal(1, run.ExitCode);
        Assert.Matches(@"^Refused: log-not-latest\. \(SHF-[0-9A-F]{4}\)$", run.Stderr.Trim());
        Assert.True(await LogExists(api, "b-bfg", "b-bfg-c1"));
    }

    [Fact]
    public async Task Given_logs_delete_with_json_then_stdout_holds_only_the_API_JSON_of_the_change()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);

        var run = await AdminCli.RunAsync(api, "logs", "delete", "b-bfg-c2", "--yes", "--json");

        using var json = System.Text.Json.JsonDocument.Parse(run.Stdout);
        Assert.False(json.RootElement.GetProperty("dryRun").GetBoolean());
        Assert.Contains("Dry run: would delete", run.Stderr);
    }
}
