using Dapper;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;

namespace NrsAdmin.Api.Repositories;

public class SiteRepository : BaseRepository
{
    public SiteRepository(IOptionsMonitor<DatabaseSettings> settings) : base(settings) { }

    /// <summary>
    /// Full site catalog (usually small — sites are top-level Novarad tenants).
    /// Used by the procedure-tab RIS-side site picker.
    /// </summary>
    public async Task<List<Site>> GetAllAsync()
    {
        const string sql = @"
            SELECT  site_id     AS ""SiteId"",
                    site_code   AS ""SiteCode"",
                    description AS ""Description"",
                    is_default  AS ""IsDefault""
            FROM    shared.sites
            ORDER BY is_default DESC, site_code";

        await using var connection = await CreateConnectionAsync();
        var results = await connection.QueryAsync<Site>(sql);
        return results.ToList();
    }
}
