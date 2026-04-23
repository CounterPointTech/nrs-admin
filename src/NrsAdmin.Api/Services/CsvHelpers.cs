using System.Text;

namespace NrsAdmin.Api.Services;

/// <summary>
/// Shared CSV parsing/escaping primitives for import+export controllers.
/// </summary>
public static class CsvHelpers
{
    /// <summary>
    /// Splits raw file content into rows, skipping blank lines and any line that begins with '#'
    /// (comment rows — used by downloaded templates to embed inline instructions).
    /// </summary>
    public static IEnumerable<string> SplitRows(string content)
    {
        foreach (var rawLine in content.Split('\n'))
        {
            var line = rawLine.Trim('\r');
            if (string.IsNullOrWhiteSpace(line)) continue;
            if (line.TrimStart().StartsWith('#')) continue;
            yield return line;
        }
    }

    public static string[] ParseCsvLine(string line)
    {
        var fields = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;

        for (var i = 0; i < line.Length; i++)
        {
            var c = line[i];

            if (inQuotes)
            {
                if (c == '"')
                {
                    if (i + 1 < line.Length && line[i + 1] == '"')
                    {
                        current.Append('"');
                        i++;
                    }
                    else
                    {
                        inQuotes = false;
                    }
                }
                else
                {
                    current.Append(c);
                }
            }
            else
            {
                if (c == '"')
                {
                    inQuotes = true;
                }
                else if (c == ',')
                {
                    fields.Add(current.ToString());
                    current.Clear();
                }
                else
                {
                    current.Append(c);
                }
            }
        }

        fields.Add(current.ToString());
        return fields.ToArray();
    }

    public static string Escape(string? value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }

    public static string? NullIfEmpty(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value;
}
