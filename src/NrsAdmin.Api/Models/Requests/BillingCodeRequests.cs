namespace NrsAdmin.Api.Models.Requests;

// ==================== CPT Code Requests ====================

public class CptCodeSearchRequest
{
    public string? Search { get; set; }
    public string? ModalityType { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string? SortBy { get; set; }
    public bool SortDesc { get; set; }
}

public class CreateCptCodeRequest
{
    public string ServiceCode { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ModalityType { get; set; }
    public decimal? RvuWork { get; set; }
    public string? CustomField1 { get; set; }
    public string? CustomField2 { get; set; }
    public string? CustomField3 { get; set; }
}

public class UpdateCptCodeRequest
{
    public string ServiceCode { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ModalityType { get; set; }
    public decimal? RvuWork { get; set; }
    public string? CustomField1 { get; set; }
    public string? CustomField2 { get; set; }
    public string? CustomField3 { get; set; }
}

public class CptImportRow
{
    public string ServiceCode { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ModalityType { get; set; }
    public decimal? RvuWork { get; set; }
    public string? CustomField1 { get; set; }
    public string? CustomField2 { get; set; }
    public string? CustomField3 { get; set; }
}

public class CptImportExecuteRequest
{
    public List<CptImportRow> Rows { get; set; } = [];
    public bool OverwriteExisting { get; set; }
}

// ==================== ICD Code Requests ====================

public class IcdCodeSearchRequest
{
    public string? Search { get; set; }
    public int? Version { get; set; }
    public long? CategoryId { get; set; }
    public bool? IncludeObsolete { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string? SortBy { get; set; }
    public bool SortDesc { get; set; }
}

public class CreateIcdCodeRequest
{
    public string IcdCodeId { get; set; } = string.Empty;
    public string? Description { get; set; }
    public long? SubCategoryId { get; set; }
    public int IcdCodeVersion { get; set; } = 10;
    public string IcdCodeDisplay { get; set; } = string.Empty;
}

public class UpdateIcdCodeRequest
{
    public string? Description { get; set; }
    public long? SubCategoryId { get; set; }
    public int IcdCodeVersion { get; set; } = 10;
    public string IcdCodeDisplay { get; set; } = string.Empty;
}
