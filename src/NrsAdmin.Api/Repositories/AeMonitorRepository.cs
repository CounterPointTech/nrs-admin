using Dapper;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;

namespace NrsAdmin.Api.Repositories;

public class AeMonitorRepository : BaseRepository
{
    private readonly ILogger<AeMonitorRepository> _logger;

    public AeMonitorRepository(IOptionsMonitor<DatabaseSettings> settings, ILogger<AeMonitorRepository> logger)
        : base(settings)
    {
        _logger = logger;
    }

    public async Task<List<AeActivity>> GetRecentActivityAsync(int hours = 1)
    {
        // Query shared_local.events for recent DICOM Service AE activity
        // These tables may not exist on all installations
        const string sql = """
            SELECT
                substring(ev.message from 'AE (.+)') AS AeTitle,
                CASE WHEN ev.message LIKE 'Association established%'
                    THEN ''
                    ELSE substring(ev.message from '(([0-9]+.*)*[0-9]+)')
                END AS MatchingItems,
                ev.time_stamp AS TimeStamp
            FROM shared_local.events ev
            INNER JOIN shared_local.applications ap ON ev.application_id = ap.id
            WHERE ev.time_stamp >= now() - make_interval(hours => @Hours)
              AND ap.application = 'DICOM Service'
              AND ap.product = 'NovaRIS'
              AND (ev.message LIKE 'Association established%'
                   OR ev.message LIKE '%Matching item%found%')
            ORDER BY ev.time_stamp DESC
            """;

        try
        {
            await using var connection = await CreateLocalConnectionAsync();
            var results = await connection.QueryAsync<AeActivity>(sql, new { Hours = hours });
            return results.ToList();
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "42P01") // undefined_table
        {
            _logger.LogWarning("AE Monitor tables (shared_local.events/applications) not found. " +
                               "AE monitoring requires the NovaRIS local database.");
            return [];
        }
    }
}
