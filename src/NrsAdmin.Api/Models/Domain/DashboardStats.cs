namespace NrsAdmin.Api.Models.Domain;

public class DashboardStats
{
    public int TotalStudies { get; set; }
    public int TodayStudies { get; set; }
    public int ActiveSessions { get; set; }
    public int TotalPatients { get; set; }
    public List<StudyCountByStatus> StudiesByStatus { get; set; } = [];
    public List<StudyCountByModality> StudiesByModality { get; set; } = [];
    public List<StudyCountByDate> StudiesByDate { get; set; } = [];
    public List<RecentStudy> RecentStudies { get; set; } = [];
}

public class StudyCountByStatus
{
    public int Status { get; set; }
    public string Label { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class StudyCountByModality
{
    public string Modality { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class StudyCountByDate
{
    public string Date { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class RecentStudy
{
    public long Id { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string PatientId { get; set; } = string.Empty;
    public string Modality { get; set; } = string.Empty;
    public int Status { get; set; }
    public DateTime StudyDate { get; set; }
    public string? FacilityName { get; set; }
    public string? Accession { get; set; }
}
