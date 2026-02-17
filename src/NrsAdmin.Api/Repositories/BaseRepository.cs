using System.Data;
using Microsoft.Extensions.Options;
using Npgsql;
using NrsAdmin.Api.Configuration;

namespace NrsAdmin.Api.Repositories;

public abstract class BaseRepository
{
    private readonly IOptionsMonitor<DatabaseSettings> _settings;

    protected BaseRepository(IOptionsMonitor<DatabaseSettings> settings)
    {
        _settings = settings;
    }

    protected async Task<NpgsqlConnection> CreateConnectionAsync()
    {
        var connection = new NpgsqlConnection(_settings.CurrentValue.MainConnectionString);
        await connection.OpenAsync();
        return connection;
    }

    protected async Task<NpgsqlConnection> CreateLocalConnectionAsync()
    {
        var connection = new NpgsqlConnection(_settings.CurrentValue.LocalConnectionString);
        await connection.OpenAsync();
        return connection;
    }
}
