namespace ShelfieAdmin;

/// <summary>Process exit codes (L2-063).</summary>
public static class ExitCode
{
    public const int Ok = 0;
    public const int Failed = 1;
    public const int Auth = 2;
    public const int Aborted = 3;
}

/// <summary>A failure found by the CLI itself, before or without the API.</summary>
public sealed class CliException(string message, int exitCode = ExitCode.Failed) : Exception(message)
{
    public int ExitCode { get; } = exitCode;
}
