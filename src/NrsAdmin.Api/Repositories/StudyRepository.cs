using System.Text;
using Dapper;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;

namespace NrsAdmin.Api.Repositories;

public class StudyRepository : BaseRepository
{
    private static readonly HashSet<string> AllowedSortColumns = new(StringComparer.OrdinalIgnoreCase)
    {
        "studyDate", "patientName", "patientId", "accession", "modality", "status", "facilityName"
    };

    public StudyRepository(IOptions<DatabaseSettings> settings) : base(settings) { }

    public async Task<PagedResponse<StudySearchResult>> SearchAsync(StudySearchRequest request)
    {
        var where = new StringBuilder();
        var parameters = new DynamicParameters();

        // Patient name filter (searches first + last name)
        if (!string.IsNullOrWhiteSpace(request.PatientName))
        {
            where.Append(" AND (p.last_name ILIKE @PatientName OR p.first_name ILIKE @PatientName)");
            parameters.Add("PatientName", $"%{request.PatientName}%");
        }

        // Patient ID (MRN) — exact or prefix match
        if (!string.IsNullOrWhiteSpace(request.PatientId))
        {
            where.Append(" AND p.patient_id ILIKE @PatientId");
            parameters.Add("PatientId", $"{request.PatientId}%");
        }

        // Accession number — exact or prefix match
        if (!string.IsNullOrWhiteSpace(request.Accession))
        {
            where.Append(" AND s.accession ILIKE @Accession");
            parameters.Add("Accession", $"{request.Accession}%");
        }

        // Modality — exact match (DICOM modality code)
        if (!string.IsNullOrWhiteSpace(request.Modality))
        {
            where.Append(" AND s.modality = @Modality");
            parameters.Add("Modality", request.Modality);
        }

        // Date range
        if (request.DateFrom.HasValue)
        {
            where.Append(" AND s.study_date >= @DateFrom");
            parameters.Add("DateFrom", request.DateFrom.Value.Date);
        }
        if (request.DateTo.HasValue)
        {
            where.Append(" AND s.study_date < @DateTo");
            parameters.Add("DateTo", request.DateTo.Value.Date.AddDays(1));
        }

        // Facility
        if (request.FacilityId.HasValue)
        {
            where.Append(" AND s.facility_id = @FacilityId");
            parameters.Add("FacilityId", request.FacilityId.Value);
        }

        // Status
        if (request.Status.HasValue)
        {
            where.Append(" AND s.status = @Status");
            parameters.Add("Status", request.Status.Value);
        }

        // Free text search (patient name, patient ID, accession, study UID)
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            where.Append("""
                 AND (p.last_name ILIKE @Search OR p.first_name ILIKE @Search
                      OR p.patient_id ILIKE @Search OR s.accession ILIKE @Search
                      OR s.study_uid ILIKE @Search)
                """);
            parameters.Add("Search", $"%{request.Search}%");
        }

        var whereClause = where.ToString();

        // Sort column mapping
        var orderBy = ResolveSortColumn(request.SortBy);
        var direction = request.SortDesc ? "DESC" : "ASC";

        // Count query
        var countSql = $"""
            SELECT COUNT(*)
            FROM pacs.studies s
            JOIN pacs.patients p ON s.patient = p.id
            WHERE 1=1 {whereClause}
            """;

