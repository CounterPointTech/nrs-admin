using Dapper;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;

namespace NrsAdmin.Api.Repositories;

public class Hl7Repository : BaseRepository
{
    private const int DefaultProductId = 1;

    public Hl7Repository(IOptions<DatabaseSettings> settings) : base(settings) { }

    // ===================== HL7 Locations =====================

    public async Task<List<Hl7Location>> GetLocationsAsync()
    {
        const string sql = """
            SELECT location_id AS LocationId, address AS Address, port AS Port,
                   enabled AS Enabled, culture_code AS CultureCode, product_id AS ProductId
            FROM shared.hl7_locations
            WHERE product_id = @ProductId
            ORDER BY location_id ASC
            """;

        await using var connection = await CreateConnectionAsync();
        var results = await connection.QueryAsync<Hl7Location>(sql, new { ProductId = DefaultProductId });
        return results.ToList();
    }

    public async Task<Hl7Location?> GetLocationByIdAsync(int id)
    {
        const string sql = """
            SELECT location_id AS LocationId, address AS Address, port AS Port,
                   enabled AS Enabled, culture_code AS CultureCode, product_id AS ProductId
            FROM shared.hl7_locations
            WHERE location_id = @Id AND product_id = @ProductId
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<Hl7Location>(sql, new { Id = id, ProductId = DefaultProductId });
    }

    public async Task<Hl7Location> CreateLocationAsync(string address, int? port, bool enabled, string? cultureCode)
    {
        const string sql = """
            INSERT INTO shared.hl7_locations (address, port, enabled, culture_code, product_id)
            VALUES (@Address, @Port, @Enabled, @CultureCode, @ProductId)
            RETURNING location_id AS LocationId, address AS Address, port AS Port,
                      enabled AS Enabled, culture_code AS CultureCode, product_id AS ProductId
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleAsync<Hl7Location>(sql, new
        {
            Address = address,
            Port = port,
            Enabled = enabled,
            CultureCode = cultureCode,
            ProductId = DefaultProductId
        });
    }

    public async Task<Hl7Location?> UpdateLocationAsync(int id, string address, int? port, bool enabled, string? cultureCode)
    {
        const string sql = """
            UPDATE shared.hl7_locations
            SET address = @Address, port = @Port, enabled = @Enabled, culture_code = @CultureCode
            WHERE location_id = @Id AND product_id = @ProductId
            RETURNING location_id AS LocationId, address AS Address, port AS Port,
                      enabled AS Enabled, culture_code AS CultureCode, product_id AS ProductId
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<Hl7Location>(sql, new
        {
            Id = id,
            Address = address,
            Port = port,
            Enabled = enabled,
            CultureCode = cultureCode,
            ProductId = DefaultProductId
        });
    }

    public async Task<bool> DeleteLocationAsync(int id)
    {
        const string sql = "DELETE FROM shared.hl7_locations WHERE location_id = @Id AND product_id = @ProductId";

        await using var connection = await CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(sql, new { Id = id, ProductId = DefaultProductId });
        return rows > 0;
    }

    // ===================== HL7 Location Options =====================

    public async Task<List<Hl7LocationOption>> GetLocationOptionsAsync(int locationId)
    {
        const string sql = """
            SELECT location_id AS LocationId, name AS Name, value AS Value, product_id AS ProductId
            FROM shared.hl7_location_options
            WHERE location_id = @LocationId AND product_id = @ProductId
            ORDER BY name ASC
            """;

        await using var connection = await CreateConnectionAsync();
        var results = await connection.QueryAsync<Hl7LocationOption>(sql, new { LocationId = locationId, ProductId = DefaultProductId });
        return results.ToList();
    }

    public async Task<Hl7LocationOption> UpsertLocationOptionAsync(int locationId, string name, string? value)
    {
        const string sql = """
            INSERT INTO shared.hl7_location_options (location_id, name, value, product_id)
            VALUES (@LocationId, @Name, @Value, @ProductId)
            ON CONFLICT (location_id, name, product_id) DO UPDATE SET value = @Value
            RETURNING location_id AS LocationId, name AS Name, value AS Value, product_id AS ProductId
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleAsync<Hl7LocationOption>(sql, new
        {
            LocationId = locationId,
            Name = name,
            Value = value,
            ProductId = DefaultProductId
        });
    }

