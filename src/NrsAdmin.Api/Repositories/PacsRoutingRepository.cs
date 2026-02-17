using Dapper;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;

namespace NrsAdmin.Api.Repositories;

public class PacsRoutingRepository : BaseRepository
{
    public PacsRoutingRepository(IOptions<DatabaseSettings> settings) : base(settings) { }

    // ==================== Destinations ====================

    public async Task<List<PacsDestination>> GetAllDestinationsAsync()
    {
        const string sql = """
            SELECT d.destination_id AS DestinationId, d.name AS Name, d.address AS Address,
                   d.ae_title AS AeTitle, d.port AS Port, d.type AS Type,
                   d.password AS Password, d.num_tries AS NumTries, d.frequency AS Frequency,
                   d.compression AS Compression, d.status AS Status,
                   d.route_related AS RouteRelated, d.transfer_syntax AS TransferSyntax,
                   d.routing_zone AS RoutingZone, rz.zone_name AS RoutingZoneName
            FROM pacs.destinations d
            LEFT JOIN pacs.routing_zones rz ON d.routing_zone = rz.id
            ORDER BY d.destination_id ASC
            """;

        await using var connection = await CreateConnectionAsync();
        var destinations = await connection.QueryAsync<PacsDestination>(sql);
        return destinations.ToList();
    }

    public async Task<PacsDestination?> GetDestinationByIdAsync(int id)
    {
        const string sql = """
            SELECT d.destination_id AS DestinationId, d.name AS Name, d.address AS Address,
                   d.ae_title AS AeTitle, d.port AS Port, d.type AS Type,
                   d.password AS Password, d.num_tries AS NumTries, d.frequency AS Frequency,
                   d.compression AS Compression, d.status AS Status,
                   d.route_related AS RouteRelated, d.transfer_syntax AS TransferSyntax,
                   d.routing_zone AS RoutingZone, rz.zone_name AS RoutingZoneName
            FROM pacs.destinations d
            LEFT JOIN pacs.routing_zones rz ON d.routing_zone = rz.id
            WHERE d.destination_id = @Id
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<PacsDestination>(sql, new { Id = id });
    }

    public async Task<PacsDestination> CreateDestinationAsync(
        string name, string address, string aeTitle, int port, short type,
        string? password, int numTries, int frequency, int compression,
        short status, bool routeRelated, string transferSyntax, int? routingZone)
    {
        const string sql = """
            INSERT INTO pacs.destinations (name, address, ae_title, port, type, password,
                                           num_tries, frequency, compression, status,
                                           route_related, transfer_syntax, routing_zone)
            VALUES (@Name, @Address, @AeTitle, @Port, @Type, @Password,
                    @NumTries, @Frequency, @Compression, @Status,
                    @RouteRelated, @TransferSyntax, @RoutingZone)
            RETURNING destination_id
            """;

        await using var connection = await CreateConnectionAsync();
        var id = await connection.ExecuteScalarAsync<int>(sql, new
        {
            Name = name,
            Address = address,
            AeTitle = aeTitle,
            Port = port,
            Type = type,
            Password = password,
            NumTries = numTries,
            Frequency = frequency,
            Compression = compression,
            Status = status,
            RouteRelated = routeRelated,
            TransferSyntax = transferSyntax,
            RoutingZone = routingZone
        });

        return (await GetDestinationByIdAsync(id))!;
    }

    public async Task<PacsDestination?> UpdateDestinationAsync(int id,
        string name, string address, string aeTitle, int port, short type,
        string? password, int numTries, int frequency, int compression,
        short status, bool routeRelated, string transferSyntax, int? routingZone)
    {
        const string sql = """
            UPDATE pacs.destinations
            SET name = @Name, address = @Address, ae_title = @AeTitle, port = @Port,
                type = @Type, password = @Password, num_tries = @NumTries,
                frequency = @Frequency, compression = @Compression, status = @Status,
                route_related = @RouteRelated, transfer_syntax = @TransferSyntax,
                routing_zone = @RoutingZone
            WHERE destination_id = @Id
            """;

        await using var connection = await CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(sql, new
        {
            Id = id,
            Name = name,
            Address = address,
            AeTitle = aeTitle,
            Port = port,
            Type = type,
            Password = password,
            NumTries = numTries,
            Frequency = frequency,
            Compression = compression,
            Status = status,
            RouteRelated = routeRelated,
            TransferSyntax = transferSyntax,
            RoutingZone = routingZone
        });

        return rows > 0 ? await GetDestinationByIdAsync(id) : null;
    }

    public async Task<(bool Deleted, bool HasReferences)> DeleteDestinationAsync(int id)
    {
        const string checkSql = """
            SELECT EXISTS(
                SELECT 1 FROM pacs.route_history WHERE destination_id = @Id
            ) AS has_refs
            """;

        const string deleteSql = """
            DELETE FROM pacs.destinations WHERE destination_id = @Id
            """;

        await using var connection = await CreateConnectionAsync();

        var hasRefs = await connection.ExecuteScalarAsync<bool>(checkSql, new { Id = id });
        if (hasRefs)
            return (false, true);

        var rows = await connection.ExecuteAsync(deleteSql, new { Id = id });
        return (rows > 0, false);
    }

    // ==================== Route History (Read-Only) ====================

    public async Task<List<RouteHistoryEntry>> GetRouteHistoryAsync(int destinationId, int limit = 100)
    {
        const string sql = """
            SELECT rh.id AS Id, rh.destination_id AS DestinationId,
                   rh.dataset AS Dataset, rh.time_sent AS TimeSent,
                   rh.overwrite_existing AS OverwriteExisting,
                   d.name AS DestinationName
            FROM pacs.route_history rh
            LEFT JOIN pacs.destinations d ON rh.destination_id = d.destination_id
            WHERE rh.destination_id = @DestinationId
            ORDER BY rh.time_sent DESC
            LIMIT @Limit
            """;

        await using var connection = await CreateConnectionAsync();
        var history = await connection.QueryAsync<RouteHistoryEntry>(sql, new { DestinationId = destinationId, Limit = limit });
        return history.ToList();
    }

    // ==================== Routing Zones ====================

    public async Task<List<RoutingZone>> GetAllZonesAsync()
    {
        const string sql = """
            SELECT id AS Id, zone_name AS ZoneName, is_default AS IsDefault
            FROM pacs.routing_zones
            ORDER BY id ASC
            """;

        await using var connection = await CreateConnectionAsync();
        var zones = await connection.QueryAsync<RoutingZone>(sql);
        return zones.ToList();
    }

    public async Task<RoutingZone?> GetZoneByIdAsync(int id)
    {
        const string sql = """
            SELECT id AS Id, zone_name AS ZoneName, is_default AS IsDefault
            FROM pacs.routing_zones
            WHERE id = @Id
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<RoutingZone>(sql, new { Id = id });
    }

