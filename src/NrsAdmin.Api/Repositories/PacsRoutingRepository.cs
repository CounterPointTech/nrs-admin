using System.Text;
using Dapper;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;

namespace NrsAdmin.Api.Repositories;

public class PacsRoutingRepository : BaseRepository
{
    public PacsRoutingRepository(IOptionsMonitor<DatabaseSettings> settings) : base(settings) { }

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

    // ==================== Route Queue (Pending) ====================

    private const string QueueJoins = """
        LEFT JOIN pacs.datasets ds ON rq.dataset = ds.id
        LEFT JOIN pacs.series se ON ds.series = se.id
        LEFT JOIN pacs.studies st ON se.study = st.id
        LEFT JOIN pacs.patients pt ON st.patient = pt.id
        LEFT JOIN pacs.destinations d ON rq.destination_id = d.destination_id
        """;

    private const string QueueSelectFields = """
        rq.id AS Id, rq.destination_id AS DestinationId, rq.dataset AS Dataset,
        rq.time_queued AS TimeQueued, rq.priority AS Priority, rq.status AS Status,
        rq.next_try_time AS NextTryTime, rq.remaining_tries AS RemainingTries,
        rq.overwrite_existing AS OverwriteExisting,
        d.name AS DestinationName,
        st.study_uid AS StudyUid,
        COALESCE(pt.last_name || ', ' || pt.first_name, '') AS PatientName,
        pt.patient_id AS PatientId,
        se.modality::text AS Modality,
        se.description::text AS SeriesDescription
        """;

    private static readonly Dictionary<string, string> QueueSortColumns = new(StringComparer.OrdinalIgnoreCase)
    {
        ["TimeQueued"] = "rq.time_queued",
        ["Priority"] = "rq.priority",
        ["DestinationName"] = "d.name",
        ["PatientName"] = "pt.last_name",
        ["Status"] = "rq.status",
        ["NextTryTime"] = "rq.next_try_time",
        ["RemainingTries"] = "rq.remaining_tries"
    };

    public async Task<PagedResponse<RouteQueueItem>> GetQueueAsync(RouteQueueSearchRequest request)
    {
        var where = new StringBuilder("WHERE 1=1");
        var parameters = new DynamicParameters();

        if (request.DestinationId.HasValue)
        {
            where.Append(" AND rq.destination_id = @DestinationId");
            parameters.Add("DestinationId", request.DestinationId.Value);
        }
        if (request.Status.HasValue)
        {
            where.Append(" AND rq.status = @Status");
            parameters.Add("Status", request.Status.Value);
        }
        if (request.Priority.HasValue)
        {
            where.Append(" AND rq.priority = @Priority");
            parameters.Add("Priority", request.Priority.Value);
        }
        if (!string.IsNullOrWhiteSpace(request.PatientName))
        {
            where.Append(" AND (pt.last_name ILIKE @PatientName OR pt.first_name ILIKE @PatientName)");
            parameters.Add("PatientName", $"%{request.PatientName}%");
        }
        if (!string.IsNullOrWhiteSpace(request.StudyUid))
        {
            where.Append(" AND st.study_uid = @StudyUid");
            parameters.Add("StudyUid", request.StudyUid);
        }

        var sortCol = QueueSortColumns.GetValueOrDefault(request.SortBy, "rq.time_queued");
        var sortDir = request.SortDesc ? "DESC" : "ASC";

        var countSql = $"SELECT COUNT(*) FROM pacs.route_queue rq {QueueJoins} {where}";
        var dataSql = $"""
            SELECT {QueueSelectFields}
            FROM pacs.route_queue rq
            {QueueJoins}
            {where}
            ORDER BY {sortCol} {sortDir}
            OFFSET @Offset LIMIT @Limit
            """;

        parameters.Add("Offset", (request.Page - 1) * request.PageSize);
        parameters.Add("Limit", request.PageSize);

        await using var connection = await CreateConnectionAsync();
        var totalCount = await connection.ExecuteScalarAsync<int>(countSql, parameters);
        var items = await connection.QueryAsync<RouteQueueItem>(dataSql, parameters);

        return new PagedResponse<RouteQueueItem>
        {
            Items = items.ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }

    public async Task<bool> DeleteQueueItemAsync(int id)
    {
        await using var connection = await CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(
            "SELECT pacs.route_queue_delete(@Id)", new { Id = id });
        // The stored function returns void, so check if the item existed
        var exists = await connection.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM pacs.route_queue WHERE id = @Id)", new { Id = id });
        return !exists;
    }

