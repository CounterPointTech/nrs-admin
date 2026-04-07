namespace NrsAdmin.Api.Models.Domain;

public class IcdCode
{
    public string IcdCodeId { get; set; } = string.Empty;
    public string? Description { get; set; }
    public long? SubCategoryId { get; set; }
    public int IcdCodeVersion { get; set; } = 10;
    public string IcdCodeDisplay { get; set; } = string.Empty;
    public DateTime? ObsoleteDate { get; set; }

    // Joined from ris.icd_categories
    public string? CategoryName { get; set; }
}

public class IcdCategory
{
    public long IcdCategoryId { get; set; }
    public long? ParentId { get; set; }
    public string Description { get; set; } = string.Empty;
    public int Version { get; set; } = 10;
    public string? First { get; set; }
    public string? Last { get; set; }
}