    public async Task<bool> DeleteLocationOptionAsync(int locationId, string name)
    {
        const string sql = """
            DELETE FROM shared.hl7_location_options
            WHERE location_id = @LocationId AND name = @Name AND product_id = @ProductId
            """;

        await using var connection = await CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(sql, new { LocationId = locationId, Name = name, ProductId = DefaultProductId });
        return rows > 0;
    }

    // ===================== HL7 Message Destinations =====================

    public async Task<List<Hl7MessageDestination>> GetDestinationsAsync()
    {
        const string sql = """
            SELECT destination_id AS DestinationId, address AS Address, port AS Port,
                   application AS Application, facility AS Facility,
                   message_type AS MessageType, event_type AS EventType,
                   enabled AS Enabled, synchronous AS Synchronous,
                   culture_code AS CultureCode, product_id AS ProductId
            FROM shared.hl7_message_destinations
            WHERE product_id = @ProductId
            ORDER BY destination_id ASC
            """;

        await using var connection = await CreateConnectionAsync();
        var results = await connection.QueryAsync<Hl7MessageDestination>(sql, new { ProductId = DefaultProductId });
        return results.ToList();
    }

    public async Task<Hl7MessageDestination?> GetDestinationByIdAsync(int id)
    {
        const string sql = """
            SELECT destination_id AS DestinationId, address AS Address, port AS Port,
                   application AS Application, facility AS Facility,
                   message_type AS MessageType, event_type AS EventType,
                   enabled AS Enabled, synchronous AS Synchronous,
                   culture_code AS CultureCode, product_id AS ProductId
            FROM shared.hl7_message_destinations
            WHERE destination_id = @Id AND product_id = @ProductId
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<Hl7MessageDestination>(sql, new { Id = id, ProductId = DefaultProductId });
    }

    public async Task<Hl7MessageDestination> CreateDestinationAsync(string address, int port, string application,
        string facility, string messageType, string? eventType, bool enabled, bool? synchronous, string? cultureCode)
    {
        const string sql = """
            INSERT INTO shared.hl7_message_destinations
                (address, port, application, facility, message_type, event_type, enabled, synchronous, culture_code, product_id)
            VALUES (@Address, @Port, @Application, @Facility, @MessageType, @EventType, @Enabled, @Synchronous, @CultureCode, @ProductId)
            RETURNING destination_id AS DestinationId, address AS Address, port AS Port,
                      application AS Application, facility AS Facility,
                      message_type AS MessageType, event_type AS EventType,
                      enabled AS Enabled, synchronous AS Synchronous,
                      culture_code AS CultureCode, product_id AS ProductId
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleAsync<Hl7MessageDestination>(sql, new
        {
            Address = address,
            Port = port,
            Application = application,
            Facility = facility,
            MessageType = messageType,
            EventType = eventType,
            Enabled = enabled,
            Synchronous = synchronous,
            CultureCode = cultureCode,
            ProductId = DefaultProductId
        });
    }

    public async Task<Hl7MessageDestination?> UpdateDestinationAsync(int id, string address, int port, string application,
        string facility, string messageType, string? eventType, bool enabled, bool? synchronous, string? cultureCode)
    {
        const string sql = """
            UPDATE shared.hl7_message_destinations
            SET address = @Address, port = @Port, application = @Application, facility = @Facility,
                message_type = @MessageType, event_type = @EventType, enabled = @Enabled,
                synchronous = @Synchronous, culture_code = @CultureCode
            WHERE destination_id = @Id AND product_id = @ProductId
            RETURNING destination_id AS DestinationId, address AS Address, port AS Port,
                      application AS Application, facility AS Facility,
                      message_type AS MessageType, event_type AS EventType,
                      enabled AS Enabled, synchronous AS Synchronous,
                      culture_code AS CultureCode, product_id AS ProductId
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<Hl7MessageDestination>(sql, new
        {
            Id = id,
            Address = address,
            Port = port,
            Application = application,
            Facility = facility,
            MessageType = messageType,
            EventType = eventType,
            Enabled = enabled,
            Synchronous = synchronous,
            CultureCode = cultureCode,
            ProductId = DefaultProductId
        });
    }

    public async Task<bool> DeleteDestinationAsync(int id)
    {
        const string sql = "DELETE FROM shared.hl7_message_destinations WHERE destination_id = @Id AND product_id = @ProductId";

        await using var connection = await CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(sql, new { Id = id, ProductId = DefaultProductId });
        return rows > 0;
    }

    // ===================== HL7 Distribution Rules =====================

    public async Task<List<Hl7DistributionRule>> GetDistributionRulesAsync(int? destinationId = null)
    {
        var sql = """
            SELECT hl7_distribution_rule_id AS Hl7DistributionRuleId, destination_id AS DestinationId,
                   field AS Field, field_value AS FieldValue, message_type AS MessageType,
                   product_id AS ProductId
            FROM shared.hl7_distribution_rules
            WHERE product_id = @ProductId
            """;

        if (destinationId.HasValue)
            sql += " AND destination_id = @DestinationId";

        sql += " ORDER BY hl7_distribution_rule_id ASC";

        await using var connection = await CreateConnectionAsync();
        var results = await connection.QueryAsync<Hl7DistributionRule>(sql, new { ProductId = DefaultProductId, DestinationId = destinationId });
        return results.ToList();
    }

    public async Task<Hl7DistributionRule> CreateDistributionRuleAsync(int destinationId, string field, string fieldValue, string? messageType)
    {
        const string sql = """
            INSERT INTO shared.hl7_distribution_rules (destination_id, field, field_value, message_type, product_id)
            VALUES (@DestinationId, @Field, @FieldValue, @MessageType, @ProductId)
            RETURNING hl7_distribution_rule_id AS Hl7DistributionRuleId, destination_id AS DestinationId,
                      field AS Field, field_value AS FieldValue, message_type AS MessageType,
                      product_id AS ProductId
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleAsync<Hl7DistributionRule>(sql, new
        {
            DestinationId = destinationId,
            Field = field,
            FieldValue = fieldValue,
            MessageType = messageType,
            ProductId = DefaultProductId
        });
    }

