using System.Globalization;
using System.Text;
using ClosedXML.Excel;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Services;

/// <summary>
/// Builds CSV and XLSX templates + exports for the Standard Procedures catalog.
/// Template downloads include inline usage instructions and (for xlsx) data-validation
/// dropdowns drawn from the live ris.modality_types and ris.anatomical_areas tables.
/// </summary>
public class StandardProcedureTemplateService
{
    private readonly StandardProcedureRepository _repository;

    public StandardProcedureTemplateService(StandardProcedureRepository repository)
    {
        _repository = repository;
    }

    public static readonly string[] HeaderColumns =
    [
        "ProcedureName",
        "ModalityType",
        "RequiredTime",
        "AnatomicalArea",
        "ExamPrepInstructions",
        "InstructionsRequired",
    ];

    private static readonly string[] CsvInstructions =
    [
        "Standard Procedures import template",
        "Upload this file via RIS > Modalities > Standard Procedures > Import.",
        "Lines that begin with '#' are comments and are skipped during import.",
        "",
        "Columns:",
        "  ProcedureName         (required) Free text. Paired with ModalityType as the natural key.",
        "  ModalityType          (required) Must match an existing modality_type_id (e.g., MR, CT, US).",
        "  RequiredTime          (optional) Scheduled duration in minutes. Integer >= 0. Default 15.",
        "  AnatomicalArea        (optional) Match the anatomical_area_name. Leave blank for none.",
        "  ExamPrepInstructions  (optional) Free text. Quote the value if it contains commas or newlines.",
        "  InstructionsRequired  (optional) true / false / yes / no / 1 / 0. Blank = null.",
        "",
        "Duplicate detection uses (ModalityType, ProcedureName) — case-insensitive.",
    ];

    // ---------- CSV ----------

