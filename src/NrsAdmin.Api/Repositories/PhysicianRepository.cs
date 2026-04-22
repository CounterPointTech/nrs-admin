using Dapper;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;

namespace NrsAdmin.Api.Repositories;

public class PhysicianRepository : BaseRepository
{
    public PhysicianRepository(IOptionsMonitor<DatabaseSettings> settings) : base(settings) { }

    /// <summary>
    /// Search physicians by last/first name. Joins ris.physicians to ris.people for display info.
    /// Returns at most <paramref name="limit"/> matches ordered by last name, then first name.
    /// When <paramref name="query"/> is null/empty, returns the first N physicians alphabetically.
    /// </summary>
    public async Task<List<Physician>> SearchAsync(string? query, int limit = 20)
    {
        var clampedLimit = Math.Clamp(limit, 1, 100);
        var hasQuery = !string.IsNullOrWhiteSpace(query);
        var likePattern = hasQuery ? $"%{query!.Trim()}%" : null;

        const string sql = @"
            SELECT  ph.physician_id                                                                        AS ""Id"",
                    TRIM(BOTH ', ' FROM COALESCE(pe.last_name, '') || ', ' || COALESCE(pe.first_name, '')) AS ""DisplayName"",
                    ph.specialty_1                                                                         AS ""Specialty"",
                    ph.npi                                                                                 AS ""Npi""
            FROM    ris.physicians ph
            JOIN    ris.people     pe ON ph.person_id = pe.person_id
            WHERE   (@Query IS NULL
                     OR pe.last_name  ILIKE @Like
                     OR pe.first_name ILIKE @Like)
            ORDER BY pe.last_name, pe.first_name
            LIMIT   @Limit";

        await using var connection = await CreateConnectionAsync();
        var results = await connection.QueryAsync<Physician>(sql, new
        {
            Query = hasQuery ? query : null,
            Like = likePattern,
            Limit = clampedLimit
        });
        return results.ToList();
    }

    /// <summary>
    /// Fetch a single physician by id — used to hydrate the picker when a procedure
    /// already has <c>assigned_physician_id</c> but we need the display name.
    /// </summary>
    public async Task<Physician?> GetByIdAsync(long id)
    {
        const string sql = @"
            SELECT  ph.physician_id                                                                        AS ""Id"",
                    TRIM(BOTH ', ' FROM COALESCE(pe.last_name, '') || ', ' || COALESCE(pe.first_name, '')) AS ""DisplayName"",
                    ph.specialty_1                                                                         AS ""Specialty"",
                    ph.npi                                                                                 AS ""Npi""
            FROM    ris.physicians ph
            JOIN    ris.people     pe ON ph.person_id = pe.person_id
            WHERE   ph.physician_id = @Id
            LIMIT   1";

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<Physician>(sql, new { Id = id });
    }
}
