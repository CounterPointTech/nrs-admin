using System.Text;
using Dapper;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;

namespace NrsAdmin.Api.Repositories;

public class BillingCodeRepository : BaseRepository
{
    private static readonly HashSet<string> AllowedSortColumns = new(StringComparer.OrdinalIgnoreCase)
    {
        "serviceCode", "description", "modalityType", "rvuWork"
    };

    public BillingCodeRepository(IOptionsMonitor<DatabaseSettings> settings) : base(settings) { }

    public async Task<PagedResponse<BillingServiceCode>> SearchAsync(CptCodeSearchRequest request)
    {
        var where = new StringBuilder();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            where.Append(" AND (b.service_code ILIKE @Search OR b.description ILIKE @Search)");
            parameters.Add("Search", $"%{request.Search}%");
        }

        if (!string.IsNullOrWhiteSpace(request.ModalityType))
        {
            where.Append(" AND b.modality_type = @ModalityType");
            parameters.Add("ModalityType", request.ModalityType);
        }

        var whereClause = where.ToString();

        var orderBy = ResolveSortColumn(request.SortBy);
        var direction = request.SortDesc ? "DESC" : "ASC";

        var countSql = $"""
            SELECT COUNT(*)
            FROM ris.billing_service_codes b
            WHERE 1=1 {whereClause}
            """;

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 200);
        var offset = (page - 1) * pageSize;
        parameters.Add("Limit", pageSize);
        parameters.Add("Offset", offset);

        var dataSql = $"""
            SELECT b.service_code_id AS ServiceCodeId, b.service_code AS ServiceCode,
                   b.description AS Description, b.modality_type AS ModalityType,
                   b.rvu_work AS RvuWork, b.custom_field_1 AS CustomField1,
                   b.custom_field_2 AS CustomField2, b.custom_field_3 AS CustomField3
            FROM ris.billing_service_codes b
            WHERE 1=1 {whereClause}
            ORDER BY {orderBy} {direction}, b.service_code_id ASC
            LIMIT @Limit OFFSET @Offset
            """;

        await using var connection = await CreateConnectionAsync();

        var totalCount = await connection.ExecuteScalarAsync<int>(countSql, parameters);
        var items = (await connection.QueryAsync<BillingServiceCode>(dataSql, parameters)).ToList();

        return new PagedResponse<BillingServiceCode>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<BillingServiceCode?> GetByIdAsync(long id)
    {
        const string sql = """
            SELECT service_code_id AS ServiceCodeId, service_code AS ServiceCode,
                   description AS Description, modality_type AS ModalityType,
                   rvu_work AS RvuWork, custom_field_1 AS CustomField1,
                   custom_field_2 AS CustomField2, custom_field_3 AS CustomField3
            FROM ris.billing_service_codes
            WHERE service_code_id = @Id
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<BillingServiceCode>(sql, new { Id = id });
    }

    public async Task<List<string>> GetDistinctModalityTypesAsync()
    {
        const string sql = """
            SELECT DISTINCT modality_type
            FROM ris.billing_service_codes
            WHERE modality_type IS NOT NULL AND modality_type != ''
            ORDER BY modality_type ASC
            """;

        await using var connection = await CreateConnectionAsync();
        var types = await connection.QueryAsync<string>(sql);
        return types.ToList();
    }

    public async Task<BillingServiceCode> CreateAsync(CreateCptCodeRequest request)
    {
        const string sql = """
            INSERT INTO ris.billing_service_codes
                (service_code, description, modality_type, rvu_work,
                 custom_field_1, custom_field_2, custom_field_3)
            VALUES
                (@ServiceCode, @Description, @ModalityType, @RvuWork,
                 @CustomField1, @CustomField2, @CustomField3)
            RETURNING service_code_id AS ServiceCodeId, service_code AS ServiceCode,
                      description AS Description, modality_type AS ModalityType,
                      rvu_work AS RvuWork, custom_field_1 AS CustomField1,
                      custom_field_2 AS CustomField2, custom_field_3 AS CustomField3
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleAsync<BillingServiceCode>(sql, request);
    }

    public async Task<BillingServiceCode?> UpdateAsync(long id, UpdateCptCodeRequest request)
    {
        const string sql = """
            UPDATE ris.billing_service_codes
            SET service_code = @ServiceCode, description = @Description,
                modality_type = @ModalityType, rvu_work = @RvuWork,
                custom_field_1 = @CustomField1, custom_field_2 = @CustomField2,
                custom_field_3 = @CustomField3
            WHERE service_code_id = @Id
            RETURNING service_code_id AS ServiceCodeId, service_code AS ServiceCode,
                      description AS Description, modality_type AS ModalityType,
                      rvu_work AS RvuWork, custom_field_1 AS CustomField1,
                      custom_field_2 AS CustomField2, custom_field_3 AS CustomField3
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<BillingServiceCode>(sql,
            new
            {
                Id = id,
                request.ServiceCode,
                request.Description,
                request.ModalityType,
                request.RvuWork,
                request.CustomField1,
                request.CustomField2,
                request.CustomField3
            });
    }

    public async Task<(bool Deleted, bool HasReferences)> DeleteAsync(long id)
    {
        const string checkSql = """
            SELECT EXISTS(
                SELECT 1 FROM ris.order_procedure_service_lines WHERE service_code_id = @Id
                UNION ALL
                SELECT 1 FROM ris.standard_procedure_service_lines WHERE service_code_id = @Id
            ) AS has_refs
            """;

        const string deleteSql = """
            DELETE FROM ris.billing_service_codes WHERE service_code_id = @Id
            """;

        await using var connection = await CreateConnectionAsync();

        var hasRefs = await connection.ExecuteScalarAsync<bool>(checkSql, new { Id = id });
        if (hasRefs)
            return (false, true);

        var rows = await connection.ExecuteAsync(deleteSql, new { Id = id });
        return (rows > 0, false);
    }

    public async Task<List<BillingServiceCode>> ExportAsync(CptCodeSearchRequest request)
    {
        var where = new StringBuilder();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            where.Append(" AND (b.service_code ILIKE @Search OR b.description ILIKE @Search)");
            parameters.Add("Search", $"%{request.Search}%");
        }

        if (!string.IsNullOrWhiteSpace(request.ModalityType))
        {
            where.Append(" AND b.modality_type = @ModalityType");
            parameters.Add("ModalityType", request.ModalityType);
        }

        var orderBy = ResolveSortColumn(request.SortBy);
        var direction = request.SortDesc ? "DESC" : "ASC";

        var sql = $"""
            SELECT b.service_code_id AS ServiceCodeId, b.service_code AS ServiceCode,
                   b.description AS Description, b.modality_type AS ModalityType,
                   b.rvu_work AS RvuWork, b.custom_field_1 AS CustomField1,
                   b.custom_field_2 AS CustomField2, b.custom_field_3 AS CustomField3
            FROM ris.billing_service_codes b
            WHERE 1=1 {where}
            ORDER BY {orderBy} {direction}, b.service_code_id ASC
            LIMIT 50000
            """;

        await using var connection = await CreateConnectionAsync();
        var results = await connection.QueryAsync<BillingServiceCode>(sql, parameters);
        return results.ToList();
    }

    public async Task<HashSet<string>> GetExistingServiceCodesAsync(IEnumerable<string> codes)
    {
        const string sql = """
            SELECT service_code FROM ris.billing_service_codes
            WHERE service_code = ANY(@Codes)
            """;

        await using var connection = await CreateConnectionAsync();
        var existing = await connection.QueryAsync<string>(sql, new { Codes = codes.ToArray() });
        return existing.ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    public async Task<(int Inserted, int Updated)> BulkUpsertAsync(
        List<CptImportRow> rows, bool overwriteExisting)
    {
        await using var connection = await CreateConnectionAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        var inserted = 0;
        var updated = 0;

        foreach (var row in rows)
        {
            if (overwriteExisting)
            {
                const string upsertSql = """
                    INSERT INTO ris.billing_service_codes
                        (service_code, description, modality_type, rvu_work,
                         custom_field_1, custom_field_2, custom_field_3)
                    VALUES
                        (@ServiceCode, @Description, @ModalityType, @RvuWork,
                         @CustomField1, @CustomField2, @CustomField3)
                    ON CONFLICT (service_code) DO UPDATE SET
                        description = EXCLUDED.description,
                        modality_type = EXCLUDED.modality_type,
                        rvu_work = EXCLUDED.rvu_work,
                        custom_field_1 = EXCLUDED.custom_field_1,
                        custom_field_2 = EXCLUDED.custom_field_2,
                        custom_field_3 = EXCLUDED.custom_field_3
                    RETURNING (xmax = 0) AS is_insert
                    """;

                var isInsert = await connection.ExecuteScalarAsync<bool>(upsertSql, row, transaction);
                if (isInsert)
                    inserted++;
                else
                    updated++;
            }
            else
            {
                const string insertSql = """
                    INSERT INTO ris.billing_service_codes
                        (service_code, description, modality_type, rvu_work,
                         custom_field_1, custom_field_2, custom_field_3)
                    VALUES
                        (@ServiceCode, @Description, @ModalityType, @RvuWork,
                         @CustomField1, @CustomField2, @CustomField3)
                    ON CONFLICT (service_code) DO NOTHING
                    """;

                var rows_affected = await connection.ExecuteAsync(insertSql, row, transaction);
                if (rows_affected > 0)
                    inserted++;
            }
        }

        await transaction.CommitAsync();
        return (inserted, updated);
    }

    private static string ResolveSortColumn(string? sortBy)
    {
        if (string.IsNullOrWhiteSpace(sortBy) || !AllowedSortColumns.Contains(sortBy))
            return "b.service_code";

        return sortBy.ToLowerInvariant() switch
        {
            "servicecode" => "b.service_code",
            "description" => "b.description",
            "modalitytype" => "b.modality_type",
            "rvuwork" => "b.rvu_work",
            _ => "b.service_code"
        };
    }
}
