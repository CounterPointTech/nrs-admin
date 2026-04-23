using System.Text;
using Dapper;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;

namespace NrsAdmin.Api.Repositories;

public class StandardProcedureRepository : BaseRepository
{
    private static readonly HashSet<string> AllowedSortColumns = new(StringComparer.OrdinalIgnoreCase)
    {
        "procedureName", "modalityType", "requiredTime", "anatomicalArea"
    };

    public StandardProcedureRepository(IOptionsMonitor<DatabaseSettings> settings) : base(settings) { }

    public async Task<PagedResponse<StandardProcedure>> SearchAsync(StandardProcedureSearchRequest request)
    {
        var where = new StringBuilder();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            where.Append(" AND (sp.procedure_name ILIKE @Search OR sp.exam_prep_instructions ILIKE @Search)");
            parameters.Add("Search", $"%{request.Search}%");
        }

        if (!string.IsNullOrWhiteSpace(request.ModalityType))
        {
            where.Append(" AND sp.modality_type_id = @ModalityType");
            parameters.Add("ModalityType", request.ModalityType);
        }

        if (request.AnatomicalAreaId.HasValue)
        {
            where.Append(" AND sp.anatomical_area_id = @AnatomicalAreaId");
            parameters.Add("AnatomicalAreaId", request.AnatomicalAreaId.Value);
        }

        var whereClause = where.ToString();
        var orderBy = ResolveSortColumn(request.SortBy);
        var direction = request.SortDesc ? "DESC" : "ASC";

