namespace NrsAdmin.Api.Models.Domain;

public class StudySearchResult
{
    public long Id { get; set; }
    public string StudyUid { get; set; } = string.Empty;
    public DateTime StudyDate { get; set; }
    public string? Accession { get; set; }
    public string Modality { get; set; } = string.Empty;
    public int Status { get; set; }
    public string? StudyTags { get; set; }
    public int FacilityId { get; set; }
    public string? FacilityName { get; set; }
    public string? Institution { get; set; }
    public int? PhysicianId { get; set; }

    // Patient info (from pacs.patients JOIN)
    public string PatientId { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string? Gender { get; set; }
    public DateTime? BirthTime { get; set; }

    // Aggregates
    public int SeriesCount { get; set; }
    public int ImageCount { get; set; }
}

public class BulkUpdateResult
{
    public int UpdatedCount { get; set; }
    public int RequestedCount { get; set; }
}

public class StudyDetail : StudySearchResult
{
    public long PatientDbId { get; set; }
    public string? MiddleName { get; set; }
    public bool IsValid { get; set; }
    public string? Comments { get; set; }
    public string? PhysicianName { get; set; }
    public int? RadiologistId { get; set; }
    public string? RadiologistName { get; set; }
    public string? Custom1 { get; set; }
    public string? Custom2 { get; set; }
    public string? Custom3 { get; set; }
    public string? Custom4 { get; set; }
    public string? Custom5 { get; set; }
    public string? Custom6 { get; set; }
    public string? AnatomicalArea { get; set; }
    public int Priority { get; set; }
    public DateTime ModifiedDate { get; set; }
    public DateTime? FirstProcessedDate { get; set; }
    public DateTime? LastImageProcessedDate { get; set; }
}
