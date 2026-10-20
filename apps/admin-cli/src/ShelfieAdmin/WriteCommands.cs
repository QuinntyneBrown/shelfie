using System.CommandLine;
using System.Text.Json;

namespace ShelfieAdmin;

/// <summary>The write commands, added to the users, books, logs and profiles groups (L2-059 to L2-062, L2-162).</summary>
public static class WriteCommands
{
    static readonly Option<bool> DryRun = new("--dry-run") { Description = "Show what would change and change nothing" };
    static readonly Option<bool> Yes = new("--yes") { Description = "Do not ask before a destructive change" };

    public static void AddTo(Command users, Command books, Command logs, Command profiles)
    {
        var userId = new Argument<string>("id") { Description = "Parent's profile id" };
        var resetPassword = new Command("reset-password", "Set a new password for a parent and end all of their sessions") { userId, DryRun, Yes };
        resetPassword.SetAction((parse, _) => Cli.RunAsync(parse, needsToken: true, session =>
        {
            var password = Prompt.Secret("New password");
            if (password != Prompt.Secret("Repeat the new password")) throw new CliException("The two passwords differ.");
            if (password.Length < 8) throw new CliException("The password must be at least 8 characters.");
            return WriteAsync(session, parse, HttpMethod.Put, $"users/{Escape(parse.GetValue(userId))}/password", new { password },
                (r, dry) => dry
                    ? $"Dry run: would set a new password for {Output.Text(r, "name")} ({Output.Text(r, "id")}) and end {Output.Text(r, "sessionsEnded")} session(s)."
                    : $"Set a new password for {Output.Text(r, "name")} ({Output.Text(r, "id")}) and ended {Output.Text(r, "sessionsEnded")} session(s).",
                destructive: true);
        }));
        users.Subcommands.Add(resetPassword);

        var bookId = new Argument<string>("id") { Description = "Book id" };
        var finish = new Command("finish", "Mark a book finished now") { bookId, DryRun };
        finish.SetAction((parse, _) => Cli.RunAsync(parse, needsToken: true, session =>
            WriteAsync(session, parse, HttpMethod.Post, $"books/{Escape(parse.GetValue(bookId))}/finish", null,
                (r, dry) => dry
                    ? $"Dry run: would mark {Output.Text(r, "title")} finished."
                    : $"Marked {Output.Text(r, "title")} finished at {Output.Text(r, "finishedAt")}.")));
        books.Subcommands.Add(finish);

        var text = new Option<string>("--text") { Description = "The reward, 1 to 100 characters", Required = true };
        var note = new Option<string?>("--note") { Description = "A note to the reader, up to 300 characters" };
        var reward = new Command("reward", "Give the reward for a finished book") { bookId, text, note, DryRun };
        reward.SetAction((parse, _) => Cli.RunAsync(parse, needsToken: true, session =>
            WriteAsync(session, parse, HttpMethod.Post, $"books/{Escape(parse.GetValue(bookId))}/reward",
                new { text = parse.GetValue(text), note = parse.GetValue(note) },
                (r, dry) => $"{(dry ? "Dry run: would give" : "Gave")} the reward \"{Output.Text(r, "text")}\" for {Output.Text(r, "bookId")}.")));
        books.Subcommands.Add(reward);

        var logId = new Argument<string>("id") { Description = "Chapter log id" };
        var readOn = new Option<string>("--read-on") { Description = "The day the chapter was read, yyyy-mm-dd", Required = true };
        var correct = new Command("correct", "Correct the day a chapter was read") { logId, readOn, DryRun };
        correct.SetAction((parse, _) => Cli.RunAsync(parse, needsToken: true, session =>
            WriteAsync(session, parse, HttpMethod.Patch, $"logs/{Escape(parse.GetValue(logId))}", new { readOn = parse.GetValue(readOn) },
                (r, dry) => $"{(dry ? "Dry run: would move" : "Moved")} chapter {Output.Text(r, "chapter")} of {Output.Text(r, "bookTitle")} from {Output.Text(r, "previousReadOn")} to {Output.Text(r, "readOn")}.")));
        logs.Subcommands.Add(correct);

        var delete = new Command("delete", "Delete the newest logged chapter of a book and its answers") { logId, DryRun, Yes };
        delete.SetAction((parse, _) => Cli.RunAsync(parse, needsToken: true, session =>
            WriteAsync(session, parse, HttpMethod.Delete, $"logs/{Escape(parse.GetValue(logId))}", null,
                (r, dry) => $"{(dry ? "Dry run: would delete" : "Deleted")} chapter {Output.Text(r, "chapter")} of {Output.Text(r, "bookTitle")} and its {Output.Text(r, "answersDeleted")} answer(s).",
                destructive: true)));
        logs.Subcommands.Add(delete);

        // Neither asks to confirm: each is undone by the other (ADR-0022).
        var profileId = new Argument<string>("id") { Description = "Author's or volunteer's profile id" };
        var approve = new Command("approve", "Let parents see this profile in the directory") { profileId, DryRun };
        approve.SetAction((parse, _) => Cli.RunAsync(parse, needsToken: true, session =>
            WriteAsync(session, parse, HttpMethod.Post, $"profiles/{Escape(parse.GetValue(profileId))}/approve", null,
                (r, dry) => $"{(dry ? "Dry run: would approve" : "Approved")} {Output.Text(r, "name")} ({Output.Text(r, "kind")}, {Output.Text(r, "id")}).")));
        profiles.Subcommands.Add(approve);

        var hide = new Command("hide", "Take this profile out of the directory") { profileId, DryRun };
        hide.SetAction((parse, _) => Cli.RunAsync(parse, needsToken: true, session =>
            WriteAsync(session, parse, HttpMethod.Post, $"profiles/{Escape(parse.GetValue(profileId))}/hide", null,
                (r, dry) => $"{(dry ? "Dry run: would hide" : "Hid")} {Output.Text(r, "name")} ({Output.Text(r, "kind")}, {Output.Text(r, "id")}).")));
        profiles.Subcommands.Add(hide);
    }

    /// <summary>
    /// Sends the change and reports it. With --dry-run only the rolled-back preview is sent. A destructive change is
    /// previewed first and, without --yes, applied only when the operator answers y (L2-062).
    /// </summary>
    static async Task<int> WriteAsync(Session session, ParseResult parse, HttpMethod method, string path, object? body,
        Func<JsonElement, bool, string> describe, bool destructive = false)
    {
        var dryRun = parse.GetValue(DryRun);
        if (dryRun || destructive)
        {
            var preview = await session.Api.SendAsync(method, path, body, dryRun: true);
            if (dryRun) return Report(session, preview, describe, dryRun: true);
            (session.Json ? Console.Error : Console.Out).WriteLine(describe(preview.Root, true));
            if (!parse.GetValue(Yes) && !Prompt.Confirm("Continue? [y/N]"))
            {
                Console.Error.WriteLine("Aborted");
                return ExitCode.Aborted;
            }
        }
        return Report(session, await session.Api.SendAsync(method, path, body), describe, dryRun: false);
    }

    static int Report(Session session, ApiResult result, Func<JsonElement, bool, string> describe, bool dryRun)
    {
        if (session.Json) Output.Json(result.Json);
        else Console.WriteLine(describe(result.Root, dryRun));
        return ExitCode.Ok;
    }

    static string Escape(string? id) => Uri.EscapeDataString(id!);
}