        var countSql = $"""
            SELECT COUNT(*)
            FROM ris.standard_procedures sp
            LEFT JOIN ris.anatomical_areas aa ON sp.anatomical_area_id = aa.anatomical_area_id
            WHERE 1=1 {whereClause}
            """;

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 200);
        var offset = (page - 1) * pageSize;
        parameters.Add("Limit", pageSize);
        parameters.Add("Offset", offset);

        var dataSql = $"""
            SELECT sp.standard_procedure_id AS StandardProcedureId,
                   sp.procedure_name        AS ProcedureName,
                   sp.modality_type_id      AS ModalityTypeId,
                   sp.required_time         AS RequiredTime,
                   sp.anatomical_area_id    AS AnatomicalAreaId,
                   aa.description           AS AnatomicalAreaName,
                   sp.exam_prep_instructions AS ExamPrepInstructions,
                   sp.instructions_required AS InstructionsRequired
            FROM ris.standard_procedures sp
            LEFT JOIN ris.anatomical_areas aa ON sp.anatomical_area_id = aa.anatomical_area_id
            WHERE 1=1 {whereClause}
            ORDER BY {orderBy} {direction}, sp.standard_procedure_id ASC
            LIMIT @Limit OFFSET @Offset
            """;

        await using var connection = await CreateConnectionAsync();

        var totalCount = await connection.ExecuteScalarAsync<int>(countSql, parameters);
        var items = (await connection.QueryAsync<StandardProcedure>(dataSql, parameters)).ToList();

        return new PagedResponse<StandardProcedure>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<StandardProcedure?> GetByIdAsync(long id)
    {
        const string sql = """
            SELECT sp.standard_procedure_id AS StandardProcedureId,
                   sp.procedure_name        AS ProcedureName,
                   sp.modality_type_id      AS ModalityTypeId,
                   sp.required_time         AS RequiredTime,
                   sp.anatomical_area_id    AS AnatomicalAreaId,
                   aa.description           AS AnatomicalAreaName,
                   sp.exam_prep_instructions AS ExamPrepInstructions,
                   sp.instructions_required AS InstructionsRequired
            FROM ris.standard_procedures sp
            LEFT JOIN ris.anatomical_areas aa ON sp.anatomical_area_id = aa.anatomical_area_id
            WHERE sp.standard_procedure_id = @Id
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<StandardProcedure>(sql, new { Id = id });
    }

    public async Task<List<string>> GetDistinctModalityTypesAsync()
    {
        const string sql = """
            SELECT DISTINCT modality_type_id
            FROM ris.standard_procedures
            WHERE modality_type_id IS NOT NULL AND modality_type_id::text <> ''
            ORDER BY modality_type_id ASC
            """;

        await using var connection = await CreateConnectionAsync();
        var types = await connection.QueryAsync<string>(sql);
        return types.ToList();
    }

    public async Task<List<string>> GetAllModalityTypesAsync()
    {
        const string sql = """
            SELECT modality_type_id
            FROM ris.modality_types
            ORDER BY modality_type_id ASC
            """;

        await using var connection = await CreateConnectionAsync();
        var types = await connection.QueryAsync<string>(sql);
        return types.ToList();
    }

    public async Task<List<AnatomicalArea>> GetAnatomicalAreasAsync()
    {
        const string sql = """
            SELECT anatomical_area_id AS AnatomicalAreaId,
                   description        AS AnatomicalAreaName
            FROM ris.anatomical_areas
            ORDER BY description ASC
            """;

        await using var connection = await CreateConnectionAsync();
        var areas = await connection.QueryAsync<AnatomicalArea>(sql);
        return areas.ToList();
    }

    public async Task<StandardProcedure> CreateAsync(CreateStandardProcedureRequest request)
    {
        const string sql = """
            INSERT INTO ris.standard_procedures
                (procedure_name, modality_type_id, required_time,
                 anatomical_area_id, exam_prep_instructions, instructions_required)
            VALUES
                (@ProcedureName, @ModalityTypeId, @RequiredTime,
                 @AnatomicalAreaId, @ExamPrepInstructions, @InstructionsRequired)
            RETURNING standard_procedure_id
            """;

        await using var connection = await CreateConnectionAsync();
        var id = await connection.ExecuteScalarAsync<long>(sql, request);
        return (await GetByIdAsync(id))!;
    }

    public async Task<StandardProcedure?> UpdateAsync(long id, UpdateStandardProcedureRequest request)
    {
        const string sql = """
            UPDATE ris.standard_procedures
            SET procedure_name         = @ProcedureName,
                modality_type_id       = @ModalityTypeId,
                required_time          = @RequiredTime,
                anatomical_area_id     = @AnatomicalAreaId,
                exam_prep_instructions = @ExamPrepInstructions,
                instructions_required  = @InstructionsRequired
            WHERE standard_procedure_id = @Id
            """;

        await using var connection = await CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(sql, new
        {
            Id = id,
            request.ProcedureName,
            request.ModalityTypeId,
            request.RequiredTime,
            request.AnatomicalAreaId,
            request.ExamPrepInstructions,
            request.InstructionsRequired
        });

        if (rows == 0) return null;
        return await GetByIdAsync(id);
    }

    public async Task<(bool Deleted, bool HasReferences, string? ReferenceDetail)> DeleteAsync(long id)
    {
        const string checkSql = """
            SELECT
                (SELECT COUNT(*) FROM ris.billing_standard_procedures             WHERE standard_procedure_id = @Id) AS billing_refs,
                (SELECT COUNT(*) FROM ris.eform_associations                       WHERE standard_procedure_id = @Id) AS eform_refs,
                (SELECT COUNT(*) FROM ris.standard_procedure_treatment_protocols   WHERE standard_procedure_id = @Id) AS protocol_refs,
                (SELECT COUNT(*) FROM ris.template_procedures                      WHERE standard_procedure_id = @Id) AS template_refs,
                (SELECT COUNT(*) FROM ris.order_procedures                         WHERE standard_procedure_id = @Id) AS order_refs
            """;

        const string deleteSql = "DELETE FROM ris.standard_procedures WHERE standard_procedure_id = @Id";

        await using var connection = await CreateConnectionAsync();

        var refs = await connection.QuerySingleAsync<(long billing_refs, long eform_refs, long protocol_refs, long template_refs, long order_refs)>(
            checkSql, new { Id = id });

        var parts = new List<string>();
        if (refs.billing_refs  > 0) parts.Add($"{refs.billing_refs} billing mapping(s)");
        if (refs.eform_refs    > 0) parts.Add($"{refs.eform_refs} eForm association(s)");
        if (refs.protocol_refs > 0) parts.Add($"{refs.protocol_refs} treatment protocol(s)");
        if (refs.template_refs > 0) parts.Add($"{refs.template_refs} template procedure(s)");
        if (refs.order_refs    > 0) parts.Add($"{refs.order_refs} order procedure(s)");

        if (parts.Count > 0)
            return (false, true, string.Join(", ", parts));

        var rows = await connection.ExecuteAsync(deleteSql, new { Id = id });
        return (rows > 0, false, null);
    }

    public async Task<List<StandardProcedure>> ExportAsync(StandardProcedureSearchRequest request)
    {
        var where = new StringBuilder();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            where.Append(" AND (sp.procedure_name ILIKE @Search OR sp.exam_prep_instructions ILIKE @Search)");
            parameters.Add("Search", $"%{request.Search}%");
        }

        if (!string.IsNullOrWhiteSpace(request.ModalityType))
        {
            where.Append(" AND sp.modality_type_id = @ModalityType");
            parameters.Add("ModalityType", request.ModalityType);
        }

        if (request.AnatomicalAreaId.HasValue)
        {
            where.Append(" AND sp.anatomical_area_id = @AnatomicalAreaId");
            parameters.Add("AnatomicalAreaId", request.AnatomicalAreaId.Value);
        }

        var orderBy = ResolveSortColumn(request.SortBy);
        var direction = request.SortDesc ? "DESC" : "ASC";

        var sql = $"""
            SELECT sp.standard_procedure_id AS StandardProcedureId,
                   sp.procedure_name        AS ProcedureName,
                   sp.modality_type_id      AS ModalityTypeId,
                   sp.required_time         AS RequiredTime,
                   sp.anatomical_area_id    AS AnatomicalAreaId,
                   aa.description           AS AnatomicalAreaName,
                   sp.exam_prep_instructions AS ExamPrepInstructions,
                   sp.instructions_required AS InstructionsRequired
            FROM ris.standard_procedures sp
            LEFT JOIN ris.anatomical_areas aa ON sp.anatomical_area_id = aa.anatomical_area_id
            WHERE 1=1 {where}
            ORDER BY {orderBy} {direction}, sp.standard_procedure_id ASC
            LIMIT 50000
            """;

        await using var connection = await CreateConnectionAsync();
        var results = await connection.QueryAsync<StandardProcedure>(sql, parameters);
        return results.ToList();
    }

    public async Task<HashSet<(string ModalityTypeId, string ProcedureName)>> GetExistingKeysAsync(
        IEnumerable<(string ModalityTypeId, string ProcedureName)> keys)
    {
        var keyList = keys.ToList();
        if (keyList.Count == 0) return new HashSet<(string, string)>();

        var modalities = keyList.Select(k => k.ModalityTypeId).ToArray();
        var names      = keyList.Select(k => k.ProcedureName).ToArray();

        const string sql = """
            SELECT modality_type_id AS ModalityTypeId,
                   procedure_name   AS ProcedureName
            FROM ris.standard_procedures
            WHERE (modality_type_id, procedure_name) IN (
                SELECT UNNEST(@Modalities::citext[]), UNNEST(@Names::citext[])
            )
            """;

        await using var connection = await CreateConnectionAsync();
        var rows = await connection.QueryAsync<(string ModalityTypeId, string ProcedureName)>(
            sql, new { Modalities = modalities, Names = names });

        // Case-insensitive set (citext storage is case-insensitive; normalize in-memory comparison too)
        var set = new HashSet<(string, string)>(new ModalityProcedureKeyComparer());
        foreach (var r in rows)
            set.Add((r.ModalityTypeId, r.ProcedureName));
        return set;
    }

    public async Task<(int Inserted, int Updated)> BulkUpsertAsync(
        List<StandardProcedureImportRow> rows, bool overwriteExisting)
    {
        if (rows.Count == 0) return (0, 0);

        await using var connection = await CreateConnectionAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        var inserted = 0;
        var updated = 0;

        const string findSql = """
            SELECT standard_procedure_id
            FROM ris.standard_procedures
            WHERE modality_type_id = @ModalityTypeId AND procedure_name = @ProcedureName
            LIMIT 1
            """;

        const string insertSql = """
            INSERT INTO ris.standard_procedures
                (procedure_name, modality_type_id, required_time,
                 anatomical_area_id, exam_prep_instructions, instructions_required)
            VALUES
                (@ProcedureName, @ModalityTypeId, @RequiredTime,
                 @AnatomicalAreaId, @ExamPrepInstructions, @InstructionsRequired)
            """;

        const string updateSql = """
            UPDATE ris.standard_procedures
            SET required_time          = @RequiredTime,
                anatomical_area_id     = @AnatomicalAreaId,
                exam_prep_instructions = @ExamPrepInstructions,
                instructions_required  = @InstructionsRequired
            WHERE standard_procedure_id = @Id
            """;

        foreach (var row in rows)
        {
            var existingId = await connection.ExecuteScalarAsync<long?>(findSql,
                new { row.ModalityTypeId, row.ProcedureName }, transaction);

            if (existingId.HasValue)
            {
                if (!overwriteExisting) continue;

                await connection.ExecuteAsync(updateSql, new
                {
                    Id = existingId.Value,
                    row.RequiredTime,
                    row.AnatomicalAreaId,
                    row.ExamPrepInstructions,
                    row.InstructionsRequired
                }, transaction);
                updated++;
            }
            else
            {
                await connection.ExecuteAsync(insertSql, row, transaction);
                inserted++;
            }
        }

        await transaction.CommitAsync();
        return (inserted, updated);
    }

    public async Task<bool> ModalityTypeExistsAsync(string modalityTypeId)
    {
        const string sql = "SELECT EXISTS(SELECT 1 FROM ris.modality_types WHERE modality_type_id = @Id)";
        await using var connection = await CreateConnectionAsync();
        return await connection.ExecuteScalarAsync<bool>(sql, new { Id = modalityTypeId });
    }

    public async Task<bool> AnatomicalAreaExistsAsync(int anatomicalAreaId)
    {
        const string sql = "SELECT EXISTS(SELECT 1 FROM ris.anatomical_areas WHERE anatomical_area_id = @Id)";
        await using var connection = await CreateConnectionAsync();
        return await connection.ExecuteScalarAsync<bool>(sql, new { Id = anatomicalAreaId });
    }

    private static string ResolveSortColumn(string? sortBy)
    {
        if (string.IsNullOrWhiteSpace(sortBy) || !AllowedSortColumns.Contains(sortBy))
            return "sp.procedure_name";

        return sortBy.ToLowerInvariant() switch
        {
            "procedurename"   => "sp.procedure_name",
            "modalitytype"    => "sp.modality_type_id",
            "requiredtime"    => "sp.required_time",
            "anatomicalarea"  => "aa.description",
            _ => "sp.procedure_name"
        };
    }

    private sealed class ModalityProcedureKeyComparer : IEqualityComparer<(string ModalityTypeId, string ProcedureName)>
    {
        public bool Equals((string ModalityTypeId, string ProcedureName) x, (string ModalityTypeId, string ProcedureName) y)
            => string.Equals(x.ModalityTypeId, y.ModalityTypeId, StringComparison.OrdinalIgnoreCase)
            && string.Equals(x.ProcedureName,  y.ProcedureName,  StringComparison.OrdinalIgnoreCase);

        public int GetHashCode((string ModalityTypeId, string ProcedureName) obj)
            => HashCode.Combine(
                obj.ModalityTypeId?.ToLowerInvariant(),
                obj.ProcedureName?.ToLowerInvariant());
    }
}
