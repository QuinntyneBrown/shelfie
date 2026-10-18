using System.CommandLine;
using System.Text.Json;

namespace ShelfieAdmin;

/// <summary>login, logout and whoami (L2-055).</summary>
public static class AuthCommands
{
    public static Command[] Create()
    {
        var login = new Command("login", "Store an admin token for the target in the OS credential store");
        login.SetAction((parse, _) => Cli.RunAsync(parse, needsToken: false, async session =>
        {
            var token = Prompt.Secret("Admin token").Trim();
            var me = (await new AdminClient(session.Target, token).GetAsync("whoami")).Root;
            CredentialStore.Save(session.Target.BaseUrl, token);
            Console.WriteLine($"Signed in to {session.Target.BaseUrl} as {me.GetProperty("name")} ({Scopes(me)}), token expires {me.GetProperty("expiresAt")}.");
            return ExitCode.Ok;
        }));

        var logout = new Command("logout", "Remove the stored admin token for the target");
        logout.SetAction((parse, _) => Cli.RunAsync(parse, needsToken: false, session =>
        {
            CredentialStore.Delete(session.Target.BaseUrl);
            Console.WriteLine($"Signed out of {session.Target.BaseUrl}.");
            return Task.FromResult(ExitCode.Ok);
        }));

        var whoami = new Command("whoami", "Show the stored admin token's name, scopes and expiry");
        whoami.SetAction((parse, _) => Cli.RunAsync(parse, needsToken: true, async session =>
        {
            var me = await session.Api.GetAsync("whoami");
            if (session.Json) Output.Json(me.Json);
            else Output.Fields(("Token", me.Root.GetProperty("id").ToString()), ("Name", me.Root.GetProperty("name").ToString()),
                ("Scopes", Scopes(me.Root)), ("Expires", me.Root.GetProperty("expiresAt").ToString()));
            return ExitCode.Ok;
        }));

        return [login, logout, whoami];
    }

    static string Scopes(JsonElement token) => string.Join(", ", token.GetProperty("scopes").EnumerateArray().Select(s => s.GetString()));
}
