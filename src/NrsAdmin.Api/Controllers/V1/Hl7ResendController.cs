using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Repositories;

namespace NrsAdmin.Api.Controllers.V1;

/// <summary>
/// HL7 message resend operations. Ports the standalone NRS HL7 Resend Tool (WPF) into the web admin.
/// Stages records in public.dft_stage (DFT) or resets ris.reports / order_procedure_steps (MDM)
/// so Mirth/middleware regenerates and transmits the actual HL7 messages.
/// </summary>
[ApiController]
[Route("api/v1/hl7/resend")]
[Authorize]
public class Hl7ResendController : ControllerBase
{
    private readonly Hl7ResendRepository _repository;
    private readonly ILogger<Hl7ResendController> _logger;

    public Hl7ResendController(Hl7ResendRepository repository, ILogger<Hl7ResendController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    private string CurrentUser => User.Identity?.Name ?? "anonymous";

    [HttpPost("procedures/search")]
    public async Task<ActionResult<ApiResponse<List<Hl7ProcedureSearchResult>>>> SearchProcedures(
        [FromBody] Hl7ProcedureSearchRequest request)
    {
        if (request.EndDate < request.StartDate)
            return BadRequest(ApiResponse<List<Hl7ProcedureSearchResult>>.Fail("End date must be on or after start date."));

        var results = await _repository.SearchProceduresAsync(request);
        return Ok(ApiResponse<List<Hl7ProcedureSearchResult>>.Ok(results));
    }

    [HttpPost("dft/status")]
    public async Task<ActionResult<ApiResponse<List<Hl7ResendStatusItem>>>> GetDftStatus(
        [FromBody] Hl7ResendStatusRequest request)
    {
        var statuses = await _repository.GetResendStatusesAsync(request.ProcedureIds);
        return Ok(ApiResponse<List<Hl7ResendStatusItem>>.Ok(statuses));
    }

    [HttpPost("dft")]
    public async Task<ActionResult<ApiResponse<Hl7DftResendResponse>>> ResendDft(
        [FromBody] Hl7DftResendRequest request)
    {
        if (request.ProcedureIds.Count == 0)
            return BadRequest(ApiResponse<Hl7DftResendResponse>.Fail("No procedures selected."));

        // Preflight: the staging table is owned by Mirth, not Novarad. If a site
        // hasn't configured DFT outbound, fail the whole batch fast with a clear message
        // instead of letting every row hit "relation does not exist".
        if (!await _repository.DftStageTableExistsAsync())
        {
            _logger.LogWarning(
                "HL7_DFT_RESEND_BLOCKED_NO_STAGING_TABLE: User={User} Count={Count}",
                CurrentUser, request.ProcedureIds.Count);
            return StatusCode(503, ApiResponse<Hl7DftResendResponse>.Fail(
                "DFT staging table (public.dft_stage) is not configured at this site. " +
                "Contact your integration team — see Documents/dft_stage_reference.sql."));
        }

        _logger.LogInformation(
            "AUDIT HL7_DFT_RESEND_STARTED: User={User} Count={Count} ProcedureIds={ProcedureIds}",
            CurrentUser, request.ProcedureIds.Count, request.ProcedureIds);

        var results = new List<Hl7DftResendItemResult>();
        foreach (var procedureId in request.ProcedureIds)
        {
            try
            {
                var ok = await _repository.StageProcedureForResendAsync(procedureId);
                results.Add(new Hl7DftResendItemResult
                {
                    ProcedureId = procedureId,
                    Success = ok,
                    Status = ok ? "Pending" : "Procedure not found",
                    ErrorMessage = ok ? null : $"Procedure {procedureId} could not be staged."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "HL7_DFT_RESEND_FAILED: User={User} ProcedureId={ProcedureId}", CurrentUser, procedureId);
                results.Add(new Hl7DftResendItemResult
                {
                    ProcedureId = procedureId,
                    Success = false,
                    Status = "Error",
                    ErrorMessage = ex.Message
                });
            }
        }

        var response = new Hl7DftResendResponse
        {
            RequestedCount = request.ProcedureIds.Count,
            SuccessCount = results.Count(r => r.Success),
            FailureCount = results.Count(r => !r.Success),
            Results = results
        };

        _logger.LogInformation(
            "AUDIT HL7_DFT_RESEND_COMPLETED: User={User} Success={Success} Failures={Failures} Count={Count}",
            CurrentUser, response.SuccessCount, response.FailureCount, response.RequestedCount);

        return Ok(ApiResponse<Hl7DftResendResponse>.Ok(response,
            $"Staged {response.SuccessCount} of {response.RequestedCount} procedures for DFT resend."));
    }

    [HttpPost("mdm/by-accession")]
    public async Task<ActionResult<ApiResponse<Hl7MdmResendResponse>>> ResendMdmByAccession(
        [FromBody] Hl7MdmByAccessionRequest request)
    {
        if (request.AccessionNumbers.Count == 0)
            return BadRequest(ApiResponse<Hl7MdmResendResponse>.Fail("Provide at least one accession number."));

        _logger.LogInformation(
            "AUDIT HL7_MDM_RESEND_BY_ACCESSION_STARTED: User={User} InputCount={Count}",
            CurrentUser, request.AccessionNumbers.Count);

        try
        {
            var queued = await _repository.ResendMdmByAccessionAsync(request.AccessionNumbers);

            _logger.LogInformation(
                "AUDIT HL7_MDM_RESEND_BY_ACCESSION_COMPLETED: User={User} Queued={Queued} InputCount={InputCount}",
                CurrentUser, queued, request.AccessionNumbers.Count);

            return Ok(ApiResponse<Hl7MdmResendResponse>.Ok(new Hl7MdmResendResponse
            {
                QueuedCount = queued,
                InputCount = request.AccessionNumbers.Count,
                Message = queued == 0
                    ? "No matching signed reports were found for the provided accessions."
                    : $"{queued} MDM message(s) re-queued for resend."
            }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "HL7_MDM_RESEND_BY_ACCESSION_FAILED: User={User}", CurrentUser);
            return StatusCode(500, ApiResponse<Hl7MdmResendResponse>.Fail($"MDM resend failed: {ex.Message}"));
        }
    }

    [HttpPost("mdm/by-date")]
    public async Task<ActionResult<ApiResponse<Hl7MdmResendResponse>>> ResendMdmByDate(
        [FromBody] Hl7MdmByDateRequest request)
    {
        if (request.EndDateTime <= request.StartDateTime)
            return BadRequest(ApiResponse<Hl7MdmResendResponse>.Fail("End date/time must be after start date/time."));

        _logger.LogInformation(
            "AUDIT HL7_MDM_RESEND_BY_DATE_STARTED: User={User} Start={Start} End={End} PhysicianId={PhysicianId}",
            CurrentUser, request.StartDateTime, request.EndDateTime, request.PhysicianId);

        try
        {
            var queued = await _repository.ResendMdmByDateAsync(
                request.StartDateTime, request.EndDateTime, request.PhysicianId);

            _logger.LogInformation(
                "AUDIT HL7_MDM_RESEND_BY_DATE_COMPLETED: User={User} Queued={Queued}", CurrentUser, queued);

            return Ok(ApiResponse<Hl7MdmResendResponse>.Ok(new Hl7MdmResendResponse
            {
                QueuedCount = queued,
                InputCount = 0,
                Message = queued == 0
                    ? "No matching signed reports were found in that date range."
                    : $"{queued} MDM message(s) re-queued for resend."
            }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "HL7_MDM_RESEND_BY_DATE_FAILED: User={User}", CurrentUser);
            return StatusCode(500, ApiResponse<Hl7MdmResendResponse>.Fail($"MDM resend failed: {ex.Message}"));
        }
    }

    [HttpGet("physicians")]
    public async Task<ActionResult<ApiResponse<List<Hl7Physician>>>> GetPhysicians()
    {
        var physicians = await _repository.GetPhysiciansAsync();
        return Ok(ApiResponse<List<Hl7Physician>>.Ok(physicians));
    }
}
