using Dapper;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;

namespace NrsAdmin.Api.Repositories;

public class ModalityRepository : BaseRepository
{
    public ModalityRepository(IOptionsMonitor<DatabaseSettings> settings) : base(settings) { }

    public async Task<List<Modality>> GetAllAsync()
    {
        const string sql = """
            SELECT m.modality_id AS ModalityId, m.name AS Name, m.room AS Room,
                   m.status AS Status, m.modality_type_id AS ModalityTypeId,
                   m.is_retired AS IsRetired, m.ae_title AS AeTitle,
                   m.supports_worklist AS SupportsWorklist, m.supports_mpps AS SupportsMpps,
                   m.facility_id AS FacilityId, f.name AS FacilityName
            FROM ris.modalities m
            LEFT JOIN shared.facilities f ON m.facility_id = f.facility_id
            ORDER BY m.modality_id ASC
            """;

        await using var connection = await CreateConnectionAsync();
        var modalities = await connection.QueryAsync<Modality>(sql);
        return modalities.ToList();
    }

    public async Task<Modality?> GetByIdAsync(int id)
    {
        const string sql = """
            SELECT m.modality_id AS ModalityId, m.name AS Name, m.room AS Room,
                   m.status AS Status, m.modality_type_id AS ModalityTypeId,
                   m.is_retired AS IsRetired, m.ae_title AS AeTitle,
                   m.supports_worklist AS SupportsWorklist, m.supports_mpps AS SupportsMpps,
                   m.facility_id AS FacilityId, f.name AS FacilityName
            FROM ris.modalities m
            LEFT JOIN shared.facilities f ON m.facility_id = f.facility_id
            WHERE m.modality_id = @Id
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<Modality>(sql, new { Id = id });
    }

    public async Task<Modality> CreateAsync(string name, string? room, string? status,
        string modalityTypeId, bool isRetired, string? aeTitle,
        bool supportsWorklist, bool supportsMpps, int facilityId)
    {
        const string sql = """
            INSERT INTO ris.modalities (name, room, status, modality_type_id, is_retired,
                                        ae_title, supports_worklist, supports_mpps, facility_id)
            VALUES (@Name, @Room, @Status, @ModalityTypeId, @IsRetired,
                    @AeTitle, @SupportsWorklist, @SupportsMpps, @FacilityId)
            RETURNING modality_id AS ModalityId, name AS Name, room AS Room,
                      status AS Status, modality_type_id AS ModalityTypeId,
                      is_retired AS IsRetired, ae_title AS AeTitle,
                      supports_worklist AS SupportsWorklist, supports_mpps AS SupportsMpps,
                      facility_id AS FacilityId
            """;

        await using var connection = await CreateConnectionAsync();
        var created = await connection.QuerySingleAsync<Modality>(sql, new
        {
            Name = name,
            Room = room,
            Status = status,
            ModalityTypeId = modalityTypeId,
            IsRetired = isRetired,
            AeTitle = aeTitle,
            SupportsWorklist = supportsWorklist,
            SupportsMpps = supportsMpps,
            FacilityId = facilityId
        });

        // Fetch with facility name
        return (await GetByIdAsync(created.ModalityId))!;
    }

    public async Task<Modality?> UpdateAsync(int id, string name, string? room, string? status,
        string modalityTypeId, bool isRetired, string? aeTitle,
        bool supportsWorklist, bool supportsMpps, int facilityId)
    {
        const string sql = """
            UPDATE ris.modalities
            SET name = @Name, room = @Room, status = @Status,
                modality_type_id = @ModalityTypeId, is_retired = @IsRetired,
                ae_title = @AeTitle, supports_worklist = @SupportsWorklist,
                supports_mpps = @SupportsMpps, facility_id = @FacilityId
            WHERE modality_id = @Id
            """;

        await using var connection = await CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(sql, new
        {
            Id = id,
            Name = name,
            Room = room,
            Status = status,
            ModalityTypeId = modalityTypeId,
            IsRetired = isRetired,
            AeTitle = aeTitle,
            SupportsWorklist = supportsWorklist,
            SupportsMpps = supportsMpps,
            FacilityId = facilityId
        });

        return rows > 0 ? await GetByIdAsync(id) : null;
    }

    public async Task<(bool Deleted, bool HasReferences)> DeleteAsync(int id)
    {
        // Check if modality is referenced in order_procedures
        const string checkSql = """
            SELECT EXISTS(
                SELECT 1 FROM ris.order_procedures WHERE modality_id = @Id
            ) AS has_refs
            """;

        const string deleteSql = """
            DELETE FROM ris.modalities WHERE modality_id = @Id
            """;

        await using var connection = await CreateConnectionAsync();

        var hasRefs = await connection.ExecuteScalarAsync<bool>(checkSql, new { Id = id });
        if (hasRefs)
            return (false, true);

        var rows = await connection.ExecuteAsync(deleteSql, new { Id = id });
        return (rows > 0, false);
    }
}
