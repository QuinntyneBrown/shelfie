// Acceptance Test
// Traces to: L2-056, L2-057, L2-058, L2-063, L2-118
// Description: Query accounts, books, chapter logs, answers and feedback as tables or JSON.

using System.Text.Json;

namespace ShelfieAdmin.Tests;

public class QueryTests
{
    static string[] Lines(CliRun run) => run.Stdout.Split('\n', StringSplitOptions.RemoveEmptyEntries);

    static string Row(CliRun run, string startsWith) => Lines(run).Single(l => l.StartsWith(startsWith + " "));

    [Fact]
    public async Task Given_users_list_then_every_profile_is_shown_in_aligned_columns()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api, "read");

        var run = await AdminCli.RunAsync(api, "users", "list");

        Assert.Equal(0, run.ExitCode);
        var header = Lines(run)[0];
        Assert.Matches(@"^ID\s+HOUSEHOLD\s+ROLE\s+NAME\s+EMAIL$", header.TrimEnd());
        Assert.Equal(5, Lines(run).Length);
        var dad = Row(run, "p-dad");
        Assert.Equal(header.IndexOf("EMAIL"), dad.IndexOf("dad@example.com"));
        Assert.Equal(header.IndexOf("ROLE"), dad.IndexOf("parent"));
        Assert.Matches(@"^p-other-reader\s+h2\s+reader\s+Zed\s*$", Row(run, "p-other-reader"));
    }

    [Fact]
    public async Task Given_books_list_then_each_book_shows_progress_finished_time_and_reward()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api, "read");

        var run = await AdminCli.RunAsync(api, "books", "list");

        Assert.Equal(0, run.ExitCode);
        Assert.Matches(@"^ID\s+HOUSEHOLD\s+TITLE\s+CHAPTERS\s+FINISHED\s+REWARD$", Lines(run)[0].TrimEnd());
        Assert.Matches(@"^b-lion\s+h1\s+The Lion, the Witch and the Wardrobe\s+11/17\s*$", Row(run, "b-lion"));
        Assert.Matches(@"^b-web\s+h1\s+Charlotte’s Web\s+3/3\s+2026-10-10T16:00:00.000Z\s+Movie night with popcorn$", Row(run, "b-web"));
        Assert.Contains("b-other", run.Stdout);
    }

    [Fact]
    public async Task Given_books_list_with_json_then_stdout_is_exactly_the_API_JSON()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api, "read");

        var run = await AdminCli.RunAsync(api, "books", "list", "--json");

        using var json = JsonDocument.Parse(run.Stdout);
        Assert.Equal(7, json.RootElement.GetArrayLength());
        Assert.Equal(11, json.RootElement.EnumerateArray().Single(b => b.GetProperty("id").GetString() == "b-lion").GetProperty("chaptersLogged").GetInt32());
    }

    [Fact]
    public async Task Given_logs_list_for_a_book_then_logs_are_in_chapter_order_with_review_status()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api, "read");

        var run = await AdminCli.RunAsync(api, "logs", "list", "--book", "b-lion");

        Assert.Equal(0, run.ExitCode);
        Assert.Matches(@"^ID\s+CHAPTER\s+READ ON\s+LOGGED\s+REVIEW$", Lines(run)[0].TrimEnd());
        Assert.Equal(Enumerable.Range(1, 11).Select(n => $"b-lion-c{n}"), Lines(run).Skip(1).Select(l => l.Split(' ')[0]));
        Assert.Matches(@"^b-lion-c1\s+1\s+2026-10-15\s+2026-10-15T16:00:00.000Z\s+star 2026-10-15T16:00:00.000Z$", Row(run, "b-lion-c1"));
        Assert.EndsWith("waiting", Row(run, "b-lion-c11"));
    }

    [Fact]
    public async Task Given_logs_show_then_the_chapter_review_note_and_each_question_and_answer_are_shown()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api, "read");

        var run = await AdminCli.RunAsync(api, "logs", "show", "b-lion-c1");

        Assert.Equal(0, run.ExitCode);
        foreach (var expected in new[]
        {
            "Book:     The Lion, the Witch and the Wardrobe (b-lion)", "Chapter:  1", "Read on:  2026-10-15",
            "Review:   star 2026-10-15T16:00:00.000Z", "Note:     Lovely work!",
            "1. What happened in this chapter?", "   Lucy found a wardrobe in the empty room and went inside.",
        })
            Assert.Contains(expected, Lines(run));
    }

    [Fact]
    public async Task Given_an_unknown_log_or_book_then_it_says_not_found_and_exits_1()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api, "read");

        foreach (var args in new[] { new[] { "logs", "show", "nope" }, ["logs", "list", "--book", "nope"] })
        {
            var run = await AdminCli.RunAsync(api, args);
            Assert.Equal(1, run.ExitCode);
            Assert.Matches(@"^Not found\. \(SHF-[0-9A-F]{4}\)$", run.Stderr.Trim());
            Assert.Equal("", run.Stdout);
        }
    }

    [Fact]
    public async Task Given_feedback_list_then_every_household_s_feedback_is_shown_newest_first()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api, "read");

        var run = await AdminCli.RunAsync(api, "feedback", "list");

        Assert.Equal(0, run.ExitCode);
        var lines = Lines(run);
        Assert.Equal(3, lines.Length);
        Assert.Matches(@"^DATE\s+HOUSEHOLD\s+ROLE\s+KIND\s+SCORE\s+MESSAGE$", lines[0].TrimEnd());
        Assert.Matches(@"^2026-10-17T19:30:00.000Z\s+h2\s+parent\s+idea\s+A weekly e-mail of what Zed read would be handy\.$", lines[1]);
        Assert.Matches(@"^2026-10-16T17:05:00.000Z\s+h1\s+reader\s+feel\s+5\s+I love the stickers!$", lines[2]);
        Assert.Equal(lines[0].IndexOf("MESSAGE"), lines[2].IndexOf("I love"));
    }

    [Fact]
    public async Task Given_feedback_list_with_json_then_stdout_is_exactly_the_API_JSON()
    {
        await using var api = await LocalApi.StartAsync();
        await AdminCli.LoginAsync(api, "read");

        var run = await AdminCli.RunAsync(api, "feedback", "list", "--json");

        using var json = JsonDocument.Parse(run.Stdout);
        Assert.Equal(new string?[] { "fb-zeds-dad", "fb-nia" }, json.RootElement.EnumerateArray().Select(f => f.GetProperty("id").GetString()).ToArray());
        Assert.Equal(JsonValueKind.Null, json.RootElement[0].GetProperty("score").ValueKind);
    }
}
