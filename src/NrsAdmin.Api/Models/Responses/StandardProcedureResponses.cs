using NrsAdmin.Api.Models.Requests;

namespace NrsAdmin.Api.Models.Responses;

public class StandardProcedureImportPreviewResponse
{
    public int TotalRows { get; set; }
    public int ValidRows { get; set; }
    public int ErrorRows { get; set; }
    public int DuplicateRows { get; set; }
    public List<StandardProcedureImportPreviewRow> Rows { get; set; } = [];
}

public class StandardProcedureImportPreviewRow
{
    public int RowNumber { get; set; }
    public StandardProcedureImportRow Data { get; set; } = new();
    public bool IsValid { get; set; }
    public bool IsDuplicate { get; set; }
    public List<string> Errors { get; set; } = [];
}

public class StandardProcedureImportExecuteResponse
{
    public int InsertedCount { get; set; }
    public int UpdatedCount { get; set; }
    public int SkippedCount { get; set; }
    public int ErrorCount { get; set; }
    public List<string> Errors { get; set; } = [];
}
