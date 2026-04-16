using Dapper;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;

namespace NrsAdmin.Api.Repositories;

public class DashboardRepository : BaseRepository
{
    public DashboardRepository(IOptionsMonitor<DatabaseSettings> settings) : base(settings) { }

    public async Task<DashboardStats> GetStatsAsync()
    {
        await using var connection = await CreateConnectionAsync();

        // Run queries sequentially — Npgsql does not support concurrent commands on one connection
        var totalStudies = await connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM pacs.studies");

        var todayStudies = await connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM pacs.studies WHERE study_date >= CURRENT_DATE");

        var totalImages = await connection.ExecuteScalarAsync<long>(
            "SELECT COALESCE(SUM(num_images), 0) FROM pacs.series");

        var activeUsers = await connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM shared.active_sessions WHERE expiration > NOW() AT TIME ZONE 'UTC' AND is_system = false");

        var activeServices = await connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM shared.active_sessions WHERE expiration > NOW() AT TIME ZONE 'UTC' AND is_system = true");

        var totalPatients = await connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM pacs.patients");

        var modalityBreakdown = (await connection.QueryAsync<ModalityBreakdown>(
            """
            SELECT
                sr.modality AS Modality,
                COUNT(DISTINCT sr.study) AS StudyCount,
                COALESCE(SUM(sr.num_images), 0) AS ImageCount,
                COUNT(sr.id) AS SeriesCount,
                COUNT(DISTINCT s.patient) AS PatientCount
            FROM pacs.series sr
            JOIN pacs.studies s ON sr.study = s.id
            WHERE sr.modality IS NOT NULL AND sr.modality != ''
            GROUP BY sr.modality
            ORDER BY StudyCount DESC
            LIMIT 20
            """)).ToList();

        var facilityBreakdown = (await connection.QueryAsync<FacilityBreakdown>(
            """
            SELECT
                COALESCE(f.facility_id, 0) AS FacilityId,
                COALESCE(f.name, 'Unknown') AS FacilityName,
                COUNT(*) AS StudyCount,
                COUNT(DISTINCT s.patient) AS PatientCount
            FROM pacs.studies s
            LEFT JOIN shared.facilities f ON s.facility_id = f.facility_id
            GROUP BY f.facility_id, f.name
            ORDER BY StudyCount DESC
            """)).ToList();

        var recentStudies = (await connection.QueryAsync<RecentStudy>(
            """
            SELECT s.id AS Id,
                   CONCAT_WS(', ', p.last_name, p.first_name) AS PatientName,
                   p.patient_id AS PatientId,
                   s.modality AS Modality,
                   s.status AS Status,
                   s.study_date AS StudyDate,
                   f.name AS FacilityName,
                   s.accession AS Accession
            FROM pacs.studies s
            JOIN pacs.patients p ON s.patient = p.id
            LEFT JOIN shared.facilities f ON s.facility_id = f.facility_id
            ORDER BY s.modified_date DESC
            LIMIT 10
            """)).ToList();

        return new DashboardStats
        {
            TotalStudies = totalStudies,
            TodayStudies = todayStudies,
            TotalImages = totalImages,
            ActiveUsers = activeUsers,
            ActiveServices = activeServices,
            TotalPatients = totalPatients,
            ModalityBreakdown = modalityBreakdown,
            FacilityBreakdown = facilityBreakdown,
            RecentStudies = recentStudies
        };
    }
}
