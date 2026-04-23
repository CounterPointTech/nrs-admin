namespace NrsAdmin.Api.Models.Requests;

public class StandardProcedureSearchRequest
{
    public string? Search { get; set; }
    public string? ModalityType { get; set; }
    public int? AnatomicalAreaId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string? SortBy { get; set; }
    public bool SortDesc { get; set; }
}

public class CreateStandardProcedureRequest
{
    public string ProcedureName { get; set; } = string.Empty;
    public string ModalityTypeId { get; set; } = string.Empty;
    public int RequiredTime { get; set; } = 15;
    public int? AnatomicalAreaId { get; set; }
    public string? ExamPrepInstructions { get; set; }
    public bool? InstructionsRequired { get; set; }
}

public class UpdateStandardProcedureRequest
{
    public string ProcedureName { get; set; } = string.Empty;
    public string ModalityTypeId { get; set; } = string.Empty;
    public int RequiredTime { get; set; } = 15;
    public int? AnatomicalAreaId { get; set; }
    public string? ExamPrepInstructions { get; set; }
    public bool? InstructionsRequired { get; set; }
}

public class StandardProcedureImportRow
{
    public string ProcedureName { get; set; } = string.Empty;
    public string ModalityTypeId { get; set; } = string.Empty;
    public int RequiredTime { get; set; } = 15;
    public int? AnatomicalAreaId { get; set; }
    public string? AnatomicalAreaName { get; set; }
    public string? ExamPrepInstructions { get; set; }
    public bool? InstructionsRequired { get; set; }
}

public class StandardProcedureImportExecuteRequest
{
    public List<StandardProcedureImportRow> Rows { get; set; } = [];
    public bool OverwriteExisting { get; set; }
}