    public async Task<int> DeleteQueueItemsByDestinationAsync(int destinationId)
    {
        await using var connection = await CreateConnectionAsync();
        return await connection.ExecuteAsync(
            "DELETE FROM pacs.route_queue WHERE destination_id = @DestinationId",
            new { DestinationId = destinationId });
    }

    // ==================== Route Errors ====================

    private const string ErrorJoins = """
        LEFT JOIN pacs.datasets ds ON re.dataset = ds.id
        LEFT JOIN pacs.series se ON ds.series = se.id
        LEFT JOIN pacs.studies st ON se.study = st.id
        LEFT JOIN pacs.patients pt ON st.patient = pt.id
        LEFT JOIN pacs.destinations d ON re.destination_id = d.destination_id
        """;

    private const string ErrorSelectFields = """
        re.id AS Id, re.destination_id AS DestinationId, re.dataset AS Dataset,
        re.time_queued AS TimeQueued, re.priority AS Priority,
        re.error::text AS Error, re.last_try_time AS LastTryTime,
        re.overwrite_existing AS OverwriteExisting,
        d.name AS DestinationName,
        st.study_uid AS StudyUid,
        COALESCE(pt.last_name || ', ' || pt.first_name, '') AS PatientName,
        pt.patient_id AS PatientId,
        se.modality::text AS Modality,
        se.description::text AS SeriesDescription
        """;

    private static readonly Dictionary<string, string> ErrorSortColumns = new(StringComparer.OrdinalIgnoreCase)
    {
        ["LastTryTime"] = "re.last_try_time",
        ["TimeQueued"] = "re.time_queued",
        ["Priority"] = "re.priority",
        ["DestinationName"] = "d.name",
        ["PatientName"] = "pt.last_name",
        ["Error"] = "re.error"
    };

