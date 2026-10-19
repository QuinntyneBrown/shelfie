using System.CommandLine;

namespace ShelfieAdmin;

public static class Program
{
    public static readonly Option<string?> ApiUrl = new("--api-url")
    {
        Description = "Base URL of the Shelfie API (default: SHELFIE_ADMIN_URL, else https://shelfie.kids)",
        Recursive = true,
    };

    public static readonly Option<bool> Json = new("--json")
    {
        Description = "Print the API's JSON instead of a table",
        Recursive = true,
    };

    public static Task<int> Main(string[] args)
    {
        var root = new RootCommand("Query and change production Shelfie data through the admin API.");
        root.Options.Add(ApiUrl);
        root.Options.Add(Json);
        foreach (var command in AuthCommands.Create()) root.Subcommands.Add(command);
        Command users = QueryCommands.Users(), books = QueryCommands.Books(), logs = QueryCommands.Logs();
        WriteCommands.AddTo(users, books, logs);
        root.Subcommands.Add(users);
        root.Subcommands.Add(books);
        root.Subcommands.Add(logs);
        root.Subcommands.Add(QueryCommands.Feedback());
        return root.Parse(args).InvokeAsync();
    }
}
