namespace NrsAdmin.Api.Models.Domain;

public class StandardProcedure
{
    public long StandardProcedureId { get; set; }
    public string ProcedureName { get; set; } = string.Empty;
    public string ModalityTypeId { get; set; } = string.Empty;
    public int RequiredTime { get; set; } = 15;
    public int? AnatomicalAreaId { get; set; }
    public string? AnatomicalAreaName { get; set; }
    public string? ExamPrepInstructions { get; set; }
    public bool? InstructionsRequired { get; set; }
}

public class AnatomicalArea
{
    public int AnatomicalAreaId { get; set; }
    public string AnatomicalAreaName { get; set; } = string.Empty;
}