    public async Task<PagedResponse<RouteError>> GetErrorsAsync(RouteQueueSearchRequest request)
    {
        var where = new StringBuilder("WHERE 1=1");
        var parameters = new DynamicParameters();

        if (request.DestinationId.HasValue)
        {
            where.Append(" AND re.destination_id = @DestinationId");
            parameters.Add("DestinationId", request.DestinationId.Value);
        }
        if (request.Priority.HasValue)
        {
            where.Append(" AND re.priority = @Priority");
            parameters.Add("Priority", request.Priority.Value);
        }
        if (!string.IsNullOrWhiteSpace(request.PatientName))
        {
            where.Append(" AND (pt.last_name ILIKE @PatientName OR pt.first_name ILIKE @PatientName)");
            parameters.Add("PatientName", $"%{request.PatientName}%");
        }
        if (!string.IsNullOrWhiteSpace(request.StudyUid))
        {
            where.Append(" AND st.study_uid = @StudyUid");
            parameters.Add("StudyUid", request.StudyUid);
        }

        var sortCol = ErrorSortColumns.GetValueOrDefault(request.SortBy, "re.last_try_time");
        var sortDir = request.SortDesc ? "DESC" : "ASC";

        var countSql = $"SELECT COUNT(*) FROM pacs.route_errors re {ErrorJoins} {where}";
        var dataSql = $"""
            SELECT {ErrorSelectFields}
            FROM pacs.route_errors re
            {ErrorJoins}
            {where}
            ORDER BY {sortCol} {sortDir}
            OFFSET @Offset LIMIT @Limit
            """;

        parameters.Add("Offset", (request.Page - 1) * request.PageSize);
        parameters.Add("Limit", request.PageSize);

        await using var connection = await CreateConnectionAsync();
        var totalCount = await connection.ExecuteScalarAsync<int>(countSql, parameters);
        var items = await connection.QueryAsync<RouteError>(dataSql, parameters);

        return new PagedResponse<RouteError>
        {
            Items = items.ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }

    public async Task<bool> RetryErrorAsync(int id)
    {
        const string selectSql = """
            SELECT id, destination_id, time_queued, priority, dataset, overwrite_existing
            FROM pacs.route_errors WHERE id = @Id
            """;

        const string insertSql = """
            INSERT INTO pacs.route_queue (destination_id, time_queued, priority, status, dataset,
                                          next_try_time, remaining_tries, overwrite_existing)
            VALUES (@DestinationId, @TimeQueued, @Priority, 0, @Dataset,
                    NOW(), @RemainingTries, @OverwriteExisting)
            """;

        const string deleteSql = "DELETE FROM pacs.route_errors WHERE id = @Id";

        await using var connection = await CreateConnectionAsync();

        var error = await connection.QuerySingleOrDefaultAsync(selectSql, new { Id = id });
        if (error is null)
            return false;

        // Get default tries from the destination
        var numTries = await connection.ExecuteScalarAsync<int?>(
            "SELECT num_tries FROM pacs.destinations WHERE destination_id = @DestId",
            new { DestId = (int)error.destination_id }) ?? 3;

        await connection.ExecuteAsync(insertSql, new
        {
            DestinationId = (int)error.destination_id,
            TimeQueued = (DateTime)error.time_queued,
            Priority = (short)error.priority,
            Dataset = (long)error.dataset,
            RemainingTries = numTries,
            OverwriteExisting = (bool)error.overwrite_existing
        });

        await connection.ExecuteAsync(deleteSql, new { Id = id });
        return true;
    }

    public async Task<int> RetryAllErrorsForDestinationAsync(int destinationId)
    {
        // Get default tries from the destination
        await using var connection = await CreateConnectionAsync();

        var numTries = await connection.ExecuteScalarAsync<int?>(
            "SELECT num_tries FROM pacs.destinations WHERE destination_id = @DestId",
            new { DestId = destinationId }) ?? 3;

        const string insertSql = """
            INSERT INTO pacs.route_queue (destination_id, time_queued, priority, status, dataset,
                                          next_try_time, remaining_tries, overwrite_existing)
            SELECT destination_id, time_queued, priority, 0, dataset,
                   NOW(), @RemainingTries, overwrite_existing
            FROM pacs.route_errors
            WHERE destination_id = @DestinationId
            """;

        var inserted = await connection.ExecuteAsync(insertSql, new
        {
            DestinationId = destinationId,
            RemainingTries = numTries
        });

        await connection.ExecuteAsync(
            "DELETE FROM pacs.route_errors WHERE destination_id = @DestinationId",
            new { DestinationId = destinationId });

        return inserted;
    }

    public async Task<int> ClearErrorsForDestinationAsync(int destinationId)
    {
        await using var connection = await CreateConnectionAsync();
        return await connection.ExecuteAsync(
            "DELETE FROM pacs.route_errors WHERE destination_id = @DestinationId",
            new { DestinationId = destinationId });
    }

    // ==================== Route History (Completed) ====================

    private const string HistoryJoins = """
        LEFT JOIN pacs.datasets ds ON rh.dataset = ds.id
        LEFT JOIN pacs.series se ON ds.series = se.id
        LEFT JOIN pacs.studies st ON se.study = st.id
        LEFT JOIN pacs.patients pt ON st.patient = pt.id
        LEFT JOIN pacs.destinations d ON rh.destination_id = d.destination_id
        """;

    private const string HistorySelectFields = """
        rh.id AS Id, rh.destination_id AS DestinationId, rh.dataset AS Dataset,
        rh.time_sent AS TimeSent, rh.overwrite_existing AS OverwriteExisting,
        d.name AS DestinationName,
        st.study_uid AS StudyUid,
        COALESCE(pt.last_name || ', ' || pt.first_name, '') AS PatientName,
        pt.patient_id AS PatientId,
        se.modality::text AS Modality,
        se.description::text AS SeriesDescription
        """;

    private static readonly Dictionary<string, string> HistorySortColumns = new(StringComparer.OrdinalIgnoreCase)
    {
        ["TimeSent"] = "rh.time_sent",
        ["DestinationName"] = "d.name",
        ["PatientName"] = "pt.last_name",
        ["Modality"] = "se.modality"
    };

    public async Task<PagedResponse<RouteHistoryItem>> GetHistoryAsync(RouteHistorySearchRequest request)
    {
        var where = new StringBuilder("WHERE 1=1");
        var parameters = new DynamicParameters();

        if (request.DestinationId.HasValue)
        {
            where.Append(" AND rh.destination_id = @DestinationId");
            parameters.Add("DestinationId", request.DestinationId.Value);
        }
        if (!string.IsNullOrWhiteSpace(request.PatientName))
        {
            where.Append(" AND (pt.last_name ILIKE @PatientName OR pt.first_name ILIKE @PatientName)");
            parameters.Add("PatientName", $"%{request.PatientName}%");
        }
        if (!string.IsNullOrWhiteSpace(request.StudyUid))
        {
            where.Append(" AND st.study_uid = @StudyUid");
            parameters.Add("StudyUid", request.StudyUid);
        }
        if (request.From.HasValue)
        {
            where.Append(" AND rh.time_sent >= @From");
            parameters.Add("From", request.From.Value);
        }
        if (request.To.HasValue)
        {
            where.Append(" AND rh.time_sent <= @To");
            parameters.Add("To", request.To.Value);
        }

        var sortCol = HistorySortColumns.GetValueOrDefault(request.SortBy, "rh.time_sent");
        var sortDir = request.SortDesc ? "DESC" : "ASC";

        var countSql = $"SELECT COUNT(*) FROM pacs.route_history rh {HistoryJoins} {where}";
        var dataSql = $"""
            SELECT {HistorySelectFields}
            FROM pacs.route_history rh
            {HistoryJoins}
            {where}
            ORDER BY {sortCol} {sortDir}
            OFFSET @Offset LIMIT @Limit
            """;

        parameters.Add("Offset", (request.Page - 1) * request.PageSize);
        parameters.Add("Limit", request.PageSize);

        await using var connection = await CreateConnectionAsync();
        var totalCount = await connection.ExecuteScalarAsync<int>(countSql, parameters);
        var items = await connection.QueryAsync<RouteHistoryItem>(dataSql, parameters);

        return new PagedResponse<RouteHistoryItem>
        {
            Items = items.ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }

    // ==================== Queue Summary ====================

    public async Task<List<QueueSummary>> GetQueueSummaryAsync()
    {
        const string sql = """
            SELECT
                d.destination_id AS DestinationId,
                d.name AS DestinationName,
                COALESCE(q.cnt, 0) AS PendingCount,
                COALESCE(e.cnt, 0) AS ErrorCount,
                COALESCE(h.cnt, 0) AS CompletedToday
            FROM pacs.destinations d
            LEFT JOIN (
                SELECT destination_id, COUNT(*) AS cnt
                FROM pacs.route_queue
                GROUP BY destination_id
            ) q ON d.destination_id = q.destination_id
            LEFT JOIN (
                SELECT destination_id, COUNT(*) AS cnt
                FROM pacs.route_errors
                GROUP BY destination_id
            ) e ON d.destination_id = e.destination_id
            LEFT JOIN (
                SELECT destination_id, COUNT(*) AS cnt
                FROM pacs.route_history
                WHERE time_sent >= CURRENT_DATE
                GROUP BY destination_id
            ) h ON d.destination_id = h.destination_id
            WHERE COALESCE(q.cnt, 0) > 0
               OR COALESCE(e.cnt, 0) > 0
               OR COALESCE(h.cnt, 0) > 0
            ORDER BY d.name
            """;

        await using var connection = await CreateConnectionAsync();
        var summary = await connection.QueryAsync<QueueSummary>(sql);
        return summary.ToList();
    }

    public async Task<(int Pending, int Errors, int CompletedToday)> GetQueueTotalsAsync()
    {
        const string sql = """
            SELECT
                (SELECT COUNT(*) FROM pacs.route_queue) AS Pending,
                (SELECT COUNT(*) FROM pacs.route_errors) AS Errors,
                (SELECT COUNT(*) FROM pacs.route_history WHERE time_sent >= CURRENT_DATE) AS CompletedToday
            """;

        await using var connection = await CreateConnectionAsync();
        var result = await connection.QuerySingleAsync(sql);
        return ((int)result.pending, (int)result.errors, (int)result.completedtoday);
    }

    // ==================== Queue Operations ====================

    public async Task QueueStudyAsync(string studyUid, int destinationId, short priority, bool overwriteExisting)
    {
        // Get destination's default num_tries
        await using var connection = await CreateConnectionAsync();

        var numTries = await connection.ExecuteScalarAsync<int?>(
            "SELECT num_tries FROM pacs.destinations WHERE destination_id = @DestId",
            new { DestId = destinationId }) ?? 3;

        await connection.ExecuteAsync(
            "SELECT pacs.route_queue_insert_study(@TimeQueued, @Priority, @Status, @StudyUid, @NextTryTime, @RemainingTries, @DestinationId, @OverwriteExisting)",
            new
            {
                TimeQueued = DateTime.Now,
                Priority = priority,
                Status = (short)0,
                StudyUid = studyUid,
                NextTryTime = DateTime.Now,
                RemainingTries = numTries,
                DestinationId = destinationId,
                OverwriteExisting = overwriteExisting
            });
    }

    public async Task QueueSeriesAsync(string seriesUid, int destinationId, short priority, bool overwriteExisting)
    {
        await using var connection = await CreateConnectionAsync();

        var numTries = await connection.ExecuteScalarAsync<int?>(
            "SELECT num_tries FROM pacs.destinations WHERE destination_id = @DestId",
            new { DestId = destinationId }) ?? 3;

        await connection.ExecuteAsync(
            "SELECT pacs.route_queue_insert_series(@TimeQueued, @Priority, @Status, @SeriesUid, @NextTryTime, @RemainingTries, @DestinationId, @OverwriteExisting)",
            new
            {
                TimeQueued = DateTime.Now,
                Priority = priority,
                Status = (short)0,
                SeriesUid = seriesUid,
                NextTryTime = DateTime.Now,
                RemainingTries = numTries,
                DestinationId = destinationId,
                OverwriteExisting = overwriteExisting
            });
    }
}
