// Acceptance Test
// Traces to: L2-050, L2-061, L2-062, L2-063
// Description: Mark a book finished and give a reward, with --dry-run and --json.

using System.Text.Json;

namespace ShelfieAdmin.Tests;

public class BookWriteTests
{
    static async Task<string> BookRow(LocalApi api, string id) =>
        (await AdminCli.RunAsync(api, "books", "list")).Stdout.Split('\n').Single(l => l.StartsWith(id + " "));

    [Fact]
    public async Task Given_books_finish_then_the_book_is_finished_now()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);

        var run = await AdminCli.RunAsync(api, "books", "finish", "b-lion");

        Assert.Equal(0, run.ExitCode);
        Assert.Matches(@"^Marked The Lion, the Witch and the Wardrobe finished at \d{4}-\d\d-\d\dT[\d:.]+Z\.$", run.Stdout.Trim());
        Assert.Contains(DateTime.UtcNow.ToString("yyyy-MM-dd"), await BookRow(api, "b-lion"));
    }

    [Fact]
    public async Task Given_books_finish_with_dry_run_then_it_says_what_would_change_and_nothing_changes()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);

        var run = await AdminCli.RunAsync(api, "books", "finish", "b-lion", "--dry-run");

        Assert.Equal(0, run.ExitCode);
        Assert.Equal("Dry run: would mark The Lion, the Witch and the Wardrobe finished.", run.Stdout.Trim());
        Assert.Matches(@"11/17$", await BookRow(api, "b-lion"));
    }

    [Fact]
    public async Task Given_books_reward_for_a_finished_book_then_the_reward_is_given()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);

        var run = await AdminCli.RunAsync(api, "books", "reward", "b-matilda", "--text", "Ice cream", "--note", "Well done");

        Assert.Equal(0, run.ExitCode);
        Assert.Equal("Gave the reward \"Ice cream\" for b-matilda.", run.Stdout.Trim());
        Assert.EndsWith("Ice cream", await BookRow(api, "b-matilda"));
    }

    [Fact]
    public async Task Given_books_reward_with_dry_run_and_json_then_the_API_JSON_says_dry_run_and_nothing_is_given()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);

        var run = await AdminCli.RunAsync(api, "books", "reward", "b-matilda", "--text", "Ice cream", "--dry-run", "--json");

        using var json = JsonDocument.Parse(run.Stdout);
        Assert.True(json.RootElement.GetProperty("dryRun").GetBoolean());
        Assert.DoesNotContain("Ice cream", await BookRow(api, "b-matilda"));
    }

    [Fact]
    public async Task Given_a_book_that_is_not_finished_then_the_reward_is_refused_by_type_with_exit_1()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api);

        var run = await AdminCli.RunAsync(api, "books", "reward", "b-lion", "--text", "Ice cream");

        Assert.Equal(1, run.ExitCode);
        Assert.Matches(@"^Refused: book-not-finished\. \(SHF-[0-9A-F]{4}\)$", run.Stderr.Trim());
        Assert.Equal("", run.Stdout);
    }

    [Fact]
    public async Task Given_a_read_only_token_then_a_write_says_the_scope_is_missing_and_exits_2()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api, "read");

        var run = await AdminCli.RunAsync(api, "books", "finish", "b-lion");

        Assert.Equal(2, run.ExitCode);
        Assert.StartsWith("The admin token lacks the write scope.", run.Stderr.Trim());
    }
}
