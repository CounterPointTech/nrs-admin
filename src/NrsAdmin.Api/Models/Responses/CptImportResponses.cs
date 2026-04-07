using NrsAdmin.Api.Models.Requests;

namespace NrsAdmin.Api.Models.Responses;

public class CptImportPreviewResponse
{
    public int TotalRows { get; set; }
    public int ValidRows { get; set; }
    public int ErrorRows { get; set; }
    public int DuplicateRows { get; set; }
    public List<CptImportPreviewRow> Rows { get; set; } = [];
}

public class CptImportPreviewRow
{
    public int RowNumber { get; set; }
    public CptImportRow Data { get; set; } = new();
    public bool IsValid { get; set; }
    public bool IsDuplicate { get; set; }
    public List<string> Errors { get; set; } = [];
}

public class CptImportExecuteResponse
{
    public int InsertedCount { get; set; }
    public int UpdatedCount { get; set; }
    public int SkippedCount { get; set; }
    public int ErrorCount { get; set; }
    public List<string> Errors { get; set; } = [];
}
