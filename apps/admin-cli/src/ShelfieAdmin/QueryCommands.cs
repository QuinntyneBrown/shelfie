using System.CommandLine;
using System.Text.Json;

namespace ShelfieAdmin;

/// <summary>users list, books list, logs list, logs show (L2-056 to L2-058), feedback list (L2-118) and profiles list (L2-168).</summary>
public static class QueryCommands
{
    public static Command Users()
    {
        var list = new Command("list", "List every profile in every household");
        list.SetAction((parse, _) => Cli.RunAsync(parse, needsToken: true, session => Print(session, "users",
            new Column("ID", r => Output.Text(r, "id")), new Column("HOUSEHOLD", r => Output.Text(r, "householdId")),
            new Column("ROLE", r => Output.Text(r, "role")), new Column("NAME", r => Output.Text(r, "name")),
            new Column("EMAIL", r => Output.Text(r, "email")))));
        return new Command("users", "Accounts: parents and readers") { list };
    }

    public static Command Books()
    {
        var list = new Command("list", "List every book with progress, finished time and reward");
        list.SetAction((parse, _) => Cli.RunAsync(parse, needsToken: true, session => Print(session, "books",
            new Column("ID", r => Output.Text(r, "id")), new Column("HOUSEHOLD", r => Output.Text(r, "householdId")),
            new Column("TITLE", r => Output.Text(r, "title")),
            new Column("CHAPTERS", r => $"{Output.Text(r, "chaptersLogged")}/{Output.Text(r, "chapterCount")}"),
            new Column("FINISHED", r => Output.Text(r, "finishedAt")), new Column("REWARD", r => Output.Text(r, "reward")))));
        return new Command("books", "Books, progress and rewards") { list };
    }

    public static Command Logs()
    {
        var book = new Option<string>("--book") { Description = "Book id", Required = true };
        var list = new Command("list", "List a book's logged chapters with review status") { book };
        list.SetAction((parse, _) => Cli.RunAsync(parse, needsToken: true, session => Print(session, $"books/{Uri.EscapeDataString(parse.GetValue(book)!)}/logs",
            new Column("ID", r => Output.Text(r, "id")), new Column("CHAPTER", r => Output.Text(r, "chapter")),
            new Column("READ ON", r => Output.Text(r, "readOn")), new Column("LOGGED", r => Output.Text(r, "loggedAt")),
            new Column("REVIEW", Review))));

        var id = new Argument<string>("id") { Description = "Chapter log id" };
        var show = new Command("show", "Show a logged chapter with its answers and review") { id };
        show.SetAction((parse, _) => Cli.RunAsync(parse, needsToken: true, async session =>
        {
            var log = await session.Api.GetAsync($"logs/{Uri.EscapeDataString(parse.GetValue(id)!)}");
            if (session.Json) return Json(log);
            var r = log.Root;
            Output.Fields(("Book", $"{Output.Text(r, "bookTitle")} ({Output.Text(r, "bookId")})"), ("Chapter", Output.Text(r, "chapter")),
                ("Read on", Output.Text(r, "readOn")), ("Review", Review(r)), ("Note", Output.Text(r, "note")));
            foreach (var answer in r.GetProperty("answers").EnumerateArray())
            {
                Console.WriteLine();
                Console.WriteLine($"{Output.Text(answer, "position")}. {Output.Text(answer, "question")}");
                Console.WriteLine($"   {Output.Text(answer, "text")}");
            }
            return ExitCode.Ok;
        }));

        return new Command("logs", "Logged chapters and answers") { list, show };
    }

    public static Command Feedback()
    {
        var list = new Command("list", "List every household's feedback, newest first");
        list.SetAction((parse, _) => Cli.RunAsync(parse, needsToken: true, session => Print(session, "feedback",
            new Column("DATE", r => Output.Text(r, "createdAt")), new Column("HOUSEHOLD", r => Output.Text(r, "householdId")),
            new Column("ROLE", r => Output.Text(r, "role")), new Column("KIND", r => Output.Text(r, "kind")),
            new Column("SCORE", r => Output.Text(r, "score")), new Column("MESSAGE", r => Output.Text(r, "message").ReplaceLineEndings(" ")))));
        return new Command("feedback", "Feedback sent from inside Shelfie") { list };
    }

    public static Command Profiles()
    {
        var list = new Command("list", "List every author and volunteer with what they wrote, waiting ones first");
        list.SetAction((parse, _) => Cli.RunAsync(parse, needsToken: true, session => Print(session, "profiles",
            new Column("ID", r => Output.Text(r, "id")), new Column("KIND", r => Output.Text(r, "kind")),
            new Column("NAME", r => Output.Text(r, "name")), new Column("EMAIL", r => Output.Text(r, "email")),
            new Column("STATUS", r => Output.Text(r, "status")), new Column("BOOKS", r => Output.Text(r, "bookCount")),
            new Column("ABOUT", r => Output.Text(r, "bio").ReplaceLineEndings(" ")))));
        return new Command("profiles", "Author and volunteer profiles parents see in the directory") { list };
    }

    static string Review(JsonElement log) =>
        Output.Text(log, "reviewedAt") is { Length: > 0 } at ? $"{Output.Text(log, "sticker")} {at}" : "waiting";

    static async Task<int> Print(Session session, string path, params Column[] columns)
    {
        var result = await session.Api.GetAsync(path);
        if (session.Json) return Json(result);
        Output.Table(result.Root, columns);
        return ExitCode.Ok;
    }

    static int Json(ApiResult result)
    {
        Output.Json(result.Json);
        return ExitCode.Ok;
    }
}