        // Page bounds
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 200);
        var offset = (page - 1) * pageSize;
        parameters.Add("Limit", pageSize);
        parameters.Add("Offset", offset);

        // Data query
        var dataSql = $"""
            SELECT s.id AS Id, s.study_uid AS StudyUid, s.study_date AS StudyDate,
                   s.accession AS Accession, s.modality AS Modality, s.status AS Status,
                   s.study_tags AS StudyTags, s.facility_id AS FacilityId,
                   f.name AS FacilityName, s.institution AS Institution,
                   s.physician_id AS PhysicianId,
                   p.patient_id AS PatientId, p.last_name AS LastName,
                   p.first_name AS FirstName, p.gender AS Gender,
                   p.birth_time AS BirthTime,
                   (SELECT COUNT(*) FROM pacs.series sr WHERE sr.study = s.id) AS SeriesCount,
                   (SELECT COALESCE(SUM(sr.num_images), 0) FROM pacs.series sr WHERE sr.study = s.id) AS ImageCount
            FROM pacs.studies s
            JOIN pacs.patients p ON s.patient = p.id
            LEFT JOIN shared.facilities f ON s.facility_id = f.facility_id
            WHERE 1=1 {whereClause}
            ORDER BY {orderBy} {direction}, s.id DESC
            LIMIT @Limit OFFSET @Offset
            """;

        await using var connection = await CreateConnectionAsync();

        var totalCount = await connection.ExecuteScalarAsync<int>(countSql, parameters);
        var items = (await connection.QueryAsync<StudySearchResult>(dataSql, parameters)).ToList();

        return new PagedResponse<StudySearchResult>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<StudyDetail?> GetByIdAsync(long id)
    {
        const string sql = """
            SELECT s.id AS Id, s.study_uid AS StudyUid, s.study_date AS StudyDate,
                   s.accession AS Accession, s.modality AS Modality, s.status AS Status,
                   s.study_tags AS StudyTags, s.facility_id AS FacilityId,
                   f.name AS FacilityName, s.institution AS Institution,
                   s.physician_id AS PhysicianId,
                   s.radiologist_id AS RadiologistId,
                   s.is_valid AS IsValid, s.comments AS Comments,
                   s.custom_1 AS Custom1, s.custom_2 AS Custom2, s.custom_3 AS Custom3,
                   s.custom_4 AS Custom4, s.custom_5 AS Custom5, s.custom_6 AS Custom6,
                   s.anatomical_area AS AnatomicalArea, s.priority AS Priority,
                   s.modified_date AS ModifiedDate,
                   s.first_processed_date AS FirstProcessedDate,
                   s.last_image_processed_date AS LastImageProcessedDate,
                   p.id AS PatientDbId, p.patient_id AS PatientId,
                   p.last_name AS LastName, p.first_name AS FirstName,
                   p.middle_name AS MiddleName, p.gender AS Gender,
                   p.birth_time AS BirthTime,
                   (SELECT COUNT(*) FROM pacs.series sr WHERE sr.study = s.id) AS SeriesCount,
                   (SELECT COALESCE(SUM(sr.num_images), 0) FROM pacs.series sr WHERE sr.study = s.id) AS ImageCount,
                   CONCAT_WS(' ', rp.first_name, rp.last_name) AS PhysicianName,
                   CONCAT_WS(' ', rrp.first_name, rrp.last_name) AS RadiologistName
            FROM pacs.studies s
            JOIN pacs.patients p ON s.patient = p.id
            LEFT JOIN shared.facilities f ON s.facility_id = f.facility_id
            LEFT JOIN ris.physicians ph ON s.physician_id = ph.physician_id
            LEFT JOIN ris.people rp ON ph.person_id = rp.person_id
            LEFT JOIN ris.physicians rad ON s.radiologist_id = rad.physician_id
            LEFT JOIN ris.people rrp ON rad.person_id = rrp.person_id
            WHERE s.id = @Id
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<StudyDetail>(sql, new { Id = id });
    }

    public async Task<List<Series>> GetSeriesAsync(long studyId)
    {
        const string sql = """
            SELECT id AS Id, series_uid AS SeriesUid, series_id AS SeriesId,
                   modality AS Modality, description AS Description,
                   num_images AS NumImages, manufacturer AS Manufacturer,
                   is_key_images AS IsKeyImages, modified_date AS ModifiedDate
            FROM pacs.series
            WHERE study = @StudyId
            ORDER BY id ASC
            """;

        await using var connection = await CreateConnectionAsync();
        var series = await connection.QueryAsync<Series>(sql, new { StudyId = studyId });
        return series.ToList();
    }

    public async Task<List<Dataset>> GetDatasetsAsync(long seriesId)
    {
        const string sql = """
            SELECT id AS Id, instance_uid AS InstanceUid,
                   instance_number AS InstanceNumber,
                   file_size AS FileSize, mime_type AS MimeType
            FROM pacs.datasets
            WHERE series = @SeriesId
            ORDER BY instance_number ASC
            """;

        await using var connection = await CreateConnectionAsync();
        var datasets = await connection.QueryAsync<Dataset>(sql, new { SeriesId = seriesId });
        return datasets.ToList();
    }

    private static string ResolveSortColumn(string? sortBy)
    {
        if (string.IsNullOrWhiteSpace(sortBy) || !AllowedSortColumns.Contains(sortBy))
            return "s.study_date";

        return sortBy.ToLowerInvariant() switch
        {
            "studydate" => "s.study_date",
            "patientname" => "p.last_name",
            "patientid" => "p.patient_id",
            "accession" => "s.accession",
            "modality" => "s.modality",
            "status" => "s.status",
            "facilityname" => "f.name",
            _ => "s.study_date"
        };
    }
}
