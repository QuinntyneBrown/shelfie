namespace ShelfieAdmin;

/// <summary>Questions to the operator. Questions go to standard error, so standard output carries only results.</summary>
public static class Prompt
{
    /// <summary>Reads a line without echoing it; from redirected input, reads a plain line.</summary>
    public static string Secret(string label)
    {
        Console.Error.Write($"{label}: ");
        if (Console.IsInputRedirected) return (Console.In.ReadLine() ?? "").TrimEnd('\r');
        var typed = new System.Text.StringBuilder();
        for (var key = Console.ReadKey(intercept: true); key.Key != ConsoleKey.Enter; key = Console.ReadKey(intercept: true))
        {
            if (key.Key == ConsoleKey.Backspace) { if (typed.Length > 0) typed.Length--; }
            else if (!char.IsControl(key.KeyChar)) typed.Append(key.KeyChar);
        }
        Console.Error.WriteLine();
        return typed.ToString();
    }

    /// <summary>True only for "y" or "yes"; any other answer, or end of input, is no.</summary>
    public static bool Confirm(string question)
    {
        Console.Error.Write($"{question} ");
        var answer = Console.In.ReadLine()?.Trim().ToLowerInvariant();
        return answer is "y" or "yes";
    }
}
