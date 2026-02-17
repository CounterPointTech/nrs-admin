using Dapper;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;

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
}
