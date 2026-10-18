using System.Text.Json;

namespace ShelfieAdmin;

/// <summary>One table column: its header and how to read its cell from a row.</summary>
public sealed record Column(string Header, Func<JsonElement, string> Value);

/// <summary>Results on standard output: aligned tables and key-value lists, or the API's JSON as sent (L2-063).</summary>
public static class Output
{
    /// <summary>The text of a JSON property; empty for null.</summary>
    public static string Text(JsonElement row, string property) =>
        row.GetProperty(property) is { ValueKind: not JsonValueKind.Null } value ? value.ToString() : "";

    public static void Table(JsonElement rows, params Column[] columns)
    {
        var cells = rows.EnumerateArray().Select(row => columns.Select(c => c.Value(row)).ToArray()).ToList();
        var widths = columns.Select((c, i) => cells.Select(r => r[i].Length).Append(c.Header.Length).Max()).ToArray();
        string Line(IEnumerable<string> values) => string.Join("  ", values.Select((v, i) => v.PadRight(widths[i]))).TrimEnd();
        Console.WriteLine(Line(columns.Select(c => c.Header)));
        foreach (var row in cells) Console.WriteLine(Line(row));
    }

    public static void Fields(params (string Label, string Value)[] fields)
    {
        var width = fields.Max(f => f.Label.Length);
        foreach (var (label, value) in fields) Console.WriteLine($"{(label + ":").PadRight(width + 3)}{value}");
    }

    public static void Json(string raw) => Console.WriteLine(raw);
}
