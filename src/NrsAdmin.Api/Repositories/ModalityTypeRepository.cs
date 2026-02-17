using Dapper;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;

namespace NrsAdmin.Api.Repositories;

public class ModalityTypeRepository : BaseRepository
{
    public ModalityTypeRepository(IOptions<DatabaseSettings> settings) : base(settings) { }

    public async Task<List<ModalityType>> GetAllAsync()
    {
        const string sql = """
            SELECT modality_type_id AS ModalityTypeId, description AS Description
            FROM ris.modality_types
            ORDER BY modality_type_id ASC
            """;

        await using var connection = await CreateConnectionAsync();
        var types = await connection.QueryAsync<ModalityType>(sql);
        return types.ToList();
    }

    public async Task<ModalityType?> GetByIdAsync(string id)
    {
        const string sql = """
            SELECT modality_type_id AS ModalityTypeId, description AS Description
            FROM ris.modality_types
            WHERE modality_type_id = @Id
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<ModalityType>(sql, new { Id = id });
    }

    public async Task<ModalityType> CreateAsync(string modalityTypeId, string? description)
    {
        const string sql = """
            INSERT INTO ris.modality_types (modality_type_id, description)
            VALUES (@ModalityTypeId, @Description)
            RETURNING modality_type_id AS ModalityTypeId, description AS Description
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleAsync<ModalityType>(sql, new
        {
            ModalityTypeId = modalityTypeId,
            Description = description
        });
    }

    public async Task<(bool Deleted, bool HasReferences)> DeleteAsync(string id)
    {
        // Check if modality type is referenced in modalities
        const string checkSql = """
            SELECT EXISTS(
                SELECT 1 FROM ris.modalities WHERE modality_type_id = @Id
            ) AS has_refs
            """;

        const string deleteSql = """
            DELETE FROM ris.modality_types WHERE modality_type_id = @Id
            """;

        await using var connection = await CreateConnectionAsync();

        var hasRefs = await connection.ExecuteScalarAsync<bool>(checkSql, new { Id = id });
        if (hasRefs)
            return (false, true);

        var rows = await connection.ExecuteAsync(deleteSql, new { Id = id });
        return (rows > 0, false);
    }

    public async Task<bool> ExistsAsync(string id)
    {
        const string sql = """
            SELECT EXISTS(
                SELECT 1 FROM ris.modality_types WHERE modality_type_id = @Id
            )
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.ExecuteScalarAsync<bool>(sql, new { Id = id });
    }
}
