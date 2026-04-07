using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Services;

public partial class ReportTemplateService
{
    private readonly IOptionsMonitor<ReportTemplateSettings> _settings;
    private readonly ReportTemplateRepository _repository;
    private readonly ILogger<ReportTemplateService> _logger;

    public ReportTemplateService(
        IOptionsMonitor<ReportTemplateSettings> settings,
        ReportTemplateRepository repository,
        ILogger<ReportTemplateService> logger)
    {
        _settings = settings;
        _repository = repository;
        _logger = logger;
    }

    public async Task<List<ReportTemplateInfo>> ListTemplatesAsync()
    {
        var dir = _settings.CurrentValue.Directory;
        if (!Directory.Exists(dir))
        {
            _logger.LogWarning("Report template directory not found at {Path}", dir);
            return [];
        }

        var files = Directory.GetFiles(dir, "*.htm")
            .Select(f => new FileInfo(f))
            .OrderBy(f => f.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();

        // Get facility usage from DB
        Dictionary<string, List<string>> facilityMappings;
        try
        {
            facilityMappings = await _repository.GetFacilityTemplateMappingsAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load facility-template mappings from DB; listing templates without facility info");
            facilityMappings = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
        }

        return files.Select(f =>
        {
            var nameWithoutExt = Path.GetFileNameWithoutExtension(f.Name);
            facilityMappings.TryGetValue(nameWithoutExt, out var facilities);
            // Also check with extension
            if (facilities == null)
                facilityMappings.TryGetValue(f.Name, out facilities);

            return new ReportTemplateInfo
            {
                Name = f.Name,
                SizeBytes = f.Length,
                LastModifiedUtc = f.LastWriteTimeUtc,
                UsedByFacilities = facilities ?? []
            };
        }).ToList();
    }

    public async Task<string> ReadTemplateAsync(string name)
    {
        ValidateFileName(name);
        var path = GetTemplatePath(name);

        if (!File.Exists(path))
            throw new FileNotFoundException("Template not found.", name);

        return await File.ReadAllTextAsync(path);
    }

    public async Task SaveTemplateAsync(string name, string content)
    {
        ValidateFileName(name);
        var path = GetTemplatePath(name);

        if (!File.Exists(path))
            throw new FileNotFoundException("Template not found.", name);

        await CreateBackupAsync(name);
        await File.WriteAllTextAsync(path, content);
        _logger.LogInformation("Report template '{Name}' saved", name);
    }

    public async Task CreateTemplateAsync(string name, string content)
    {
        ValidateFileName(name);
        var path = GetTemplatePath(name);

        if (File.Exists(path))
            throw new InvalidOperationException($"Template '{name}' already exists.");

        Directory.CreateDirectory(_settings.CurrentValue.Directory);
        await File.WriteAllTextAsync(path, content);
        _logger.LogInformation("Report template '{Name}' created", name);
    }

    public async Task DeleteTemplateAsync(string name)
    {
        ValidateFileName(name);
        var path = GetTemplatePath(name);

        if (!File.Exists(path))
            throw new FileNotFoundException("Template not found.", name);

        await CreateBackupAsync(name);
        File.Delete(path);
        _logger.LogInformation("Report template '{Name}' deleted", name);
    }

    public async Task DuplicateTemplateAsync(string sourceName, string newName)
    {
        ValidateFileName(sourceName);
        ValidateFileName(newName);

        var sourcePath = GetTemplatePath(sourceName);
        if (!File.Exists(sourcePath))
            throw new FileNotFoundException("Source template not found.", sourceName);

        var destPath = GetTemplatePath(newName);
        if (File.Exists(destPath))
            throw new InvalidOperationException($"Template '{newName}' already exists.");

        await FileExtensions.CopyAsync(sourcePath, destPath);
        _logger.LogInformation("Report template '{Source}' duplicated to '{Dest}'", sourceName, newName);
    }

    public async Task<string> CreateBackupAsync(string name)
    {
        ValidateFileName(name);
        var sourcePath = GetTemplatePath(name);

        if (!File.Exists(sourcePath))
            throw new FileNotFoundException("Template not found.", name);

        var backupDir = _settings.CurrentValue.BackupDirectory;
        Directory.CreateDirectory(backupDir);

        var nameWithoutExt = Path.GetFileNameWithoutExtension(name);
        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
        var backupFileName = $"{nameWithoutExt}_{timestamp}.htm";
        var backupPath = Path.Combine(backupDir, backupFileName);

        await FileExtensions.CopyAsync(sourcePath, backupPath);
        _logger.LogInformation("Report template '{Name}' backed up to {BackupFile}", name, backupFileName);

        return backupFileName;
    }

    public List<ReportTemplateBackup> ListBackups()
    {
        var backupDir = _settings.CurrentValue.BackupDirectory;
        if (!Directory.Exists(backupDir))
            return [];

        return Directory.GetFiles(backupDir, "*.htm")
            .Select(f => new FileInfo(f))
            .OrderByDescending(f => f.CreationTimeUtc)
            .Select(f =>
            {
                // Extract original template name from backup filename pattern: {name}_{yyyyMMdd_HHmmss}.htm
                var baseName = Path.GetFileNameWithoutExtension(f.Name);
                var originalTemplate = TimestampSuffixPattern().IsMatch(baseName)
                    ? TimestampSuffixPattern().Replace(baseName, "") + ".htm"
                    : f.Name;

                return new ReportTemplateBackup
                {
                    FileName = f.Name,
                    CreatedAt = f.CreationTimeUtc,
                    SizeBytes = f.Length,
                    OriginalTemplate = originalTemplate
                };
            })
            .ToList();
    }

    public async Task RestoreFromBackupAsync(string backupFileName)
    {
        if (backupFileName.Contains("..") || backupFileName.Contains('/') || backupFileName.Contains('\\'))
            throw new ArgumentException("Invalid backup filename.");

        var backupPath = Path.Combine(_settings.CurrentValue.BackupDirectory, backupFileName);
        if (!File.Exists(backupPath))
            throw new FileNotFoundException("Backup file not found.", backupFileName);

        // Determine original template name
        var baseName = Path.GetFileNameWithoutExtension(backupFileName);
        var originalName = TimestampSuffixPattern().IsMatch(baseName)
            ? TimestampSuffixPattern().Replace(baseName, "") + ".htm"
            : backupFileName;

        var destPath = GetTemplatePath(originalName);

        // Backup current file if it exists
        if (File.Exists(destPath))
            await CreateBackupAsync(originalName);

        File.Copy(backupPath, destPath, overwrite: true);
        _logger.LogInformation("Report template restored from backup {FileName} to {OriginalName}",
            backupFileName, originalName);
    }

    public async Task<List<string>> GetFacilitiesUsingTemplateAsync(string name)
    {
        var nameWithoutExt = Path.GetFileNameWithoutExtension(name);
        var facilities = await _repository.GetFacilitiesUsingTemplateAsync(nameWithoutExt);
        if (facilities.Count == 0)
        {
            // Also try with full filename
            facilities = await _repository.GetFacilitiesUsingTemplateAsync(name);
        }
        return facilities;
    }

    public static List<TemplatePlaceholder> GetPlaceholders()
    {
        return
        [
            // Patient
            new() { Name = "PatientName", Tag = "<!--PatientName-->", Description = "Full patient name", Category = "Patient", SampleValue = "DOE, JOHN" },
            new() { Name = "PatientID", Tag = "<!--PatientID-->", Description = "Patient MRN/ID", Category = "Patient", SampleValue = "MRN-123456" },
            new() { Name = "DOB", Tag = "<!--DOB-->", Description = "Patient date of birth", Category = "Patient", SampleValue = "01/15/1980" },
            new() { Name = "PatientGender", Tag = "<!--PatientGender-->", Description = "Patient gender", Category = "Patient", SampleValue = "Male" },
            new() { Name = "Phone", Tag = "<!--Phone-->", Description = "Patient phone number", Category = "Patient", SampleValue = "(555) 123-4567" },
            new() { Name = "EmergencyContact", Tag = "<!--EmergencyContact-->", Description = "Emergency contact name", Category = "Patient", SampleValue = "Jane Doe" },
            new() { Name = "EmergencyContactPhone", Tag = "<!--EmergencyContactPhone-->", Description = "Emergency contact phone", Category = "Patient", SampleValue = "(555) 987-6543" },

            // Procedure
            new() { Name = "ProcedureDate", Tag = "<!--ProcedureDate-->", Description = "Date of procedure", Category = "Procedure", SampleValue = "02/21/2026" },
            new() { Name = "ProcedureName", Tag = "<!--ProcedureName-->", Description = "Procedure description", Category = "Procedure", SampleValue = "CT ABDOMEN W/O CONTRAST" },
            new() { Name = "ProcedureID", Tag = "<!--ProcedureID-->", Description = "Procedure ID", Category = "Procedure", SampleValue = "PROC-78901" },
            new() { Name = "Accession", Tag = "<!--Accession-->", Description = "Accession number", Category = "Procedure", SampleValue = "ACC-2026-00123" },
            new() { Name = "ProcedureNotes", Tag = "<!--ProcedureNotes-->", Description = "Procedure notes", Category = "Procedure", SampleValue = "Patient fasting, no contrast allergy" },
            new() { Name = "ProcedureDosage", Tag = "<!--ProcedureDosage-->", Description = "Radiation dosage info", Category = "Procedure", SampleValue = "CTDIvol: 12.5 mGy, DLP: 450 mGy*cm" },

            // Order
            new() { Name = "OrderReason", Tag = "<!--OrderReason-->", Description = "Reason for order", Category = "Order", SampleValue = "Abdominal pain, rule out appendicitis" },
            new() { Name = "OrderDescription", Tag = "<!--OrderDescription-->", Description = "Order description", Category = "Order", SampleValue = "CT Abdomen/Pelvis without contrast" },
            new() { Name = "PatientComplaint", Tag = "<!--PatientComplaint-->", Description = "Patient chief complaint", Category = "Order", SampleValue = "Acute abdominal pain" },

            // Physician
            new() { Name = "ReferringPhysician", Tag = "<!--ReferringPhysician-->", Description = "Referring physician name", Category = "Physician", SampleValue = "Dr. Sarah Smith" },
            new() { Name = "PhysicianName", Tag = "<!--PhysicianName-->", Description = "Reading physician name", Category = "Physician", SampleValue = "Dr. Robert Johnson" },
            new() { Name = "ConsultingPhysicians", Tag = "<!--ConsultingPhysicians-->", Description = "Consulting physicians list", Category = "Physician", SampleValue = "Dr. Williams, Dr. Brown" },
            new() { Name = "SigningPhysicianName", Tag = "<!--SigningPhysicianName-->", Description = "Signing physician name", Category = "Physician", SampleValue = "Dr. Robert Johnson, MD" },
            new() { Name = "DateSigned", Tag = "<!--DateSigned-->", Description = "Date report was signed", Category = "Physician", SampleValue = "02/21/2026 14:30" },

            // Report
            new() { Name = "ReportText", Tag = "<!--ReportText-->", Description = "Full report body text", Category = "Report", SampleValue = "<b>FINDINGS:</b><br/>Normal examination. No acute abnormality identified.<br/><br/><b>IMPRESSION:</b><br/>1. No acute findings." },
            new() { Name = "Preliminary", Tag = "<!--Preliminary-->", Description = "Preliminary report indicator", Category = "Report", SampleValue = "" },
            new() { Name = "DateTranscribed", Tag = "<!--DateTranscribed-->", Description = "Date report was transcribed", Category = "Report", SampleValue = "02/21/2026 13:45" },
            new() { Name = "TranscribedBy", Tag = "<!--TranscribedBy-->", Description = "Transcriptionist name", Category = "Report", SampleValue = "J. Anderson" },

            // Facility
            new() { Name = "Facility", Tag = "<!--Facility-->", Description = "Facility name", Category = "Facility", SampleValue = "Main Hospital Radiology" },
            new() { Name = "Site", Tag = "<!--Site-->", Description = "Site name", Category = "Facility", SampleValue = "Main Campus" },
            new() { Name = "Address1", Tag = "<!--Address1-->", Description = "Address line 1", Category = "Facility", SampleValue = "123 Medical Center Dr" },
            new() { Name = "Address2", Tag = "<!--Address2-->", Description = "Address line 2", Category = "Facility", SampleValue = "Suite 200" },
            new() { Name = "City", Tag = "<!--City-->", Description = "City", Category = "Facility", SampleValue = "Salt Lake City" },
            new() { Name = "State", Tag = "<!--State-->", Description = "State", Category = "Facility", SampleValue = "UT" },
            new() { Name = "Zip", Tag = "<!--Zip-->", Description = "ZIP code", Category = "Facility", SampleValue = "84101" },

            // Header/Footer
            new() { Name = "HeaderAccession", Tag = "<!--HeaderAccession-->", Description = "Accession in header", Category = "Header/Footer", SampleValue = "ACC-2026-00123" },
            new() { Name = "HeaderPatientID", Tag = "<!--HeaderPatientID-->", Description = "Patient ID in header", Category = "Header/Footer", SampleValue = "MRN-123456" },
            new() { Name = "HeaderPatientName", Tag = "<!--HeaderPatientName-->", Description = "Patient name in header", Category = "Header/Footer", SampleValue = "DOE, JOHN" },
            new() { Name = "FooterProcedureDate", Tag = "<!--FooterProcedureDate-->", Description = "Procedure date in footer", Category = "Header/Footer", SampleValue = "02/21/2026" },
            new() { Name = "FooterProcedureName", Tag = "<!--FooterProcedureName-->", Description = "Procedure name in footer", Category = "Header/Footer", SampleValue = "CT ABDOMEN W/O CONTRAST" },
            new() { Name = "HeaderHeight", Tag = "<!--HeaderHeight-->", Description = "Header height setting", Category = "Header/Footer", SampleValue = "1.5in" },
            new() { Name = "FooterHeight", Tag = "<!--FooterHeight-->", Description = "Footer height setting", Category = "Header/Footer", SampleValue = "1.0in" },

            // Addendum
            new() { Name = "AddendumCount", Tag = "<!--AddendumCount-->", Description = "Number of addendums", Category = "Addendum", SampleValue = "1" },
            new() { Name = "AddendumPhysician", Tag = "<!--AddendumPhysician-->", Description = "Addendum physician name", Category = "Addendum", SampleValue = "Dr. Robert Johnson" },
            new() { Name = "AddendumReportDate", Tag = "<!--AddendumReportDate-->", Description = "Addendum report date", Category = "Addendum", SampleValue = "02/22/2026 09:15" },
            new() { Name = "addendumReport", Tag = "<!--addendumReport-->", Description = "Addendum report text (lowercase variant)", Category = "Addendum", SampleValue = "ADDENDUM: Additional finding noted on review." },
            new() { Name = "AddendumReport", Tag = "<!--AddendumReport-->", Description = "Addendum report text", Category = "Addendum", SampleValue = "ADDENDUM: Additional finding noted on review." },
            new() { Name = "AddendumSigningPhysician", Tag = "<!--AddendumSigningPhysician-->", Description = "Addendum signing physician", Category = "Addendum", SampleValue = "Dr. Robert Johnson, MD" },
            new() { Name = "AddendumSignedDate", Tag = "<!--AddendumSignedDate-->", Description = "Addendum signed date", Category = "Addendum", SampleValue = "02/22/2026 09:30" },

            // Image
            new() { Name = "SiteImage", Tag = "<!--SiteImage-->", Description = "Site logo/header image", Category = "Image", SampleValue = "<img src='cid:SiteImage' alt='Site Logo' style='max-height:80px;' />" },
            new() { Name = "SigningPhysicianSignatureImage", Tag = "<!--SigningPhysicianSignatureImage-->", Description = "Physician signature image", Category = "Image", SampleValue = "<img src='cid:SignatureImage' alt='Signature' style='max-height:40px;' />" },
            new() { Name = "ReportFooterImage", Tag = "<!--ReportFooterImage-->", Description = "Report footer image", Category = "Image", SampleValue = "<img src='cid:FooterImage' alt='Footer' style='max-height:60px;' />" },

            // Custom
            new() { Name = "BillingAccountsCustomField1", Tag = "<!--BillingAccountsCustomField1-->", Description = "Billing custom field 1", Category = "Custom", SampleValue = "INS-ABC-12345" },
            new() { Name = "OrdersCustomField1", Tag = "<!--OrdersCustomField1-->", Description = "Orders custom field 1", Category = "Custom", SampleValue = "Priority: STAT" },
        ];
    }

    public static List<TemplateSection> GetSections()
    {
        return
        [
            new() { Name = "Header", StartTag = "<!--HeaderStart-->", EndTag = "<!--HeaderEnd-->", Description = "Page header — printed on every page" },
            new() { Name = "Document Header", StartTag = "<!--DocumentHeaderStart-->", EndTag = "<!--DocumentHeaderEnd-->", Description = "Document header — printed once at top of report" },
            new() { Name = "Document Footer", StartTag = "<!--DocumentFooterStart-->", EndTag = "<!--DocumentFooterEnd-->", Description = "Document footer — printed once at bottom of report" },
            new() { Name = "Footer", StartTag = "<!--FooterStart-->", EndTag = "<!--FooterEnd-->", Description = "Page footer — printed on every page" },
            new() { Name = "Addendums", StartTag = "<!--AddendumStart-->", EndTag = "<!--AddendumEnd-->", Description = "Addendum section — repeated for each addendum" },
            new() { Name = "Page Numbering", StartTag = "<!--PageNumberStart-->", EndTag = "<!--PageNumberEnd-->", Description = "Page number display section" },
        ];
    }

    public string RenderPreview(string content)
    {
        var placeholders = GetPlaceholders();
        var result = content;

        foreach (var placeholder in placeholders)
        {
            result = result.Replace(placeholder.Tag, placeholder.SampleValue, StringComparison.OrdinalIgnoreCase);
        }

        // Replace cid: image references with placeholder data URIs
        result = CidImagePattern().Replace(result, match =>
        {
            var before = match.Groups[1].Value; // src= or src='
            var after = match.Groups[3].Value; // closing quote
            return $"{before}data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='60'%3E%3Crect width='200' height='60' fill='%23e2e8f0'/%3E%3Ctext x='100' y='35' text-anchor='middle' fill='%2364748b' font-size='12'%3EImage Placeholder%3C/text%3E%3C/svg%3E{after}";
        });

        return result;
    }

    private string GetTemplatePath(string name)
    {
        var dir = _settings.CurrentValue.Directory;
        var fullPath = Path.GetFullPath(Path.Combine(dir, name));

        // Path traversal check
        if (!fullPath.StartsWith(Path.GetFullPath(dir), StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Invalid template name — path traversal detected.");

        return fullPath;
    }

    private static void ValidateFileName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Template name is required.");

        if (name.Contains("..") || name.Contains('/') || name.Contains('\\'))
            throw new ArgumentException("Invalid template name.");

        if (!name.EndsWith(".htm", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Template name must end with .htm");
    }

    [GeneratedRegex(@"_\d{8}_\d{6}$")]
    private static partial Regex TimestampSuffixPattern();

    [GeneratedRegex(@"(src\s*=\s*['""])cid:[^'""]+(['""])")]
    private static partial Regex CidImagePattern();
}
