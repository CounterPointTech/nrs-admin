using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/cpt-codes")]
[Authorize]
public class CptCodesController : ControllerBase
{
    private readonly BillingCodeRepository _repository;
    private readonly ILogger<CptCodesController> _logger;

    public CptCodesController(BillingCodeRepository repository, ILogger<CptCodesController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<BillingServiceCode>>>> Search(
        [FromQuery] CptCodeSearchRequest request)
    {
        var result = await _repository.SearchAsync(request);
        return Ok(ApiResponse<PagedResponse<BillingServiceCode>>.Ok(result));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<BillingServiceCode>>> GetById(long id)
    {
        var code = await _repository.GetByIdAsync(id);
        if (code is null)
            return NotFound(ApiResponse<BillingServiceCode>.Fail($"CPT code {id} not found."));

        return Ok(ApiResponse<BillingServiceCode>.Ok(code));
    }

    [HttpGet("modality-types")]
    public async Task<ActionResult<ApiResponse<List<string>>>> GetModalityTypes()
    {
        var types = await _repository.GetDistinctModalityTypesAsync();
        return Ok(ApiResponse<List<string>>.Ok(types));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<BillingServiceCode>>> Create(
        [FromBody] CreateCptCodeRequest request)
    {
        var created = await _repository.CreateAsync(request);

        _logger.LogInformation("CPT code created: {ServiceCodeId} ({ServiceCode})",
            created.ServiceCodeId, created.ServiceCode);

        return CreatedAtAction(nameof(GetById), new { id = created.ServiceCodeId },
            ApiResponse<BillingServiceCode>.Ok(created, "CPT code created successfully."));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ApiResponse<BillingServiceCode>>> Update(
        long id, [FromBody] UpdateCptCodeRequest request)
    {
        var updated = await _repository.UpdateAsync(id, request);
        if (updated is null)
            return NotFound(ApiResponse<BillingServiceCode>.Fail($"CPT code {id} not found."));

        _logger.LogInformation("CPT code updated: {ServiceCodeId} ({ServiceCode})",
            updated.ServiceCodeId, updated.ServiceCode);

        return Ok(ApiResponse<BillingServiceCode>.Ok(updated, "CPT code updated successfully."));
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult<ApiResponse>> Delete(long id)
    {
        var (deleted, hasReferences) = await _repository.DeleteAsync(id);

        if (hasReferences)
            return Conflict(ApiResponse.Fail(
                "Cannot delete CPT code — it is referenced by order procedure service lines. Remove the references first."));

        if (!deleted)
            return NotFound(ApiResponse.Fail($"CPT code {id} not found."));

        _logger.LogInformation("CPT code deleted: {ServiceCodeId}", id);
        return Ok(ApiResponse.Ok("CPT code deleted successfully."));
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] CptCodeSearchRequest request)
    {
        var results = await _repository.ExportAsync(request);

        var csv = new StringBuilder();
        csv.AppendLine("ServiceCode,Description,ModalityType,RvuWork,CustomField1,CustomField2,CustomField3");

        foreach (var r in results)
        {
            csv.AppendLine(string.Join(",",
                CsvEscape(r.ServiceCode),
                CsvEscape(r.Description),
                CsvEscape(r.ModalityType),
                r.RvuWork?.ToString(CultureInfo.InvariantCulture) ?? "",
                CsvEscape(r.CustomField1),
                CsvEscape(r.CustomField2),
                CsvEscape(r.CustomField3)
            ));
        }

        var bytes = Encoding.UTF8.GetBytes(csv.ToString());
        return File(bytes, "text/csv", $"cpt-codes-export-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv");
    }

    [HttpPost("import/preview")]
    public async Task<ActionResult<ApiResponse<CptImportPreviewResponse>>> ImportPreview(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(ApiResponse<CptImportPreviewResponse>.Fail("No file uploaded."));

        using var reader = new StreamReader(file.OpenReadStream());
        var content = await reader.ReadToEndAsync();
        var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);

        var rows = new List<CptImportPreviewRow>();
        var rowNumber = 0;

        foreach (var rawLine in lines)
        {
            rowNumber++;
            var line = rawLine.Trim('\r');

            // Skip header row
            if (rowNumber == 1 && line.StartsWith("ServiceCode", StringComparison.OrdinalIgnoreCase))
                continue;

            var fields = ParseCsvLine(line);
            var errors = new List<string>();

            if (fields.Length < 1 || string.IsNullOrWhiteSpace(fields[0]))
            {
                errors.Add("ServiceCode is required.");
            }

            decimal? rvuWork = null;
            if (fields.Length >= 4 && !string.IsNullOrWhiteSpace(fields[3]))
            {
                if (decimal.TryParse(fields[3], CultureInfo.InvariantCulture, out var parsed))
                    rvuWork = parsed;
                else
                    errors.Add($"Invalid RVU work value: '{fields[3]}'.");
            }

            var data = new CptImportRow
            {
                ServiceCode = fields.Length >= 1 ? fields[0].Trim() : "",
                Description = fields.Length >= 2 ? NullIfEmpty(fields[1].Trim()) : null,
                ModalityType = fields.Length >= 3 ? NullIfEmpty(fields[2].Trim()) : null,
                RvuWork = rvuWork,
                CustomField1 = fields.Length >= 5 ? NullIfEmpty(fields[4].Trim()) : null,
                CustomField2 = fields.Length >= 6 ? NullIfEmpty(fields[5].Trim()) : null,
                CustomField3 = fields.Length >= 7 ? NullIfEmpty(fields[6].Trim()) : null,
            };

            rows.Add(new CptImportPreviewRow
            {
                RowNumber = rowNumber,
                Data = data,
                IsValid = errors.Count == 0,
                Errors = errors,
            });
        }

        // Check for duplicates against existing DB codes
        var serviceCodes = rows
            .Where(r => r.IsValid && !string.IsNullOrEmpty(r.Data.ServiceCode))
            .Select(r => r.Data.ServiceCode)
            .ToList();

        var existingCodes = serviceCodes.Count > 0
            ? await _repository.GetExistingServiceCodesAsync(serviceCodes)
            : new HashSet<string>();

        foreach (var row in rows.Where(r => r.IsValid))
        {
            row.IsDuplicate = existingCodes.Contains(row.Data.ServiceCode);
        }

        var response = new CptImportPreviewResponse
        {
            TotalRows = rows.Count,
            ValidRows = rows.Count(r => r.IsValid),
            ErrorRows = rows.Count(r => !r.IsValid),
            DuplicateRows = rows.Count(r => r.IsDuplicate),
            Rows = rows,
        };

        return Ok(ApiResponse<CptImportPreviewResponse>.Ok(response));
    }

    [HttpPost("import/execute")]
    public async Task<ActionResult<ApiResponse<CptImportExecuteResponse>>> ImportExecute(
        [FromBody] CptImportExecuteRequest request)
    {
        if (request.Rows.Count == 0)
            return BadRequest(ApiResponse<CptImportExecuteResponse>.Fail("No rows to import."));

        // Validate rows
        var validRows = request.Rows
            .Where(r => !string.IsNullOrWhiteSpace(r.ServiceCode))
            .ToList();

        var (inserted, updated) = await _repository.BulkUpsertAsync(validRows, request.OverwriteExisting);

        _logger.LogInformation(
            "CPT import completed: {Inserted} inserted, {Updated} updated, {Skipped} skipped",
            inserted, updated, request.Rows.Count - inserted - updated);

        return Ok(ApiResponse<CptImportExecuteResponse>.Ok(new CptImportExecuteResponse
        {
            InsertedCount = inserted,
            UpdatedCount = updated,
            SkippedCount = request.Rows.Count - validRows.Count,
            ErrorCount = 0,
        }));
    }

    private static string[] ParseCsvLine(string line)
    {
        var fields = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;

        for (var i = 0; i < line.Length; i++)
        {
            var c = line[i];

            if (inQuotes)
            {
                if (c == '"')
                {
                    if (i + 1 < line.Length && line[i + 1] == '"')
                    {
                        current.Append('"');
                        i++;
                    }
                    else
                    {
                        inQuotes = false;
                    }
                }
                else
                {
                    current.Append(c);
                }
            }
            else
            {
                if (c == '"')
                {
                    inQuotes = true;
                }
                else if (c == ',')
                {
                    fields.Add(current.ToString());
                    current.Clear();
                }
                else
                {
                    current.Append(c);
                }
            }
        }

        fields.Add(current.ToString());
        return fields.ToArray();
    }

    private static string CsvEscape(string? value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }

    private static string? NullIfEmpty(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value;
}