    public async Task<Hl7DistributionRule?> UpdateDistributionRuleAsync(int id, int destinationId, string field, string fieldValue, string? messageType)
    {
        const string sql = """
            UPDATE shared.hl7_distribution_rules
            SET destination_id = @DestinationId, field = @Field, field_value = @FieldValue, message_type = @MessageType
            WHERE hl7_distribution_rule_id = @Id AND product_id = @ProductId
            RETURNING hl7_distribution_rule_id AS Hl7DistributionRuleId, destination_id AS DestinationId,
                      field AS Field, field_value AS FieldValue, message_type AS MessageType,
                      product_id AS ProductId
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<Hl7DistributionRule>(sql, new
        {
            Id = id,
            DestinationId = destinationId,
            Field = field,
            FieldValue = fieldValue,
            MessageType = messageType,
            ProductId = DefaultProductId
        });
    }

    public async Task<bool> DeleteDistributionRuleAsync(int id)
    {
        const string sql = "DELETE FROM shared.hl7_distribution_rules WHERE hl7_distribution_rule_id = @Id AND product_id = @ProductId";

        await using var connection = await CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(sql, new { Id = id, ProductId = DefaultProductId });
        return rows > 0;
    }

    // ===================== HL7 Field Mapping =====================

    public async Task<List<Hl7FieldMapping>> GetFieldMappingsAsync(string? messageType = null, string? locationId = null)
    {
        var sql = """
            SELECT mapping_id AS MappingId, message_type AS MessageType, event_type AS EventType,
                   parameter_name AS ParameterName, segment_name AS SegmentName,
                   field AS Field, component AS Component, sub_component AS SubComponent,
                   location_id AS LocationId, inbound_transform AS InboundTransform,
                   outbound_transform AS OutboundTransform,
                   inbound_transform_parameter AS InboundTransformParameter,
                   outbound_transform_parameter AS OutboundTransformParameter,
                   product_id AS ProductId
            FROM shared.hl7_field_mapping
            WHERE product_id = @ProductId
            """;

        if (!string.IsNullOrEmpty(messageType))
            sql += " AND message_type = @MessageType";

        if (!string.IsNullOrEmpty(locationId))
            sql += " AND location_id = @LocationId";

        sql += " ORDER BY message_type, segment_name, field, component, sub_component";

        await using var connection = await CreateConnectionAsync();
        var results = await connection.QueryAsync<Hl7FieldMapping>(sql, new
        {
            ProductId = DefaultProductId,
            MessageType = messageType,
            LocationId = locationId
        });
        return results.ToList();
    }

    public async Task<Hl7FieldMapping?> GetFieldMappingByIdAsync(long id)
    {
        const string sql = """
            SELECT mapping_id AS MappingId, message_type AS MessageType, event_type AS EventType,
                   parameter_name AS ParameterName, segment_name AS SegmentName,
                   field AS Field, component AS Component, sub_component AS SubComponent,
                   location_id AS LocationId, inbound_transform AS InboundTransform,
                   outbound_transform AS OutboundTransform,
                   inbound_transform_parameter AS InboundTransformParameter,
                   outbound_transform_parameter AS OutboundTransformParameter,
                   product_id AS ProductId
            FROM shared.hl7_field_mapping
            WHERE mapping_id = @Id AND product_id = @ProductId
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<Hl7FieldMapping>(sql, new { Id = id, ProductId = DefaultProductId });
    }

