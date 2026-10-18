using System.CommandLine;
using System.Text.Json;

namespace ShelfieAdmin;

/// <summary>What a command body works with.</summary>
public sealed record Session(Target Target, AdminClient? Client, bool Json)
{
    public AdminClient Api => Client!;
}

/// <summary>Runs a command body and turns every failure into one line on standard error and an exit code (L2-063).</summary>
public static class Cli
{
    public static async Task<int> RunAsync(ParseResult parse, bool needsToken, Func<Session, Task<int>> body)
    {
        Target? target = null;
        try
        {
            target = Target.Resolve(parse.GetValue(Program.ApiUrl));
            AdminClient? client = null;
            if (needsToken)
            {
                var token = CredentialStore.Load(target.BaseUrl)
                    ?? throw new CliException($"No admin token for {target.BaseUrl}. Run: shelfie-admin login --api-url {target.BaseUrl}", ExitCode.Auth);
                client = new AdminClient(target, token);
            }
            return await body(new Session(target, client, parse.GetValue(Program.Json)));
        }
        catch (CliException e)
        {
            Console.Error.WriteLine(e.Message);
            return e.ExitCode;
        }
        catch (AdminApiException e)
        {
            Console.Error.WriteLine(e.RequestId == null ? Describe(e, target!) : $"{Describe(e, target!)} ({e.RequestId})");
            return e.Status is 401 or 403 ? ExitCode.Auth : ExitCode.Failed;
        }
        catch (HttpRequestException)
        {
            Console.Error.WriteLine($"Cannot reach {target!.BaseUrl}.");
            return ExitCode.Failed;
        }
    }

    static string Describe(AdminApiException e, Target target)
    {
        const string renew = "Create a new token and run shelfie-admin login.";
        string Field(string name) => e.Body.ValueKind == JsonValueKind.Object && e.Body.TryGetProperty(name, out var v) ? v.ToString() : "";
        return e.Type switch
        {
            "token-expired" => $"The admin token expired on {Field("expiresAt")}. {renew}",
            "token-revoked" => $"The admin token was revoked. {renew}",
            "token-invalid" or "token-missing" => $"This is not a valid admin token for {target.BaseUrl}. {renew}",
            "scope-missing" => $"The admin token lacks the {Field("scope")} scope. {renew}",
            "too-many-requests" => "Too many admin calls; wait a minute and try again.",
            "not-found" => "Not found.",
            "validation" => $"Invalid input: {string.Join("; ", e.Body.GetProperty("errors").EnumerateArray().Select(x => $"{x.GetProperty("field")} {x.GetProperty("message")}"))}",
            _ => $"Refused: {e.Type}.",
        };
    }
}
