using Dapper;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;

namespace NrsAdmin.Api.Repositories;

public class FacilityRepository : BaseRepository
{
    public FacilityRepository(IOptions<DatabaseSettings> settings) : base(settings) { }

    public async Task<List<Facility>> GetAllAsync()
    {
        const string sql = """
            SELECT facility_id AS FacilityId, name AS Name,
                   description AS Description, is_default AS IsDefault
            FROM shared.facilities
            ORDER BY name ASC
            """;

        await using var connection = await CreateConnectionAsync();
        var facilities = await connection.QueryAsync<Facility>(sql);
        return facilities.ToList();
    }
}
