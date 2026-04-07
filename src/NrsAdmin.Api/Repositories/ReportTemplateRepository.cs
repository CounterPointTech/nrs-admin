using Dapper;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;

namespace NrsAdmin.Api.Repositories;

public class ReportTemplateRepository : BaseRepository
{
    public ReportTemplateRepository(IOptionsMonitor<DatabaseSettings> settings) : base(settings) { }

    /// <summary>
    /// Returns a dictionary mapping report_template_name → list of facility names.
    /// </summary>
    public async Task<Dictionary<string, List<string>>> GetFacilityTemplateMappingsAsync()
    {
        const string sql = """
            SELECT fd.report_template_name AS TemplateName, f.name AS FacilityName
            FROM ris.facility_details fd
            INNER JOIN shared.facilities f ON fd.facility_id = f.facility_id
            WHERE fd.report_template_name IS NOT NULL
              AND fd.report_template_name != ''
            ORDER BY fd.report_template_name, f.name
            """;

        await using var connection = await CreateConnectionAsync();
        var rows = await connection.QueryAsync<(string TemplateName, string FacilityName)>(sql);

        var result = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
        foreach (var row in rows)
        {
            if (!result.TryGetValue(row.TemplateName, out var list))
            {
                list = [];
                result[row.TemplateName] = list;
            }
            list.Add(row.FacilityName);
        }

        return result;
    }

    /// <summary>
    /// Returns facility names using a specific template.
    /// </summary>
    public async Task<List<string>> GetFacilitiesUsingTemplateAsync(string templateName)
    {
        const string sql = """
            SELECT f.name
            FROM ris.facility_details fd
            INNER JOIN shared.facilities f ON fd.facility_id = f.facility_id
            WHERE fd.report_template_name = @TemplateName
            ORDER BY f.name
            """;

        await using var connection = await CreateConnectionAsync();
        var names = await connection.QueryAsync<string>(sql, new { TemplateName = templateName });
        return names.ToList();
    }
}
