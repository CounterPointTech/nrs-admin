using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Repositories;
using NrsAdmin.Api.Services;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/standard-procedures")]
[Authorize]
public class StandardProceduresController : ControllerBase
{
    private readonly StandardProcedureRepository _repository;
    private readonly StandardProcedureTemplateService _templateService;
    private readonly ILogger<StandardProceduresController> _logger;

    public StandardProceduresController(
        StandardProcedureRepository repository,
        StandardProcedureTemplateService templateService,
        ILogger<StandardProceduresController> logger)
    {
        _repository = repository;
        _templateService = templateService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<StandardProcedure>>>> Search(
        [FromQuery] StandardProcedureSearchRequest request)
    {
        var result = await _repository.SearchAsync(request);
        return Ok(ApiResponse<PagedResponse<StandardProcedure>>.Ok(result));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<StandardProcedure>>> GetById(long id)
    {
        var item = await _repository.GetByIdAsync(id);
        if (item is null)
            return NotFound(ApiResponse<StandardProcedure>.Fail($"Standard procedure {id} not found."));
        return Ok(ApiResponse<StandardProcedure>.Ok(item));
    }

    [HttpGet("modality-types")]
    public async Task<ActionResult<ApiResponse<List<string>>>> GetModalityTypes()
    {
        var types = await _repository.GetAllModalityTypesAsync();
        return Ok(ApiResponse<List<string>>.Ok(types));
    }

    [HttpGet("anatomical-areas")]
    public async Task<ActionResult<ApiResponse<List<AnatomicalArea>>>> GetAnatomicalAreas()
    {
        var areas = await _repository.GetAnatomicalAreasAsync();
        return Ok(ApiResponse<List<AnatomicalArea>>.Ok(areas));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<StandardProcedure>>> Create(
        [FromBody] CreateStandardProcedureRequest request)
    {
        if (!await _repository.ModalityTypeExistsAsync(request.ModalityTypeId))
            return BadRequest(ApiResponse<StandardProcedure>.Fail(
                $"Modality type '{request.ModalityTypeId}' does not exist."));

        if (request.AnatomicalAreaId.HasValue &&
            !await _repository.AnatomicalAreaExistsAsync(request.AnatomicalAreaId.Value))
            return BadRequest(ApiResponse<StandardProcedure>.Fail(
                $"Anatomical area {request.AnatomicalAreaId} does not exist."));

        var created = await _repository.CreateAsync(request);
        _logger.LogInformation("Standard procedure created: {Id} ({Name} / {Modality})",
            created.StandardProcedureId, created.ProcedureName, created.ModalityTypeId);

        return CreatedAtAction(nameof(GetById), new { id = created.StandardProcedureId },
            ApiResponse<StandardProcedure>.Ok(created, "Standard procedure created successfully."));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ApiResponse<StandardProcedure>>> Update(
        long id, [FromBody] UpdateStandardProcedureRequest request)
    {
        if (!await _repository.ModalityTypeExistsAsync(request.ModalityTypeId))
            return BadRequest(ApiResponse<StandardProcedure>.Fail(
                $"Modality type '{request.ModalityTypeId}' does not exist."));

        if (request.AnatomicalAreaId.HasValue &&
            !await _repository.AnatomicalAreaExistsAsync(request.AnatomicalAreaId.Value))
            return BadRequest(ApiResponse<StandardProcedure>.Fail(
                $"Anatomical area {request.AnatomicalAreaId} does not exist."));

        var updated = await _repository.UpdateAsync(id, request);
        if (updated is null)
            return NotFound(ApiResponse<StandardProcedure>.Fail($"Standard procedure {id} not found."));

        _logger.LogInformation("Standard procedure updated: {Id}", id);
        return Ok(ApiResponse<StandardProcedure>.Ok(updated, "Standard procedure updated successfully."));
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult<ApiResponse>> Delete(long id)
    {
        var (deleted, hasRefs, refDetail) = await _repository.DeleteAsync(id);
        if (hasRefs)
            return Conflict(ApiResponse.Fail(
                $"Cannot delete — row is referenced by {refDetail}. Remove the references first."));
        if (!deleted)
            return NotFound(ApiResponse.Fail($"Standard procedure {id} not found."));

        _logger.LogInformation("Standard procedure deleted: {Id}", id);
        return Ok(ApiResponse.Ok("Standard procedure deleted successfully."));
    }

    [HttpGet("template")]
    public async Task<IActionResult> GetTemplate([FromQuery] string format = "xlsx")
    {
        var lower = (format ?? "xlsx").ToLowerInvariant();
        if (lower == "csv")
        {
            var bytes = await _templateService.BuildCsvTemplateAsync();
            return File(bytes, "text/csv", "standard-procedures-template.csv");
        }
        if (lower == "xlsx")
        {
            var bytes = await _templateService.BuildXlsxTemplateAsync();
            return File(bytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "standard-procedures-template.xlsx");
        }
        return BadRequest(ApiResponse.Fail("Unknown format. Use 'csv' or 'xlsx'."));
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] StandardProcedureSearchRequest request,
        [FromQuery] string format = "csv")
    {
        var rows = await _repository.ExportAsync(request);
        var stamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");
        var lower = (format ?? "csv").ToLowerInvariant();

        if (lower == "xlsx")
        {
            var bytes = _templateService.BuildXlsxExport(rows);
            return File(bytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"standard-procedures-export-{stamp}.xlsx");
        }
        if (lower == "csv")
        {
            var bytes = _templateService.BuildCsvExport(rows);
            return File(bytes, "text/csv", $"standard-procedures-export-{stamp}.csv");
        }
        return BadRequest(ApiResponse.Fail("Unknown format. Use 'csv' or 'xlsx'."));
    }

    [HttpPost("import/preview")]
    public async Task<ActionResult<ApiResponse<StandardProcedureImportPreviewResponse>>> ImportPreview(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(ApiResponse<StandardProcedureImportPreviewResponse>.Fail("No file uploaded."));

        List<string?[]> rawRows;
        var extension = Path.GetExtension(file.FileName)?.ToLowerInvariant();
        var isXlsx = extension is ".xlsx" or ".xlsm"
                  || string.Equals(file.ContentType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", StringComparison.OrdinalIgnoreCase);

        try
        {
            if (isXlsx)
            {
                await using var stream = file.OpenReadStream();
                rawRows = StandardProcedureTemplateService.ParseXlsx(stream);
            }
            else
            {
                using var reader = new StreamReader(file.OpenReadStream());
                var content = await reader.ReadToEndAsync();
                var lines = CsvHelpers.SplitRows(content).ToList();

                rawRows = new List<string?[]>();
                var sawHeader = false;
                foreach (var line in lines)
                {
                    var fields = CsvHelpers.ParseCsvLine(line);
                    if (!sawHeader &&
                        fields.Length >= 1 &&
                        string.Equals(fields[0].Trim(), "ProcedureName", StringComparison.OrdinalIgnoreCase))
                    {
                        sawHeader = true;
                        continue;
                    }
                    if (!sawHeader)
                    {
                        // First non-comment, non-blank line before any header — treat as data and map by position.
                        sawHeader = true;
                    }

                    var padded = new string?[StandardProcedureTemplateService.HeaderColumns.Length];
                    for (var i = 0; i < padded.Length; i++)
                        padded[i] = i < fields.Length ? fields[i] : null;
                    rawRows.Add(padded);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse standard procedures import file");
            return BadRequest(ApiResponse<StandardProcedureImportPreviewResponse>.Fail(
                $"Could not parse file: {ex.Message}"));
        }

        // Validate against lookups
        var modalitySet = (await _repository.GetAllModalityTypesAsync())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var areaMap = (await _repository.GetAnatomicalAreasAsync())
            .ToDictionary(a => a.AnatomicalAreaName, a => a.AnatomicalAreaId, StringComparer.OrdinalIgnoreCase);

        var previewRows = new List<StandardProcedureImportPreviewRow>();
        var rowNumber = 0;

        foreach (var fields in rawRows)
        {
            rowNumber++;
            var errors = new List<string>();

            var procName = (fields.ElementAtOrDefault(0) ?? "").Trim();
            var modality = (fields.ElementAtOrDefault(1) ?? "").Trim();
            var requiredTimeStr = (fields.ElementAtOrDefault(2) ?? "").Trim();
            var areaName = (fields.ElementAtOrDefault(3) ?? "").Trim();
            var prep = fields.ElementAtOrDefault(4)?.Trim();
            var instructionsRequiredStr = (fields.ElementAtOrDefault(5) ?? "").Trim();

            if (string.IsNullOrEmpty(procName))
                errors.Add("ProcedureName is required.");
            if (procName.Length > 255)
                errors.Add("ProcedureName cannot exceed 255 characters.");

            if (string.IsNullOrEmpty(modality))
                errors.Add("ModalityType is required.");
            else if (!modalitySet.Contains(modality))
                errors.Add($"Unknown ModalityType '{modality}'.");

            var requiredTime = 15;
            if (!string.IsNullOrWhiteSpace(requiredTimeStr))
            {
                if (int.TryParse(requiredTimeStr, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedTime) && parsedTime >= 0)
                    requiredTime = parsedTime;
                else
                    errors.Add($"Invalid RequiredTime value '{requiredTimeStr}'.");
            }

            int? anatomicalAreaId = null;
            if (!string.IsNullOrWhiteSpace(areaName))
            {
                if (areaMap.TryGetValue(areaName, out var foundId))
                    anatomicalAreaId = foundId;
                else
                    errors.Add($"Unknown AnatomicalArea '{areaName}'.");
            }

            bool? instructionsRequired = null;
            if (!string.IsNullOrWhiteSpace(instructionsRequiredStr))
            {
                instructionsRequired = ParseBool(instructionsRequiredStr, out var parsed) ? parsed : null;
                if (!instructionsRequired.HasValue)
                    errors.Add($"Invalid InstructionsRequired value '{instructionsRequiredStr}' (expected true/false/yes/no/1/0).");
            }

            var data = new StandardProcedureImportRow
            {
                ProcedureName = procName,
                ModalityTypeId = modality,
                RequiredTime = requiredTime,
                AnatomicalAreaId = anatomicalAreaId,
                AnatomicalAreaName = string.IsNullOrWhiteSpace(areaName) ? null : areaName,
                ExamPrepInstructions = string.IsNullOrWhiteSpace(prep) ? null : prep,
                InstructionsRequired = instructionsRequired,
            };

            previewRows.Add(new StandardProcedureImportPreviewRow
            {
                RowNumber = rowNumber,
                Data = data,
                IsValid = errors.Count == 0,
                Errors = errors,
            });
        }

        // Duplicate detection on valid rows
        var keyCandidates = previewRows
            .Where(r => r.IsValid)
            .Select(r => (r.Data.ModalityTypeId, r.Data.ProcedureName))
            .ToList();

        var existing = keyCandidates.Count > 0
            ? await _repository.GetExistingKeysAsync(keyCandidates)
            : new HashSet<(string, string)>();

        foreach (var row in previewRows.Where(r => r.IsValid))
        {
            if (existing.Contains((row.Data.ModalityTypeId, row.Data.ProcedureName)))
                row.IsDuplicate = true;
        }

        var response = new StandardProcedureImportPreviewResponse
        {
            TotalRows = previewRows.Count,
            ValidRows = previewRows.Count(r => r.IsValid),
            ErrorRows = previewRows.Count(r => !r.IsValid),
            DuplicateRows = previewRows.Count(r => r.IsDuplicate),
            Rows = previewRows,
        };

        return Ok(ApiResponse<StandardProcedureImportPreviewResponse>.Ok(response));
    }

    [HttpPost("import/execute")]
    public async Task<ActionResult<ApiResponse<StandardProcedureImportExecuteResponse>>> ImportExecute(
        [FromBody] StandardProcedureImportExecuteRequest request)
    {
        if (request.Rows.Count == 0)
            return BadRequest(ApiResponse<StandardProcedureImportExecuteResponse>.Fail("No rows to import."));

        var validRows = request.Rows
            .Where(r => !string.IsNullOrWhiteSpace(r.ProcedureName) && !string.IsNullOrWhiteSpace(r.ModalityTypeId))
            .ToList();

        var (inserted, updated) = await _repository.BulkUpsertAsync(validRows, request.OverwriteExisting);

        _logger.LogInformation(
            "Standard procedure import completed: {Inserted} inserted, {Updated} updated, {Skipped} skipped",
            inserted, updated, request.Rows.Count - inserted - updated);

        return Ok(ApiResponse<StandardProcedureImportExecuteResponse>.Ok(new StandardProcedureImportExecuteResponse
        {
            InsertedCount = inserted,
            UpdatedCount = updated,
            SkippedCount = request.Rows.Count - validRows.Count,
            ErrorCount = 0,
        }));
    }

    private static bool ParseBool(string value, out bool result)
    {
        switch (value.Trim().ToLowerInvariant())
        {
            case "true":  case "yes": case "y": case "1": result = true;  return true;
            case "false": case "no":  case "n": case "0": result = false; return true;
            default: result = false; return false;
        }
    }
}
