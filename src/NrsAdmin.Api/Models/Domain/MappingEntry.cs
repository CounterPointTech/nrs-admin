namespace NrsAdmin.Api.Models.Domain;

public class MappingEntry
{
    public int LineNumber { get; set; }
    public string? ModalityAE { get; set; }
    public string? ModalitySN { get; set; }
    public string? ModalityStationName { get; set; }
    public string? ModalityLocation { get; set; }
    public string? RisAE { get; set; }
    public string? RisSN { get; set; }
    public bool? PersistStudyUID { get; set; }
    public bool IsComment { get; set; }
    public string? RawLine { get; set; }
}