    public async Task<byte[]> BuildCsvTemplateAsync()
    {
        var sb = new StringBuilder();

        foreach (var line in CsvInstructions)
            sb.Append("# ").Append(line).Append('\n');

        var modalities = await _repository.GetAllModalityTypesAsync();
        if (modalities.Count > 0)
        {
            sb.Append("# Valid ModalityType values: ").Append(string.Join(", ", modalities)).Append('\n');
        }

        var areas = await _repository.GetAnatomicalAreasAsync();
        if (areas.Count > 0)
        {
            sb.Append("# Valid AnatomicalArea values: ").Append(string.Join(", ", areas.Select(a => a.AnatomicalAreaName))).Append('\n');
        }

        sb.Append('\n');
        sb.Append(string.Join(",", HeaderColumns)).Append('\n');
        sb.Append(string.Join(",",
            CsvHelpers.Escape("MRI Brain w/o Contrast"),
            CsvHelpers.Escape("MR"),
            "30",
            CsvHelpers.Escape("Brain"),
            CsvHelpers.Escape("NPO 2 hours before arrival"),
            "false"
        )).Append('\n');

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public byte[] BuildCsvExport(List<StandardProcedure> rows)
    {
        var sb = new StringBuilder();
        sb.Append(string.Join(",", HeaderColumns)).Append('\n');
        foreach (var r in rows)
        {
            sb.Append(string.Join(",",
                CsvHelpers.Escape(r.ProcedureName),
                CsvHelpers.Escape(r.ModalityTypeId),
                r.RequiredTime.ToString(CultureInfo.InvariantCulture),
                CsvHelpers.Escape(r.AnatomicalAreaName),
                CsvHelpers.Escape(r.ExamPrepInstructions),
                r.InstructionsRequired.HasValue ? (r.InstructionsRequired.Value ? "true" : "false") : ""
            )).Append('\n');
        }
        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    // ---------- XLSX ----------

    public async Task<byte[]> BuildXlsxTemplateAsync()
    {
        var modalities = await _repository.GetAllModalityTypesAsync();
        var areas = await _repository.GetAnatomicalAreasAsync();

        using var wb = new XLWorkbook();

        // ---- Procedures sheet ----
        var ws = wb.AddWorksheet("Procedures");
        WriteHeader(ws);

        // Example row
        ws.Cell(2, 1).Value = "MRI Brain w/o Contrast";
        ws.Cell(2, 2).Value = "MR";
        ws.Cell(2, 3).Value = 30;
        ws.Cell(2, 4).Value = "Brain";
        ws.Cell(2, 5).Value = "NPO 2 hours before arrival";
        ws.Cell(2, 6).Value = false;

        ws.SheetView.FreezeRows(1);
        ws.Columns().AdjustToContents(minWidth: 14, maxWidth: 50);
        ws.Column(5).Width = 50;

        // ---- Modalities sheet ----
        var wsMod = wb.AddWorksheet("Modalities");
        wsMod.Cell(1, 1).Value = "ModalityType";
        wsMod.Cell(1, 1).Style.Font.Bold = true;
        for (var i = 0; i < modalities.Count; i++)
            wsMod.Cell(i + 2, 1).Value = modalities[i];
        wsMod.Columns().AdjustToContents(minWidth: 10, maxWidth: 30);

        // ---- AnatomicalAreas sheet ----
        var wsArea = wb.AddWorksheet("AnatomicalAreas");
        wsArea.Cell(1, 1).Value = "AnatomicalArea";
        wsArea.Cell(1, 1).Style.Font.Bold = true;
        for (var i = 0; i < areas.Count; i++)
            wsArea.Cell(i + 2, 1).Value = areas[i].AnatomicalAreaName;
        wsArea.Columns().AdjustToContents(minWidth: 10, maxWidth: 40);

        // Data validation dropdowns (cover 500 rows)
        if (modalities.Count > 0)
        {
            var modRange = $"Modalities!$A$2:$A${modalities.Count + 1}";
            var modValidation = ws.Range("B2:B501").CreateDataValidation();
            modValidation.List(modRange);
            modValidation.ErrorStyle = XLErrorStyle.Warning;
            modValidation.ErrorTitle = "Unknown modality";
            modValidation.ErrorMessage = "ModalityType must match one of the values on the Modalities sheet.";
        }

        if (areas.Count > 0)
        {
            var areaRange = $"AnatomicalAreas!$A$2:$A${areas.Count + 1}";
            var areaValidation = ws.Range("D2:D501").CreateDataValidation();
            areaValidation.List(areaRange);
            areaValidation.ErrorStyle = XLErrorStyle.Warning;
            areaValidation.ErrorTitle = "Unknown anatomical area";
            areaValidation.ErrorMessage = "AnatomicalArea must match a value on the AnatomicalAreas sheet, or be blank.";
        }

        // ---- Instructions sheet ----
        var wsInst = wb.AddWorksheet("Instructions");
        wsInst.Cell(1, 1).Value = "Standard Procedures — Import Template";
        wsInst.Cell(1, 1).Style.Font.Bold = true;
        wsInst.Cell(1, 1).Style.Font.FontSize = 14;

        var row = 3;
        foreach (var line in CsvInstructions.Where(l => !string.IsNullOrEmpty(l) && !l.StartsWith("Standard Procedures import template")))
            wsInst.Cell(row++, 1).Value = line;

        wsInst.Column(1).Width = 110;
        wsInst.SheetView.FreezeRows(1);

        // Put the data-entry sheet first
        ws.SetTabActive();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    public byte[] BuildXlsxExport(List<StandardProcedure> rows)
    {
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Procedures");
        WriteHeader(ws);

        for (var i = 0; i < rows.Count; i++)
        {
            var r = rows[i];
            var excelRow = i + 2;
            ws.Cell(excelRow, 1).Value = r.ProcedureName;
            ws.Cell(excelRow, 2).Value = r.ModalityTypeId;
            ws.Cell(excelRow, 3).Value = r.RequiredTime;
            ws.Cell(excelRow, 4).Value = r.AnatomicalAreaName ?? string.Empty;
            ws.Cell(excelRow, 5).Value = r.ExamPrepInstructions ?? string.Empty;
            if (r.InstructionsRequired.HasValue)
                ws.Cell(excelRow, 6).Value = r.InstructionsRequired.Value;
        }

        ws.SheetView.FreezeRows(1);
        ws.Columns().AdjustToContents(minWidth: 14, maxWidth: 50);
        ws.Column(5).Width = 50;

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    // ---------- XLSX parsing ----------

    /// <summary>
    /// Reads an xlsx upload into the same string-field layout as our CSV parser produces,
    /// so the controller's row-by-row validation can treat both formats uniformly.
    /// The first worksheet is used; columns are matched by header name (case-insensitive).
    /// </summary>
    public static List<string?[]> ParseXlsx(Stream stream)
    {
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheets.First();

        // Build header->column index map from the first non-empty row.
        var usedRange = ws.RangeUsed();
        if (usedRange == null) return new List<string?[]>();

        var firstRow = usedRange.FirstRow();
        var headerIndex = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        for (var c = 1; c <= firstRow.CellCount(); c++)
        {
            var name = firstRow.Cell(c).GetFormattedString()?.Trim();
            if (!string.IsNullOrEmpty(name)) headerIndex[name] = c;
        }

        var results = new List<string?[]>();
        foreach (var dataRow in usedRange.RowsUsed().Skip(1))
        {
            var fields = new string?[HeaderColumns.Length];
            for (var i = 0; i < HeaderColumns.Length; i++)
            {
                if (headerIndex.TryGetValue(HeaderColumns[i], out var col))
                {
                    var cell = dataRow.Cell(col);
                    fields[i] = ReadCellAsString(cell);
                }
            }

            // Skip fully empty rows
            if (fields.All(string.IsNullOrWhiteSpace)) continue;

            results.Add(fields);
        }
        return results;
    }

    private static string? ReadCellAsString(IXLCell cell)
    {
        if (cell.IsEmpty()) return null;
        var type = cell.DataType;
        return type switch
        {
            XLDataType.Boolean => cell.GetValue<bool>() ? "true" : "false",
            XLDataType.Number  => cell.GetValue<double>().ToString("0.############", CultureInfo.InvariantCulture),
            _ => cell.GetFormattedString(),
        };
    }

    private static void WriteHeader(IXLWorksheet ws)
    {
        for (var i = 0; i < HeaderColumns.Length; i++)
        {
            var cell = ws.Cell(1, i + 1);
            cell.Value = HeaderColumns[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.LightGray;
        }
    }
}