    public async Task<List<string>> GetFieldMappingMessageTypesAsync()
    {
        const string sql = """
            SELECT DISTINCT message_type
            FROM shared.hl7_field_mapping
            WHERE product_id = @ProductId
            ORDER BY message_type
            """;

        await using var connection = await CreateConnectionAsync();
        var results = await connection.QueryAsync<string>(sql, new { ProductId = DefaultProductId });
        return results.ToList();
    }

    public async Task<List<string?>> GetFieldMappingLocationsAsync()
    {
        const string sql = """
            SELECT DISTINCT location_id
            FROM shared.hl7_field_mapping
            WHERE product_id = @ProductId
            ORDER BY location_id
            """;

        await using var connection = await CreateConnectionAsync();
        var results = await connection.QueryAsync<string?>(sql, new { ProductId = DefaultProductId });
        return results.ToList();
    }

    public async Task<Hl7FieldMapping> CreateFieldMappingAsync(string messageType, string? eventType,
        string parameterName, string segmentName, int? field, int? component, int? subComponent,
        string? locationId, string? inboundTransform, string? outboundTransform,
        string? inboundTransformParameter, string? outboundTransformParameter)
    {
        const string sql = """
            INSERT INTO shared.hl7_field_mapping
                (message_type, event_type, parameter_name, segment_name, field, component, sub_component,
                 location_id, inbound_transform, outbound_transform,
                 inbound_transform_parameter, outbound_transform_parameter, product_id)
            VALUES (@MessageType, @EventType, @ParameterName, @SegmentName, @Field, @Component, @SubComponent,
                    @LocationId, @InboundTransform, @OutboundTransform,
                    @InboundTransformParameter, @OutboundTransformParameter, @ProductId)
            RETURNING mapping_id AS MappingId, message_type AS MessageType, event_type AS EventType,
                      parameter_name AS ParameterName, segment_name AS SegmentName,
                      field AS Field, component AS Component, sub_component AS SubComponent,
                      location_id AS LocationId, inbound_transform AS InboundTransform,
                      outbound_transform AS OutboundTransform,
                      inbound_transform_parameter AS InboundTransformParameter,
                      outbound_transform_parameter AS OutboundTransformParameter,
                      product_id AS ProductId
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleAsync<Hl7FieldMapping>(sql, new
        {
            MessageType = messageType,
            EventType = eventType,
            ParameterName = parameterName,
            SegmentName = segmentName,
            Field = field,
            Component = component,
            SubComponent = subComponent,
            LocationId = locationId,
            InboundTransform = inboundTransform,
            OutboundTransform = outboundTransform,
            InboundTransformParameter = inboundTransformParameter,
            OutboundTransformParameter = outboundTransformParameter,
            ProductId = DefaultProductId
        });
    }

    public async Task<Hl7FieldMapping?> UpdateFieldMappingAsync(long id, string messageType, string? eventType,
        string parameterName, string segmentName, int? field, int? component, int? subComponent,
        string? locationId, string? inboundTransform, string? outboundTransform,
        string? inboundTransformParameter, string? outboundTransformParameter)
    {
        const string sql = """
            UPDATE shared.hl7_field_mapping
            SET message_type = @MessageType, event_type = @EventType, parameter_name = @ParameterName,
                segment_name = @SegmentName, field = @Field, component = @Component, sub_component = @SubComponent,
                location_id = @LocationId, inbound_transform = @InboundTransform,
                outbound_transform = @OutboundTransform,
                inbound_transform_parameter = @InboundTransformParameter,
                outbound_transform_parameter = @OutboundTransformParameter
            WHERE mapping_id = @Id AND product_id = @ProductId
            RETURNING mapping_id AS MappingId, message_type AS MessageType, event_type AS EventType,
                      parameter_name AS ParameterName, segment_name AS SegmentName,
                      field AS Field, component AS Component, sub_component AS SubComponent,
                      location_id AS LocationId, inbound_transform AS InboundTransform,
                      outbound_transform AS OutboundTransform,
                      inbound_transform_parameter AS InboundTransformParameter,
                      outbound_transform_parameter AS OutboundTransformParameter,
                      product_id AS ProductId
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<Hl7FieldMapping>(sql, new
        {
            Id = id,
            MessageType = messageType,
            EventType = eventType,
            ParameterName = parameterName,
            SegmentName = segmentName,
            Field = field,
            Component = component,
            SubComponent = subComponent,
            LocationId = locationId,
            InboundTransform = inboundTransform,
            OutboundTransform = outboundTransform,
            InboundTransformParameter = inboundTransformParameter,
            OutboundTransformParameter = outboundTransformParameter,
            ProductId = DefaultProductId
        });
    }

