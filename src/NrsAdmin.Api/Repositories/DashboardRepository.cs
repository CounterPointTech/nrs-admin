using Dapper;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;

namespace NrsAdmin.Api.Repositories;

public class DashboardRepository : BaseRepository
{
    private static readonly Dictionary<int, string> StatusLabels = new()
    {
        [0] = "New",
        [1] = "In Progress",
        [2] = "Read",
        [3] = "Final",
        [4] = "Addendum",
        [5] = "Cancelled",
        [6] = "On Hold",
        [7] = "Stat"
    };

    public DashboardRepository(IOptionsMonitor<DatabaseSettings> settings) : base(settings) { }

    public async Task<DashboardStats> GetStatsAsync()
    {
        await using var connection = await CreateConnectionAsync();

        // Run all aggregate queries concurrently
        var totalStudiesTask = connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM pacs.studies");

        var todayStudiesTask = connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM pacs.studies WHERE study_date >= CURRENT_DATE");

        var activeSessionsTask = connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM shared.active_sessions WHERE expiration > NOW() AT TIME ZONE 'UTC'");

        var totalPatientsTask = connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM pacs.patients");

        var byStatusTask = connection.QueryAsync<StudyCountByStatus>(
            """
            SELECT status AS Status, COUNT(*) AS Count
            FROM pacs.studies
            GROUP BY status
            ORDER BY Count DESC
            """);

        var byModalityTask = connection.QueryAsync<StudyCountByModality>(
            """
            SELECT modality AS Modality, COUNT(*) AS Count
            FROM pacs.studies
            WHERE modality IS NOT NULL AND modality != ''
            GROUP BY modality
            ORDER BY Count DESC
            LIMIT 15
            """);

        var byDateTask = connection.QueryAsync<StudyCountByDate>(
            """
            SELECT TO_CHAR(study_date, 'YYYY-MM-DD') AS Date, COUNT(*) AS Count
            FROM pacs.studies
            WHERE study_date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY TO_CHAR(study_date, 'YYYY-MM-DD')
            ORDER BY Date ASC
            """);

        var recentTask = connection.QueryAsync<RecentStudy>(
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
            """);

        await Task.WhenAll(totalStudiesTask, todayStudiesTask, activeSessionsTask,
            totalPatientsTask, byStatusTask, byModalityTask, byDateTask, recentTask);

        var byStatus = byStatusTask.Result.ToList();
        // Enrich status labels
        foreach (var item in byStatus)
        {
            item.Label = StatusLabels.GetValueOrDefault(item.Status, $"Status {item.Status}");
        }

        return new DashboardStats
        {
            TotalStudies = totalStudiesTask.Result,
            TodayStudies = todayStudiesTask.Result,
            ActiveSessions = activeSessionsTask.Result,
            TotalPatients = totalPatientsTask.Result,
            StudiesByStatus = byStatus,
            StudiesByModality = byModalityTask.Result.ToList(),
            StudiesByDate = byDateTask.Result.ToList(),
            RecentStudies = recentTask.Result.ToList()
        };
    }
}
