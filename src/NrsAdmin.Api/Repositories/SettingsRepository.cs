using Dapper;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Responses;

namespace NrsAdmin.Api.Repositories;

public class SettingsRepository : BaseRepository
{
    public SettingsRepository(IOptionsMonitor<DatabaseSettings> settings) : base(settings) { }

    // ============== shared.settings ==============

    public async Task<List<Setting>> GetAllSharedSettingsAsync(string? search = null)
    {
        var sql = """
            SELECT setting_id AS SettingId, name AS Name, value AS Value,
                   created_on_date AS CreatedOnDate, last_update_date AS LastUpdateDate,
                   using_default AS UsingDefault
            FROM shared.settings
            """;

        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(search))
        {
            sql += " WHERE name ILIKE @Search OR value ILIKE @Search";
            parameters.Add("Search", $"%{search}%");
        }

        sql += " ORDER BY name ASC";

        await using var connection = await CreateConnectionAsync();
        var settings = await connection.QueryAsync<Setting>(sql, parameters);
        return settings.ToList();
    }

    public async Task<Setting?> GetSharedSettingByNameAsync(string name)
    {
        const string sql = """
            SELECT setting_id AS SettingId, name AS Name, value AS Value,
                   created_on_date AS CreatedOnDate, last_update_date AS LastUpdateDate,
                   using_default AS UsingDefault
            FROM shared.settings
            WHERE name = @Name
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<Setting>(sql, new { Name = name });
    }

    public async Task<bool> UpdateSharedSettingAsync(string name, string? value)
    {
        const string sql = """
            UPDATE shared.settings
            SET value = @Value, last_update_date = NOW(), using_default = false
            WHERE name = @Name
            """;

        await using var connection = await CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(sql, new { Name = name, Value = value });
        return rows > 0;
    }

    // ============== site.settings ==============

    public async Task<List<SiteSetting>> GetAllSiteSettingsAsync(string? search = null)
    {
        var sql = """
            SELECT setting_id AS SettingId, name AS Name, value AS Value,
                   created_on_date AS CreatedOnDate, last_update_date AS LastUpdateDate
            FROM site.settings
            """;

        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(search))
        {
            sql += " WHERE name ILIKE @Search OR value ILIKE @Search";
            parameters.Add("Search", $"%{search}%");
        }

        sql += " ORDER BY name ASC";

        await using var connection = await CreateConnectionAsync();
        var settings = await connection.QueryAsync<SiteSetting>(sql, parameters);
        return settings.ToList();
    }

    public async Task<SiteSetting?> GetSiteSettingByNameAsync(string name)
    {
        const string sql = """
            SELECT setting_id AS SettingId, name AS Name, value AS Value,
                   created_on_date AS CreatedOnDate, last_update_date AS LastUpdateDate
            FROM site.settings
            WHERE name = @Name
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<SiteSetting>(sql, new { Name = name });
    }

    public async Task<bool> UpdateSiteSettingAsync(string name, string? value)
    {
        const string sql = """
            UPDATE site.settings
            SET value = @Value, last_update_date = NOW()
            WHERE name = @Name
            """;

        await using var connection = await CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(sql, new { Name = name, Value = value });
        return rows > 0;
    }

    // ============== Simple settings (pacs, ris, object_store) ==============

    private async Task<List<SimpleSetting>> GetSimpleSettingsAsync(string schema, string table)
    {
        var sql = $"SELECT name AS Name, value AS Value FROM {schema}.{table} ORDER BY name ASC";
        await using var connection = await CreateConnectionAsync();
        var settings = await connection.QueryAsync<SimpleSetting>(sql);
        return settings.ToList();
    }

    private async Task<SimpleSetting?> GetSimpleSettingByNameAsync(string schema, string table, string name)
    {
        var sql = $"SELECT name AS Name, value AS Value FROM {schema}.{table} WHERE name = @Name";
        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<SimpleSetting>(sql, new { Name = name });
    }

    private async Task<bool> UpdateSimpleSettingAsync(string schema, string table, string name, string? value)
    {
        var sql = $"UPDATE {schema}.{table} SET value = @Value WHERE name = @Name";
        await using var connection = await CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(sql, new { Name = name, Value = value });
        return rows > 0;
    }

    // pacs.settings
    public Task<List<SimpleSetting>> GetAllPacsSettingsAsync() => GetSimpleSettingsAsync("pacs", "settings");
    public Task<SimpleSetting?> GetPacsSettingByNameAsync(string name) => GetSimpleSettingByNameAsync("pacs", "settings", name);
    public Task<bool> UpdatePacsSettingAsync(string name, string? value) => UpdateSimpleSettingAsync("pacs", "settings", name, value);

    // ris.settings
    public Task<List<SimpleSetting>> GetAllRisSettingsAsync() => GetSimpleSettingsAsync("ris", "settings");
    public Task<SimpleSetting?> GetRisSettingByNameAsync(string name) => GetSimpleSettingByNameAsync("ris", "settings", name);
    public Task<bool> UpdateRisSettingAsync(string name, string? value) => UpdateSimpleSettingAsync("ris", "settings", name, value);

    // object_store.settings
    public Task<List<SimpleSetting>> GetAllObjectStoreSettingsAsync() => GetSimpleSettingsAsync("object_store", "settings");
    public Task<SimpleSetting?> GetObjectStoreSettingByNameAsync(string name) => GetSimpleSettingByNameAsync("object_store", "settings", name);
    public Task<bool> UpdateObjectStoreSettingAsync(string name, string? value) => UpdateSimpleSettingAsync("object_store", "settings", name, value);

    // pacs.options
    public Task<List<SimpleSetting>> GetAllPacsOptionsAsync() => GetSimpleSettingsAsync("pacs", "options");
    public Task<SimpleSetting?> GetPacsOptionByNameAsync(string name) => GetSimpleSettingByNameAsync("pacs", "options", name);
    public Task<bool> UpdatePacsOptionAsync(string name, string? value) => UpdateSimpleSettingAsync("pacs", "options", name, value);

    // ris.options
    public Task<List<SimpleSetting>> GetAllRisOptionsAsync() => GetSimpleSettingsAsync("ris", "options");
    public Task<SimpleSetting?> GetRisOptionByNameAsync(string name) => GetSimpleSettingByNameAsync("ris", "options", name);
    public Task<bool> UpdateRisOptionAsync(string name, string? value) => UpdateSimpleSettingAsync("ris", "options", name, value);

    // ============== Unified aggregation ==============

    public async Task<List<UnifiedSettingResponse>> GetAllUnifiedSettingsAsync()
    {
        // Fetch all 7 tables in parallel
        var sharedTask = GetAllSharedSettingsAsync();
        var siteTask = GetAllSiteSettingsAsync();
        var pacsTask = GetAllPacsSettingsAsync();
        var risTask = GetAllRisSettingsAsync();
        var objectStoreTask = GetAllObjectStoreSettingsAsync();
        var pacsOptionsTask = GetAllPacsOptionsAsync();
        var risOptionsTask = GetAllRisOptionsAsync();

        await Task.WhenAll(sharedTask, siteTask, pacsTask, risTask, objectStoreTask, pacsOptionsTask, risOptionsTask);

        var results = new List<UnifiedSettingResponse>();

        foreach (var s in sharedTask.Result)
        {
            results.Add(new UnifiedSettingResponse
            {
                Name = s.Name,
                Value = s.Value,
                Source = "shared",
                SourceLabel = "Shared",
                UsingDefault = s.UsingDefault,
                LastUpdateDate = s.LastUpdateDate,
                CreatedOnDate = s.CreatedOnDate,
            });
        }

        foreach (var s in siteTask.Result)
        {
            results.Add(new UnifiedSettingResponse
            {
                Name = s.Name,
                Value = s.Value,
                Source = "site",
                SourceLabel = "Site",
                LastUpdateDate = s.LastUpdateDate,
                CreatedOnDate = s.CreatedOnDate,
            });
        }

        AddSimpleSettings(results, pacsTask.Result, "pacs", "PACS");
        AddSimpleSettings(results, risTask.Result, "ris", "RIS");
        AddSimpleSettings(results, objectStoreTask.Result, "object_store", "Object Store");
        AddSimpleSettings(results, pacsOptionsTask.Result, "pacs_options", "PACS Options");
        AddSimpleSettings(results, risOptionsTask.Result, "ris_options", "RIS Options");

        return results.OrderBy(r => r.Name).ToList();
    }

    public async Task<SettingsOverviewResponse> GetOverviewAsync()
    {
        const string sql = """
            SELECT 'shared' AS source, COUNT(*) AS count FROM shared.settings
            UNION ALL SELECT 'site', COUNT(*) FROM site.settings
            UNION ALL SELECT 'pacs', COUNT(*) FROM pacs.settings
            UNION ALL SELECT 'ris', COUNT(*) FROM ris.settings
            UNION ALL SELECT 'object_store', COUNT(*) FROM object_store.settings
            UNION ALL SELECT 'pacs_options', COUNT(*) FROM pacs.options
            UNION ALL SELECT 'ris_options', COUNT(*) FROM ris.options
            """;

        await using var connection = await CreateConnectionAsync();
        var rows = await connection.QueryAsync<(string source, int count)>(sql);

        var sourceLabels = new Dictionary<string, string>
        {
            ["shared"] = "Shared",
            ["site"] = "Site",
            ["pacs"] = "PACS",
            ["ris"] = "RIS",
            ["object_store"] = "Object Store",
            ["pacs_options"] = "PACS Options",
            ["ris_options"] = "RIS Options",
        };

        var sources = rows.Select(r => new SourceCount
        {
            Source = r.source,
            SourceLabel = sourceLabels.GetValueOrDefault(r.source, r.source),
            Count = r.count,
        }).ToList();

        return new SettingsOverviewResponse
        {
            Total = sources.Sum(s => s.Count),
            Sources = sources,
        };
    }

    private static void AddSimpleSettings(List<UnifiedSettingResponse> results, List<SimpleSetting> settings, string source, string sourceLabel)
    {
        foreach (var s in settings)
        {
            results.Add(new UnifiedSettingResponse
            {
                Name = s.Name,
                Value = s.Value,
                Source = source,
                SourceLabel = sourceLabel,
            });
        }
    }
}
