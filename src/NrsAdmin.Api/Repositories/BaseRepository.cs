using System.Data;
using Microsoft.Extensions.Options;
using Npgsql;
using NrsAdmin.Api.Configuration;

namespace NrsAdmin.Api.Repositories;

public abstract class BaseRepository
{
    private readonly DatabaseSettings _settings;

    protected BaseRepository(IOptions<DatabaseSettings> settings)
    {
        _settings = settings.Value;
    }

    protected async Task<NpgsqlConnection> CreateConnectionAsync()
    {
        var connection = new NpgsqlConnection(_settings.MainConnectionString);
        await connection.OpenAsync();
        return connection;
    }

    protected async Task<NpgsqlConnection> CreateLocalConnectionAsync()
    {
        var connection = new NpgsqlConnection(_settings.LocalConnectionString);
        await connection.OpenAsync();
        return connection;
    }
}