    public async Task<bool> DeleteFieldMappingAsync(long id)
    {
        const string sql = "DELETE FROM shared.hl7_field_mapping WHERE mapping_id = @Id AND product_id = @ProductId";

        await using var connection = await CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(sql, new { Id = id, ProductId = DefaultProductId });
        return rows > 0;
    }

    // ===================== HL7 Message Forwarding =====================

    public async Task<List<Hl7MessageForwarding>> GetForwardingRulesAsync()
    {
        const string sql = """
            SELECT forwarding_id AS ForwardingId, address AS Address, port AS Port,
                   message AS Message, event AS Event, external_key AS ExternalKey,
                   send_post_processing AS SendPostProcessing, product_id AS ProductId
            FROM shared.hl7_message_forwarding
            WHERE product_id = @ProductId
            ORDER BY forwarding_id ASC
            """;

        await using var connection = await CreateConnectionAsync();
        var results = await connection.QueryAsync<Hl7MessageForwarding>(sql, new { ProductId = DefaultProductId });
        return results.ToList();
    }

    public async Task<Hl7MessageForwarding?> GetForwardingByIdAsync(int id)
    {
        const string sql = """
            SELECT forwarding_id AS ForwardingId, address AS Address, port AS Port,
                   message AS Message, event AS Event, external_key AS ExternalKey,
                   send_post_processing AS SendPostProcessing, product_id AS ProductId
            FROM shared.hl7_message_forwarding
            WHERE forwarding_id = @Id AND product_id = @ProductId
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<Hl7MessageForwarding>(sql, new { Id = id, ProductId = DefaultProductId });
    }

    public async Task<Hl7MessageForwarding> CreateForwardingAsync(string address, int port, string? message,
        string? @event, string? externalKey, bool sendPostProcessing)
    {
        const string sql = """
            INSERT INTO shared.hl7_message_forwarding (address, port, message, event, external_key, send_post_processing, product_id)
            VALUES (@Address, @Port, @Message, @Event, @ExternalKey, @SendPostProcessing, @ProductId)
            RETURNING forwarding_id AS ForwardingId, address AS Address, port AS Port,
                      message AS Message, event AS Event, external_key AS ExternalKey,
                      send_post_processing AS SendPostProcessing, product_id AS ProductId
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleAsync<Hl7MessageForwarding>(sql, new
        {
            Address = address,
            Port = port,
            Message = message,
            Event = @event,
            ExternalKey = externalKey,
            SendPostProcessing = sendPostProcessing,
            ProductId = DefaultProductId
        });
    }

    public async Task<Hl7MessageForwarding?> UpdateForwardingAsync(int id, string address, int port, string? message,
        string? @event, string? externalKey, bool sendPostProcessing)
    {
        const string sql = """
            UPDATE shared.hl7_message_forwarding
            SET address = @Address, port = @Port, message = @Message, event = @Event,
                external_key = @ExternalKey, send_post_processing = @SendPostProcessing
            WHERE forwarding_id = @Id AND product_id = @ProductId
            RETURNING forwarding_id AS ForwardingId, address AS Address, port AS Port,
                      message AS Message, event AS Event, external_key AS ExternalKey,
                      send_post_processing AS SendPostProcessing, product_id AS ProductId
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<Hl7MessageForwarding>(sql, new
        {
            Id = id,
            Address = address,
            Port = port,
            Message = message,
            Event = @event,
            ExternalKey = externalKey,
            SendPostProcessing = sendPostProcessing,
            ProductId = DefaultProductId
        });
    }

    public async Task<bool> DeleteForwardingAsync(int id)
    {
        const string sql = "DELETE FROM shared.hl7_message_forwarding WHERE forwarding_id = @Id AND product_id = @ProductId";

        await using var connection = await CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(sql, new { Id = id, ProductId = DefaultProductId });
        return rows > 0;
    }
}
