namespace NrsAdmin.Api.Models.Domain;

public class DashboardStats
{
    public int TotalStudies { get; set; }
    public int TodayStudies { get; set; }
    public long TotalImages { get; set; }
    public int ActiveUsers { get; set; }
    public int ActiveServices { get; set; }
    public int TotalPatients { get; set; }
    public List<ModalityBreakdown> ModalityBreakdown { get; set; } = [];
    public List<FacilityBreakdown> FacilityBreakdown { get; set; } = [];
    public List<RecentStudy> RecentStudies { get; set; } = [];
}

public class ModalityBreakdown
{
    public string Modality { get; set; } = string.Empty;
    public int StudyCount { get; set; }
    public long ImageCount { get; set; }
    public int SeriesCount { get; set; }
    public int PatientCount { get; set; }
}

public class FacilityBreakdown
{
    public int FacilityId { get; set; }
    public string FacilityName { get; set; } = string.Empty;
    public int StudyCount { get; set; }
    public int PatientCount { get; set; }
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
