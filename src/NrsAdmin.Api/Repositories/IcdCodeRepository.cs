using System.Text;
using Dapper;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;

namespace NrsAdmin.Api.Repositories;

public class IcdCodeRepository : BaseRepository
{
    private static readonly HashSet<string> AllowedSortColumns = new(StringComparer.OrdinalIgnoreCase)
    {
        "icdCodeId", "description", "icdCodeVersion", "icdCodeDisplay", "obsoleteDate"
    };

    public IcdCodeRepository(IOptionsMonitor<DatabaseSettings> settings) : base(settings) { }

    public async Task<PagedResponse<IcdCode>> SearchAsync(IcdCodeSearchRequest request)
    {
        var where = new StringBuilder();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            where.Append(" AND (i.icd_code_id ILIKE @Search OR i.description ILIKE @Search OR i.icd_code_display ILIKE @Search)");
            parameters.Add("Search", $"%{request.Search}%");
        }

        if (request.Version.HasValue)
        {
            where.Append(" AND i.icd_code_version = @Version");
            parameters.Add("Version", request.Version.Value);
        }

        if (request.CategoryId.HasValue)
        {
            where.Append(" AND i.sub_category_id = @CategoryId");
            parameters.Add("CategoryId", request.CategoryId.Value);
        }

        if (request.IncludeObsolete != true)
        {
            where.Append(" AND i.obsolete_date IS NULL");
        }

        var whereClause = where.ToString();

        var orderBy = ResolveSortColumn(request.SortBy);
        var direction = request.SortDesc ? "DESC" : "ASC";

        var countSql = $"""
            SELECT COUNT(*)
            FROM ris.icd_codes i
            WHERE 1=1 {whereClause}
            """;

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 200);
        var offset = (page - 1) * pageSize;
        parameters.Add("Limit", pageSize);
        parameters.Add("Offset", offset);

        var dataSql = $"""
            SELECT i.icd_code_id AS IcdCodeId, i.description AS Description,
                   i.sub_category_id AS SubCategoryId, i.icd_code_version AS IcdCodeVersion,
                   i.icd_code_display AS IcdCodeDisplay, i.obsolete_date AS ObsoleteDate,
                   c.description AS CategoryName
            FROM ris.icd_codes i
            LEFT JOIN ris.icd_categories c ON i.sub_category_id = c.icd_category_id
            WHERE 1=1 {whereClause}
            ORDER BY {orderBy} {direction}, i.icd_code_id ASC
            LIMIT @Limit OFFSET @Offset
            """;

        await using var connection = await CreateConnectionAsync();

        var totalCount = await connection.ExecuteScalarAsync<int>(countSql, parameters);
        var items = (await connection.QueryAsync<IcdCode>(dataSql, parameters)).ToList();

        return new PagedResponse<IcdCode>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<IcdCode?> GetByIdAsync(string id)
    {
        const string sql = """
            SELECT i.icd_code_id AS IcdCodeId, i.description AS Description,
                   i.sub_category_id AS SubCategoryId, i.icd_code_version AS IcdCodeVersion,
                   i.icd_code_display AS IcdCodeDisplay, i.obsolete_date AS ObsoleteDate,
                   c.description AS CategoryName
            FROM ris.icd_codes i
            LEFT JOIN ris.icd_categories c ON i.sub_category_id = c.icd_category_id
            WHERE i.icd_code_id = @Id
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<IcdCode>(sql, new { Id = id });
    }

    public async Task<List<IcdCategory>> GetCategoriesAsync(int? version = null)
    {
        var sql = new StringBuilder("""
            SELECT icd_category_id AS IcdCategoryId, parent_id AS ParentId,
                   description AS Description, version AS Version,
                   first AS First, last AS Last
            FROM ris.icd_categories
            """);

        var parameters = new DynamicParameters();

        if (version.HasValue)
        {
            sql.Append(" WHERE version = @Version");
            parameters.Add("Version", version.Value);
        }

        sql.Append(" ORDER BY description ASC");

        await using var connection = await CreateConnectionAsync();
        var categories = await connection.QueryAsync<IcdCategory>(sql.ToString(), parameters);
        return categories.ToList();
    }

    public async Task<IcdCode> CreateAsync(CreateIcdCodeRequest request)
    {
        const string sql = """
            INSERT INTO ris.icd_codes
                (icd_code_id, description, sub_category_id, icd_code_version, icd_code_display)
            VALUES
                (@IcdCodeId, @Description, @SubCategoryId, @IcdCodeVersion, @IcdCodeDisplay)
            RETURNING icd_code_id AS IcdCodeId, description AS Description,
                      sub_category_id AS SubCategoryId, icd_code_version AS IcdCodeVersion,
                      icd_code_display AS IcdCodeDisplay, obsolete_date AS ObsoleteDate
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleAsync<IcdCode>(sql, request);
    }

    public async Task<IcdCode?> UpdateAsync(string id, UpdateIcdCodeRequest request)
    {
        const string sql = """
            UPDATE ris.icd_codes
            SET description = @Description, sub_category_id = @SubCategoryId,
                icd_code_version = @IcdCodeVersion, icd_code_display = @IcdCodeDisplay
            WHERE icd_code_id = @Id
            RETURNING icd_code_id AS IcdCodeId, description AS Description,
                      sub_category_id AS SubCategoryId, icd_code_version AS IcdCodeVersion,
                      icd_code_display AS IcdCodeDisplay, obsolete_date AS ObsoleteDate
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<IcdCode>(sql,
            new
            {
                Id = id,
                request.Description,
                request.SubCategoryId,
                request.IcdCodeVersion,
                request.IcdCodeDisplay
            });
    }

    public async Task<(bool Deleted, bool HasReferences)> DeleteAsync(string id)
    {
        const string checkSql = """
            SELECT EXISTS(
                SELECT 1 FROM ris.billing_orders_icd_codes WHERE icd_code_id = @Id
            ) AS has_refs
            """;

        const string deleteSql = """
            DELETE FROM ris.icd_codes WHERE icd_code_id = @Id
            """;

        await using var connection = await CreateConnectionAsync();

        var hasRefs = await connection.ExecuteScalarAsync<bool>(checkSql, new { Id = id });
        if (hasRefs)
            return (false, true);

        var rows = await connection.ExecuteAsync(deleteSql, new { Id = id });
        return (rows > 0, false);
    }

    public async Task<bool> SetObsoleteAsync(string id)
    {
        const string sql = """
            UPDATE ris.icd_codes SET obsolete_date = NOW()
            WHERE icd_code_id = @Id AND obsolete_date IS NULL
            """;

        await using var connection = await CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(sql, new { Id = id });
        return rows > 0;
    }

    public async Task<bool> RestoreAsync(string id)
    {
        const string sql = """
            UPDATE ris.icd_codes SET obsolete_date = NULL
            WHERE icd_code_id = @Id AND obsolete_date IS NOT NULL
            """;

        await using var connection = await CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(sql, new { Id = id });
        return rows > 0;
    }

    private static string ResolveSortColumn(string? sortBy)
    {
        if (string.IsNullOrWhiteSpace(sortBy) || !AllowedSortColumns.Contains(sortBy))
            return "i.icd_code_id";

        return sortBy.ToLowerInvariant() switch
        {
            "icdcodeid" => "i.icd_code_id",
            "description" => "i.description",
            "icdcodeversion" => "i.icd_code_version",
            "icdcodedisplay" => "i.icd_code_display",
            "obsoletedate" => "i.obsolete_date",
            _ => "i.icd_code_id"
        };
    }
}