    public async Task<RoutingZone> CreateZoneAsync(string zoneName, bool isDefault)
    {
        // If setting as default, clear other defaults first
        await using var connection = await CreateConnectionAsync();

        if (isDefault)
        {
            await connection.ExecuteAsync(
                "UPDATE pacs.routing_zones SET is_default = false WHERE is_default = true");
        }

        const string sql = """
            INSERT INTO pacs.routing_zones (zone_name, is_default)
            VALUES (@ZoneName, @IsDefault)
            RETURNING id AS Id, zone_name AS ZoneName, is_default AS IsDefault
            """;

        return await connection.QuerySingleAsync<RoutingZone>(sql, new
        {
            ZoneName = zoneName,
            IsDefault = isDefault
        });
    }

    public async Task<RoutingZone?> UpdateZoneAsync(int id, string zoneName, bool isDefault)
    {
        await using var connection = await CreateConnectionAsync();

        if (isDefault)
        {
            await connection.ExecuteAsync(
                "UPDATE pacs.routing_zones SET is_default = false WHERE is_default = true AND id != @Id",
                new { Id = id });
        }

        const string sql = """
            UPDATE pacs.routing_zones
            SET zone_name = @ZoneName, is_default = @IsDefault
            WHERE id = @Id
            """;

        var rows = await connection.ExecuteAsync(sql, new
        {
            Id = id,
            ZoneName = zoneName,
            IsDefault = isDefault
        });

        return rows > 0 ? await GetZoneByIdAsync(id) : null;
    }

    public async Task<(bool Deleted, bool HasReferences)> DeleteZoneAsync(int id)
    {
        const string checkSql = """
            SELECT EXISTS(
                SELECT 1 FROM pacs.destinations WHERE routing_zone = @Id
            ) AS has_refs
            """;

        const string deleteSql = """
            DELETE FROM pacs.routing_zones WHERE id = @Id
            """;

        await using var connection = await CreateConnectionAsync();

        var hasRefs = await connection.ExecuteScalarAsync<bool>(checkSql, new { Id = id });
        if (hasRefs)
            return (false, true);

        var rows = await connection.ExecuteAsync(deleteSql, new { Id = id });
        return (rows > 0, false);
    }
}
