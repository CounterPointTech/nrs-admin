using System.Text;
using Dapper;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;

namespace NrsAdmin.Api.Repositories;

public class RisRepository : BaseRepository
{
    private readonly StudyRepository _studyRepository;

    public RisRepository(IOptionsMonitor<DatabaseSettings> settings, StudyRepository studyRepository)
        : base(settings)
    {
        _studyRepository = studyRepository;
    }

    /// <summary>
    /// Find RIS orders linked to a PACS study via accession number and/or study UID.
    /// </summary>
    public async Task<List<RisOrder>> GetLinkedOrdersAsync(string? accession, string? studyUid)
    {
        var orderIds = new HashSet<long>();
        var orders = new List<RisOrder>();

        await using var connection = await CreateConnectionAsync();

        // Link via accession number
        if (!string.IsNullOrWhiteSpace(accession))
        {
            const string byAccession = """
                SELECT o.order_id AS OrderId, o.patient_id AS PatientId, o.site_code AS SiteCode,
                       o.status AS Status, o.accession_number AS AccessionNumber,
                       o.description AS Description, o.patient_complaint AS PatientComplaint,
                       o.physician_reason AS PhysicianReason, o.notes AS Notes,
                       o.referring_physician_id AS ReferringPhysicianId,
                       CONCAT_WS(' ', rp.first_name, rp.last_name) AS ReferringPhysicianName,
                       o.consulting_physicians AS ConsultingPhysicians,
                       o.patient_weight AS PatientWeight, o.creation_date AS CreationDate,
                       o.custom_field_1 AS CustomField1, o.custom_field_2 AS CustomField2,
                       o.custom_field_3 AS CustomField3, o.custom_field_4 AS CustomField4,
                       si.description AS SiteName
                FROM ris.orders o
                LEFT JOIN ris.physicians ph ON o.referring_physician_id = ph.physician_id
                LEFT JOIN ris.people rp ON ph.person_id = rp.person_id
                LEFT JOIN shared.sites si ON o.site_code = si.site_code
                WHERE o.accession_number = @Accession
                """;

            var accessionOrders = await connection.QueryAsync<RisOrder>(byAccession, new { Accession = accession });
            foreach (var order in accessionOrders)
            {
                if (orderIds.Add(order.OrderId))
                    orders.Add(order);
            }
        }

        // Link via study UID through order_procedures
        if (!string.IsNullOrWhiteSpace(studyUid))
        {
            const string byStudyUid = """
                SELECT o.order_id AS OrderId, o.patient_id AS PatientId, o.site_code AS SiteCode,
                       o.status AS Status, o.accession_number AS AccessionNumber,
                       o.description AS Description, o.patient_complaint AS PatientComplaint,
                       o.physician_reason AS PhysicianReason, o.notes AS Notes,
                       o.referring_physician_id AS ReferringPhysicianId,
                       CONCAT_WS(' ', rp.first_name, rp.last_name) AS ReferringPhysicianName,
                       o.consulting_physicians AS ConsultingPhysicians,
                       o.patient_weight AS PatientWeight, o.creation_date AS CreationDate,
                       o.custom_field_1 AS CustomField1, o.custom_field_2 AS CustomField2,
                       o.custom_field_3 AS CustomField3, o.custom_field_4 AS CustomField4,
                       si.description AS SiteName
                FROM ris.order_procedures op
                JOIN ris.orders o ON op.order_id = o.order_id
                LEFT JOIN ris.physicians ph ON o.referring_physician_id = ph.physician_id
                LEFT JOIN ris.people rp ON ph.person_id = rp.person_id
                LEFT JOIN shared.sites si ON o.site_code = si.site_code
                WHERE op.study_uid = @StudyUid
                """;

            var uidOrders = await connection.QueryAsync<RisOrder>(byStudyUid, new { StudyUid = studyUid });
            foreach (var order in uidOrders)
            {
                if (orderIds.Add(order.OrderId))
                    orders.Add(order);
            }
        }

        return orders;
    }

    /// <summary>
    /// Get all procedures for a RIS order.
    /// </summary>
    public async Task<List<RisOrderProcedure>> GetOrderProceduresAsync(long orderId)
    {
        const string sql = """
            SELECT op.procedure_id AS ProcedureId, op.order_id AS OrderId,
                   op.study_uid AS StudyUid, op.status AS Status,
                   op.procedure_name AS ProcedureName,
                   op.modality_id AS ModalityId, m.name AS ModalityName,
                   m.modality_type_id AS ModalityType,
                   op.assigned_physician_id AS AssignedPhysicianId,
                   CONCAT_WS(' ', ap.first_name, ap.last_name) AS AssignedPhysicianName,
                   op.stat_flag AS StatFlag, op.notes AS Notes,
                   op.scheduler_notes AS SchedulerNotes,
                   op.patient_class AS PatientClass, op.patient_location AS PatientLocation,
                   op.visit_number AS VisitNumber,
                   op.procedure_date_start AS ProcedureDateStart,
                   op.procedure_date_end AS ProcedureDateEnd,
                   op.check_in_time AS CheckInTime,
                   op.creation_date AS CreationDate, op.modified_date AS ModifiedDate,
                   op.custom_field_1 AS CustomField1, op.custom_field_2 AS CustomField2,
                   op.custom_field_3 AS CustomField3
            FROM ris.order_procedures op
            LEFT JOIN ris.modalities m ON op.modality_id = m.modality_id
            LEFT JOIN ris.physicians aph ON op.assigned_physician_id = aph.physician_id
            LEFT JOIN ris.people ap ON aph.person_id = ap.person_id
            WHERE op.order_id = @OrderId
            ORDER BY op.procedure_id
            """;

        await using var connection = await CreateConnectionAsync();
        var procedures = (await connection.QueryAsync<RisOrderProcedure>(sql, new { OrderId = orderId })).ToList();

        // Load steps for each procedure
        foreach (var proc in procedures)
        {
            proc.Steps = await GetProcedureStepsAsync(connection, proc.ProcedureId);
        }

        return procedures;
    }

    /// <summary>
    /// Get procedure steps for a given procedure.
    /// </summary>
    public async Task<List<RisProcedureStep>> GetProcedureStepsAsync(long procedureId)
    {
        await using var connection = await CreateConnectionAsync();
        return await GetProcedureStepsAsync(connection, procedureId);
    }

    private static async Task<List<RisProcedureStep>> GetProcedureStepsAsync(
        System.Data.IDbConnection connection, long procedureId)
    {
        const string sql = """
            SELECT procedure_id AS ProcedureId, step_number AS StepNumber,
                   status AS Status, description AS Description,
                   completion_date AS CompletionDate,
                   completed_by_user_id AS CompletedByUserId,
                   is_disabled AS IsDisabled
            FROM ris.order_procedure_steps
            WHERE procedure_id = @ProcedureId
            ORDER BY step_number
            """;

        var steps = await connection.QueryAsync<RisProcedureStep>(sql, new { ProcedureId = procedureId });
        return steps.ToList();
    }

    /// <summary>
    /// Get reports for a given procedure.
    /// </summary>
    public async Task<List<RisReport>> GetReportsAsync(long procedureId)
    {
        const string sql = """
            SELECT r.report_id AS ReportId, r.procedure_id AS ProcedureId,
                   r.report_type AS ReportType, r.status AS Status,
                   r.report_text AS ReportText, r.report_format AS ReportFormat,
                   r.requires_correction AS RequiresCorrection,
                   r.signed_date AS SignedDate, r.transcribed_date AS TranscribedDate,
                   r.signing_physician_id AS SigningPhysicianId,
                   CONCAT_WS(' ', sp.first_name, sp.last_name) AS SigningPhysicianName,
                   r.reporting_physician_id AS ReportingPhysicianId,
                   CONCAT_WS(' ', rpp.first_name, rpp.last_name) AS ReportingPhysicianName,
                   r.creation_date AS CreationDate, r.notes AS Notes,
                   r.custom_field_1 AS CustomField1, r.custom_field_2 AS CustomField2,
                   r.custom_field_3 AS CustomField3
            FROM ris.reports r
            LEFT JOIN ris.physicians sph ON r.signing_physician_id = sph.physician_id
            LEFT JOIN ris.people sp ON sph.person_id = sp.person_id
            LEFT JOIN ris.physicians rph ON r.reporting_physician_id = rph.physician_id
            LEFT JOIN ris.people rpp ON rph.person_id = rpp.person_id
            WHERE r.procedure_id = @ProcedureId
            ORDER BY r.creation_date DESC
            """;

        await using var connection = await CreateConnectionAsync();
        var reports = await connection.QueryAsync<RisReport>(sql, new { ProcedureId = procedureId });
        return reports.ToList();
    }

    /// <summary>
    /// Get RIS patient demographics by patient ID and site code.
    /// </summary>
    public async Task<RisPatientDemographics?> GetRisPatientAsync(string patientId, string? siteCode)
    {
        const string sql = """
            SELECT p.patient_id AS PatientId, p.site_code AS SiteCode,
                   p.person_id AS PersonId,
                   pe.first_name AS FirstName, pe.last_name AS LastName,
                   pe.middle_initial AS MiddleInitial,
                   pe.date_of_birth AS DateOfBirth, pe.sex AS Sex,
                   pe.address_1 AS Address1, pe.address_2 AS Address2,
                   pe.city AS City, pe.state AS State, pe.zip AS Zip,
                   pe.home_phone AS HomePhone, pe.work_phone AS WorkPhone,
                   pe.mobile_phone AS MobilePhone, pe.email AS Email,
                   p.health_number AS HealthNumber, p.notes AS Notes,
                   p.emergency_contact AS EmergencyContact,
                   p.emergency_contact_phone AS EmergencyContactPhone,
                   p.custom_field_1 AS CustomField1, p.custom_field_2 AS CustomField2,
                   p.custom_field_3 AS CustomField3
            FROM ris.patients p
            JOIN ris.people pe ON p.person_id = pe.person_id
            WHERE p.patient_id = @PatientId
            ORDER BY p.site_code
            LIMIT 1
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QueryFirstOrDefaultAsync<RisPatientDemographics>(
            sql, new { PatientId = patientId });
    }

    /// <summary>
    /// Build the full unified study detail with PACS + RIS data and patient comparison.
    /// </summary>
    public async Task<UnifiedStudyDetail?> GetUnifiedStudyDetailAsync(long pacsStudyId)
    {
        // Get PACS study
        var study = await _studyRepository.GetByIdAsync(pacsStudyId);
        if (study is null) return null;

        var result = new UnifiedStudyDetail { Study = study };

        // Find linked RIS orders
        var orders = await GetLinkedOrdersAsync(study.Accession, study.StudyUid);
        result.Orders = orders;

        // Determine link method
        var linkedViaAccession = orders.Any(o =>
            !string.IsNullOrWhiteSpace(o.AccessionNumber) &&
            string.Equals(o.AccessionNumber, study.Accession, StringComparison.OrdinalIgnoreCase));
        var linkedViaStudyUid = false;

        // Load procedures and reports for each order
        var allProcedures = new List<RisOrderProcedure>();
        var allReports = new List<RisReport>();

        foreach (var order in orders)
        {
            var procedures = await GetOrderProceduresAsync(order.OrderId);
            allProcedures.AddRange(procedures);

            foreach (var proc in procedures)
            {
                if (!string.IsNullOrWhiteSpace(proc.StudyUid) &&
                    string.Equals(proc.StudyUid, study.StudyUid, StringComparison.OrdinalIgnoreCase))
                {
                    linkedViaStudyUid = true;
                }

                var reports = await GetReportsAsync(proc.ProcedureId);
                allReports.AddRange(reports);
            }
        }

        result.Procedures = allProcedures;
        result.Reports = allReports;

        // Determine link status
        result.Link = new StudyRisLink
        {
            LinkMethod = (linkedViaAccession, linkedViaStudyUid) switch
            {
                (true, true) => LinkMethod.Both,
                (true, false) => LinkMethod.Accession,
                (false, true) => LinkMethod.StudyUid,
                _ => LinkMethod.None
            },
            OrderId = orders.FirstOrDefault()?.OrderId,
            AccessionNumber = study.Accession,
            StudyUid = study.StudyUid
        };

        // Find RIS patient by matching patient ID
        RisPatientDemographics? risPatient = null;

        // First try via linked orders (they have patient_id + site_code)
        var firstOrder = orders.FirstOrDefault();
        if (firstOrder is not null)
        {
            risPatient = await GetRisPatientAsync(firstOrder.PatientId, firstOrder.SiteCode);
        }

        // Fallback: try matching by PACS patient_id
        if (risPatient is null && !string.IsNullOrWhiteSpace(study.PatientId))
        {
            risPatient = await GetRisPatientAsync(study.PatientId, null);
        }

        result.RisPatient = risPatient;

        // Build patient comparison
        result.PatientComparison = BuildPatientComparison(study, risPatient);

        // Build order comparison (PACS study fields vs RIS order/procedure fields)
        result.OrderComparison = BuildOrderComparison(study, orders, allProcedures);

        return result;
    }

    private static PatientComparison BuildPatientComparison(StudyDetail study, RisPatientDemographics? risPatient)
    {
        var comparison = new PatientComparison
        {
            PacsPatientId = study.PatientId,
            PacsFirstName = study.FirstName,
            PacsLastName = study.LastName,
            PacsMiddleName = study.MiddleName,
            PacsGender = study.Gender,
            PacsBirthTime = study.BirthTime,
        };

        if (risPatient is null) return comparison;

        comparison.RisPatientId = risPatient.PatientId;
        comparison.RisFirstName = risPatient.FirstName;
        comparison.RisLastName = risPatient.LastName;
        comparison.RisMiddleInitial = risPatient.MiddleInitial;
        comparison.RisSex = risPatient.Sex;
        comparison.RisDateOfBirth = risPatient.DateOfBirth;

        // Detect discrepancies
        var discrepancies = new List<DiscrepancyField>();

        CompareField(discrepancies, "Patient ID", study.PatientId, risPatient.PatientId);
        CompareField(discrepancies, "First Name", study.FirstName, risPatient.FirstName);
        CompareField(discrepancies, "Last Name", study.LastName, risPatient.LastName);
        CompareField(discrepancies, "Middle Name", study.MiddleName, risPatient.MiddleInitial);
        CompareField(discrepancies, "Gender", study.Gender, risPatient.Sex);
        CompareDateField(discrepancies, "Date of Birth", study.BirthTime, risPatient.DateOfBirth);

        comparison.Discrepancies = discrepancies;
        return comparison;
    }

    private static void CompareField(List<DiscrepancyField> list, string fieldName, string? pacsValue, string? risValue)
    {
        var pNorm = (pacsValue ?? "").Trim();
        var rNorm = (risValue ?? "").Trim();

        if (!string.Equals(pNorm, rNorm, StringComparison.OrdinalIgnoreCase))
        {
            list.Add(new DiscrepancyField
            {
                FieldName = fieldName,
                PacsValue = string.IsNullOrEmpty(pNorm) ? null : pNorm,
                RisValue = string.IsNullOrEmpty(rNorm) ? null : rNorm
            });
        }
    }

    private static void CompareDateField(List<DiscrepancyField> list, string fieldName,
        DateTime? pacsDate, DateTime? risDate)
    {
        // Compare dates by date-only (ignore time components)
        if (pacsDate?.Date != risDate?.Date)
        {
            list.Add(new DiscrepancyField
            {
                FieldName = fieldName,
                PacsValue = pacsDate?.ToString("yyyy-MM-dd"),
                RisValue = risDate?.ToString("yyyy-MM-dd")
            });
        }
    }

    private static OrderComparison BuildOrderComparison(
        StudyDetail study, List<RisOrder> orders, List<RisOrderProcedure> procedures)
    {
        var firstOrder = orders.FirstOrDefault();
        var firstProcedure = procedures.FirstOrDefault();

        var comparison = new OrderComparison
        {
            PacsAccession = study.Accession,
            PacsStudyUid = study.StudyUid,
            PacsStudyDate = study.StudyDate.ToString("yyyy-MM-dd"),
            PacsModality = study.Modality,
            PacsStudyDescription = study.AnatomicalArea,
            PacsFacility = study.FacilityName,

            RisAccession = firstOrder?.AccessionNumber,
            RisStudyUid = firstProcedure?.StudyUid,
            RisProcedureDate = firstProcedure?.ProcedureDateStart?.ToString("yyyy-MM-dd"),
            RisModality = firstProcedure?.ModalityType,
            RisDescription = firstOrder?.Description,
            RisFacility = firstOrder?.SiteName,
        };

        var discrepancies = new List<DiscrepancyField>();
        // Linking fields — matchers Novarad uses to correlate PACS ↔ RIS.
        CompareField(discrepancies, "Accession", comparison.PacsAccession, comparison.RisAccession);
        CompareField(discrepancies, "Study UID", comparison.PacsStudyUid, comparison.RisStudyUid);
        CompareField(discrepancies, "Study Date", comparison.PacsStudyDate, comparison.RisProcedureDate);
        CompareField(discrepancies, "Modality", comparison.PacsModality, comparison.RisModality);
        // Descriptive fields — informational, not used for matching.
        CompareField(discrepancies, "Study Description", comparison.PacsStudyDescription, comparison.RisDescription);
        CompareField(discrepancies, "Facility", comparison.PacsFacility, comparison.RisFacility);
        comparison.Discrepancies = discrepancies;

        return comparison;
    }

    // ================================================================
    // Write Operations
    // ================================================================

    /// <summary>
    /// Update RIS patient details (ris.people + ris.patients) by patient ID.
    /// </summary>
    public async Task<bool> UpdatePatientDetailsAsync(string patientId, UpdateRisPatientDetailsRequest request)
    {
        await using var connection = await CreateConnectionAsync();

        // Get the person_id for this patient
        var personId = await connection.ExecuteScalarAsync<long?>(
            "SELECT person_id FROM ris.patients WHERE patient_id = @PatientId LIMIT 1",
            new { PatientId = patientId });
        if (personId is null) return false;

        // Update ris.people
        var peopleClauses = new List<string>();
        var peopleParams = new DynamicParameters();
        peopleParams.Add("PersonId", personId.Value);

        if (request.Address1 is not null) { peopleClauses.Add("address_1 = @Address1"); peopleParams.Add("Address1", request.Address1); }
        if (request.Address2 is not null) { peopleClauses.Add("address_2 = @Address2"); peopleParams.Add("Address2", request.Address2); }
        if (request.City is not null) { peopleClauses.Add("city = @City"); peopleParams.Add("City", request.City); }
        if (request.State is not null) { peopleClauses.Add("state = @State"); peopleParams.Add("State", request.State); }
        if (request.Zip is not null) { peopleClauses.Add("zip = @Zip"); peopleParams.Add("Zip", request.Zip); }
        if (request.HomePhone is not null) { peopleClauses.Add("home_phone = @HomePhone"); peopleParams.Add("HomePhone", request.HomePhone); }
        if (request.WorkPhone is not null) { peopleClauses.Add("work_phone = @WorkPhone"); peopleParams.Add("WorkPhone", request.WorkPhone); }
        if (request.MobilePhone is not null) { peopleClauses.Add("mobile_phone = @MobilePhone"); peopleParams.Add("MobilePhone", request.MobilePhone); }
        if (request.Email is not null) { peopleClauses.Add("email = @Email"); peopleParams.Add("Email", request.Email); }

        if (peopleClauses.Count > 0)
        {
            var peopleSql = $"UPDATE ris.people SET {string.Join(", ", peopleClauses)} WHERE person_id = @PersonId";
            await connection.ExecuteAsync(peopleSql, peopleParams);
        }

        // Update ris.patients
        var patientClauses = new List<string>();
        var patientParams = new DynamicParameters();
        patientParams.Add("PatientId", patientId);

        if (request.HealthNumber is not null) { patientClauses.Add("health_number = @HealthNumber"); patientParams.Add("HealthNumber", request.HealthNumber); }
        if (request.EmergencyContact is not null) { patientClauses.Add("emergency_contact = @EmergencyContact"); patientParams.Add("EmergencyContact", request.EmergencyContact); }
        if (request.EmergencyContactPhone is not null) { patientClauses.Add("emergency_contact_phone = @EmergencyContactPhone"); patientParams.Add("EmergencyContactPhone", request.EmergencyContactPhone); }
        if (request.Notes is not null) { patientClauses.Add("notes = @Notes"); patientParams.Add("Notes", request.Notes); }

        if (patientClauses.Count > 0)
        {
            var patientSql = $"UPDATE ris.patients SET {string.Join(", ", patientClauses)} WHERE patient_id = @PatientId";
            await connection.ExecuteAsync(patientSql, patientParams);
        }

        return peopleClauses.Count > 0 || patientClauses.Count > 0;
    }

    /// <summary>
    /// Update editable fields on a RIS report.
    /// </summary>
    public async Task<bool> UpdateReportAsync(long reportId, UpdateRisReportRequest request)
    {
        var setClauses = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("ReportId", reportId);

        if (request.ReportText is not null) { setClauses.Add("report_text = @ReportText"); parameters.Add("ReportText", request.ReportText); }
        if (request.ReportFormat is not null) { setClauses.Add("report_format = @ReportFormat"); parameters.Add("ReportFormat", request.ReportFormat); }
        if (request.Notes is not null) { setClauses.Add("notes = @Notes"); parameters.Add("Notes", request.Notes); }
        if (request.Status is not null) { setClauses.Add("status = @Status"); parameters.Add("Status", request.Status); }
        if (request.ReportType is not null) { setClauses.Add("report_type = @ReportType"); parameters.Add("ReportType", request.ReportType); }
        if (request.RequiresCorrection.HasValue) { setClauses.Add("requires_correction = @RequiresCorrection"); parameters.Add("RequiresCorrection", request.RequiresCorrection.Value); }
        if (request.CustomField1 is not null) { setClauses.Add("custom_field_1 = @CustomField1"); parameters.Add("CustomField1", request.CustomField1); }
        if (request.CustomField2 is not null) { setClauses.Add("custom_field_2 = @CustomField2"); parameters.Add("CustomField2", request.CustomField2); }
        if (request.CustomField3 is not null) { setClauses.Add("custom_field_3 = @CustomField3"); parameters.Add("CustomField3", request.CustomField3); }

        if (setClauses.Count == 0) return false;

        var sql = $"UPDATE ris.reports SET {string.Join(", ", setClauses)} WHERE report_id = @ReportId";

        await using var connection = await CreateConnectionAsync();
        return await connection.ExecuteAsync(sql, parameters) > 0;
    }

    /// <summary>
    /// Push the current RIS report body into PACS so PacsViewer shows the latest text.
    ///
    /// Mirrors what Novarad's RIS Processor <c>ReportFinalizer</c> does on a status→Finalized
    /// transition (see Documents/Novarad Analysis/Documents/subsystems/ris/ris-processor.md):
    ///   1. Insert a fresh row into <c>pacs.preliminary_report_map</c> (newest row wins in
    ///      <c>vw_patient_studies_facilities.preliminary_result</c>).
    ///   2. Flip <c>pacs.studies.has_report = true</c>.
    ///   3. Set <c>pacs.studies.procedure_status = 7</c> (Report_Finalized enum).
    ///
    /// Skips side effects we don't want to re-fire on a manual refresh: PDF rendition,
    /// HL7 ORU outbound, fax/email/SMS distribution. This is a PACS-visibility refresh only.
    ///
    /// Guards:
    /// - Report status must be Signed or Finalized (case-insensitive) — we won't push drafts.
    /// - Must be able to resolve the linked PACS study via the order's accession_number.
    /// </summary>
    public async Task<(bool Success, string? ErrorMessage)> RefinalizeReportAsync(long reportId, int triggeringUserId)
    {
        const string loadSql = """
            SELECT r.report_id        AS ReportId,
                   r.procedure_id     AS ProcedureId,
                   r.report_type      AS ReportType,
                   r.status           AS Status,
                   r.report_text      AS ReportText,
                   r.notes            AS Notes,
                   r.signing_physician_id   AS SigningPhysicianId,
                   r.reporting_physician_id AS ReportingPhysicianId,
                   o.order_id         AS OrderId,
                   o.accession_number AS AccessionNumber,
                   s.id               AS PacsStudyId,
                   s.study_uid        AS StudyUid,
                   s.accession        AS PacsAccession,
                   p.patient_id       AS PacsPatientId,
                   p.patient_group    AS PacsPatientGroup,
                   sp.user_id         AS SigningUserId
            FROM ris.reports r
            JOIN ris.order_procedures op ON r.procedure_id = op.procedure_id
            JOIN ris.orders o            ON op.order_id     = o.order_id
            LEFT JOIN pacs.studies s     ON s.accession     = o.accession_number
            LEFT JOIN pacs.patients p    ON s.patient       = p.id
            LEFT JOIN ris.physicians sp  ON r.signing_physician_id = sp.physician_id
            WHERE r.report_id = @ReportId
            LIMIT 1
            """;

        await using var connection = await CreateConnectionAsync();
        var row = await connection.QuerySingleOrDefaultAsync<dynamic>(loadSql, new { ReportId = reportId });

        if (row is null)
            return (false, $"Report {reportId} not found.");

        string? status = row.status;
        if (string.IsNullOrWhiteSpace(status) ||
            !(string.Equals(status, "Signed",    StringComparison.OrdinalIgnoreCase) ||
              string.Equals(status, "Finalized", StringComparison.OrdinalIgnoreCase)))
        {
            return (false, $"Only Signed/Finalized reports can be refinalized (this report is '{status ?? "(null)"}').");
        }

        string? studyUid       = row.studyuid;
        string? patientId      = row.pacspatientid;
        string? patientGroup   = row.pacspatientgroup;
        string? accession      = row.pacsaccession;
        string? reportText     = row.reporttext;
        string? notes          = row.notes;
        long?   signingUserId  = row.signinguserid;

        if (string.IsNullOrWhiteSpace(studyUid) ||
            string.IsNullOrWhiteSpace(patientId) ||
            string.IsNullOrWhiteSpace(patientGroup))
        {
            return (false, "This report's order is not linked to a PACS study (no matching accession in pacs.studies). Link the study to a RIS order first.");
        }

        // preliminary_report_map.physician_id references shared.users.user_id, not ris.physicians.
        // Prefer the signing physician's mapped user; fall back to the user performing the refresh.
        var physicianUserId = signingUserId.HasValue && signingUserId.Value > 0
            ? signingUserId.Value
            : (long)triggeringUserId;

        await using var tx = await connection.BeginTransactionAsync();
        try
        {
            const string insertPrm = """
                INSERT INTO pacs.preliminary_report_map
                    (study_uid, patient_group, patient_id, physician_id, created_on_date, comments, result)
                VALUES
                    (@StudyUid, @PatientGroup, @PatientId, @PhysicianId, timezone('UTC'::text, now()),
                     COALESCE(@Comments, ''), COALESCE(@ReportText, ''))
                """;

            await connection.ExecuteAsync(insertPrm, new
            {
                StudyUid     = studyUid,
                PatientGroup = patientGroup,
                PatientId    = patientId,
                PhysicianId  = physicianUserId,
                Comments     = notes ?? string.Empty,
                ReportText   = reportText ?? string.Empty,
            }, tx);

            await connection.ExecuteAsync(
                "SELECT pacs.studies_update_report_availability(@PatientId, @PatientGroup, @StudyUid, @Accession, true)",
                new { PatientId = patientId, PatientGroup = patientGroup, StudyUid = studyUid, Accession = accession ?? string.Empty },
                tx);

            // procedure_status = 7 (Report_Finalized) per Novarad enum mapping —
            // see Documents/Novarad Analysis/Documents/subsystems/ris/ris-processor.md.
            await connection.ExecuteAsync(
                "SELECT pacs.studies_update_procedure_status(@StudyUid, 7::smallint)",
                new { StudyUid = studyUid },
                tx);

            await tx.CommitAsync();
            return (true, null);
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    /// <summary>
    /// Create a new report on a RIS procedure.
    /// </summary>
    public async Task<long> CreateReportAsync(CreateRisReportRequest request)
    {
        const string sql = """
            INSERT INTO ris.reports (procedure_id, report_type, status, report_text, report_format, notes, creation_date)
            VALUES (@ProcedureId, @ReportType, @Status, @ReportText, @ReportFormat, @Notes, NOW())
            RETURNING report_id
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.ExecuteScalarAsync<long>(sql, new
        {
            request.ProcedureId,
            request.ReportType,
            Status = request.Status ?? "Draft",
            request.ReportText,
            ReportFormat = request.ReportFormat ?? "text",
            request.Notes
        });
    }

    /// <summary>
    /// Update editable fields on a RIS order.
    /// </summary>
    public async Task<bool> UpdateOrderAsync(long orderId, UpdateRisOrderRequest request)
    {
        var setClauses = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("OrderId", orderId);

        if (request.Description is not null) { setClauses.Add("description = @Description"); parameters.Add("Description", request.Description); }
        if (request.Notes is not null) { setClauses.Add("notes = @Notes"); parameters.Add("Notes", request.Notes); }
        if (request.PatientComplaint is not null) { setClauses.Add("patient_complaint = @PatientComplaint"); parameters.Add("PatientComplaint", request.PatientComplaint); }
        if (request.PhysicianReason is not null) { setClauses.Add("physician_reason = @PhysicianReason"); parameters.Add("PhysicianReason", request.PhysicianReason); }
        if (request.CustomField1 is not null) { setClauses.Add("custom_field_1 = @CustomField1"); parameters.Add("CustomField1", request.CustomField1); }
        if (request.CustomField2 is not null) { setClauses.Add("custom_field_2 = @CustomField2"); parameters.Add("CustomField2", request.CustomField2); }
        if (request.CustomField3 is not null) { setClauses.Add("custom_field_3 = @CustomField3"); parameters.Add("CustomField3", request.CustomField3); }
        if (request.CustomField4 is not null) { setClauses.Add("custom_field_4 = @CustomField4"); parameters.Add("CustomField4", request.CustomField4); }
        if (request.SiteCode is not null) { setClauses.Add("site_code = @SiteCode"); parameters.Add("SiteCode", request.SiteCode); }

        if (setClauses.Count == 0) return false;

        var sql = $"UPDATE ris.orders SET {string.Join(", ", setClauses)} WHERE order_id = @OrderId";

        await using var connection = await CreateConnectionAsync();
        return await connection.ExecuteAsync(sql, parameters) > 0;
    }

    /// <summary>
    /// Update editable fields on a RIS order procedure.
    /// </summary>
    public async Task<bool> UpdateOrderProcedureAsync(long procedureId, UpdateRisOrderProcedureRequest request)
    {
        var setClauses = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("ProcedureId", procedureId);

        if (request.Notes is not null) { setClauses.Add("notes = @Notes"); parameters.Add("Notes", request.Notes); }
        if (request.SchedulerNotes is not null) { setClauses.Add("scheduler_notes = @SchedulerNotes"); parameters.Add("SchedulerNotes", request.SchedulerNotes); }
        if (request.CustomField1 is not null) { setClauses.Add("custom_field_1 = @CustomField1"); parameters.Add("CustomField1", request.CustomField1); }
        if (request.CustomField2 is not null) { setClauses.Add("custom_field_2 = @CustomField2"); parameters.Add("CustomField2", request.CustomField2); }
        if (request.CustomField3 is not null) { setClauses.Add("custom_field_3 = @CustomField3"); parameters.Add("CustomField3", request.CustomField3); }
        if (request.AssignedPhysicianId is not null) { setClauses.Add("assigned_physician_id = @AssignedPhysicianId"); parameters.Add("AssignedPhysicianId", request.AssignedPhysicianId); }
        if (request.PatientClass is not null) { setClauses.Add("patient_class = @PatientClass"); parameters.Add("PatientClass", request.PatientClass); }
        if (request.PatientLocation is not null) { setClauses.Add("patient_location = @PatientLocation"); parameters.Add("PatientLocation", request.PatientLocation); }
        if (request.VisitNumber is not null) { setClauses.Add("visit_number = @VisitNumber"); parameters.Add("VisitNumber", request.VisitNumber); }
        if (request.CheckInTime is not null) { setClauses.Add("check_in_time = @CheckInTime"); parameters.Add("CheckInTime", request.CheckInTime); }
        if (request.ProcedureDateStart is not null) { setClauses.Add("procedure_date_start = @ProcedureDateStart"); parameters.Add("ProcedureDateStart", request.ProcedureDateStart); }
        if (request.ProcedureDateEnd is not null) { setClauses.Add("procedure_date_end = @ProcedureDateEnd"); parameters.Add("ProcedureDateEnd", request.ProcedureDateEnd); }
        if (request.StatFlag is not null) { setClauses.Add("stat_flag = @StatFlag"); parameters.Add("StatFlag", request.StatFlag); }

        if (setClauses.Count == 0) return false;

        setClauses.Add("modified_date = NOW()");

        var sql = $"UPDATE ris.order_procedures SET {string.Join(", ", setClauses)} WHERE procedure_id = @ProcedureId";

        await using var connection = await CreateConnectionAsync();
        return await connection.ExecuteAsync(sql, parameters) > 0;
    }

    /// <summary>
    /// Search RIS orders for manual linking.
    /// </summary>
    public async Task<PagedResponse<RisOrder>> SearchOrdersForLinkingAsync(SearchRisOrdersRequest request)
    {
        var where = new StringBuilder();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(request.AccessionNumber))
        {
            where.Append(" AND o.accession_number ILIKE @Accession");
            parameters.Add("Accession", $"%{request.AccessionNumber}%");
        }
        if (!string.IsNullOrWhiteSpace(request.PatientId))
        {
            where.Append(" AND o.patient_id ILIKE @PatientId");
            parameters.Add("PatientId", $"{request.PatientId}%");
        }
        if (!string.IsNullOrWhiteSpace(request.PatientName))
        {
            where.Append(" AND (rp.last_name ILIKE @PatientName OR rp.first_name ILIKE @PatientName)");
            parameters.Add("PatientName", $"%{request.PatientName}%");
        }
        if (request.DateFrom.HasValue)
        {
            where.Append(" AND o.creation_date >= @DateFrom");
            parameters.Add("DateFrom", request.DateFrom.Value.Date);
        }
        if (request.DateTo.HasValue)
        {
            where.Append(" AND o.creation_date < @DateTo");
            parameters.Add("DateTo", request.DateTo.Value.Date.AddDays(1));
        }

        var whereClause = where.ToString();

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 50);
        var offset = (page - 1) * pageSize;
        parameters.Add("Limit", pageSize);
        parameters.Add("Offset", offset);

        var countSql = $"""
            SELECT COUNT(*)
            FROM ris.orders o
            LEFT JOIN ris.patients rpt ON o.patient_id = rpt.patient_id AND o.site_code = rpt.site_code
            LEFT JOIN ris.people rp ON rpt.person_id = rp.person_id
            WHERE 1=1 {whereClause}
            """;

        var dataSql = $"""
            SELECT o.order_id AS OrderId, o.patient_id AS PatientId, o.site_code AS SiteCode,
                   o.status AS Status, o.accession_number AS AccessionNumber,
                   o.description AS Description, o.notes AS Notes,
                   o.creation_date AS CreationDate,
                   CONCAT_WS(' ', rp.first_name, rp.last_name) AS ReferringPhysicianName
            FROM ris.orders o
            LEFT JOIN ris.patients rpt ON o.patient_id = rpt.patient_id AND o.site_code = rpt.site_code
            LEFT JOIN ris.people rp ON rpt.person_id = rp.person_id
            LEFT JOIN ris.physicians ph ON o.referring_physician_id = ph.physician_id
            WHERE 1=1 {whereClause}
            ORDER BY o.creation_date DESC
            LIMIT @Limit OFFSET @Offset
            """;

        await using var connection = await CreateConnectionAsync();
        var totalCount = await connection.ExecuteScalarAsync<int>(countSql, parameters);
        var items = (await connection.QueryAsync<RisOrder>(dataSql, parameters)).ToList();

        return new PagedResponse<RisOrder>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    /// <summary>
    /// Link a PACS study to a RIS order by syncing accession number and study UID.
    /// </summary>
    public async Task<bool> LinkStudyToOrderAsync(long pacsStudyId, long orderId)
    {
        var study = await _studyRepository.GetByIdAsync(pacsStudyId);
        if (study is null) return false;

        await using var connection = await CreateConnectionAsync();
        await using var tx = await connection.BeginTransactionAsync();

        try
        {
            // Get the order's accession number
            var accession = await connection.ExecuteScalarAsync<string?>(
                "SELECT accession_number FROM ris.orders WHERE order_id = @OrderId",
                new { OrderId = orderId }, tx);

            if (string.IsNullOrWhiteSpace(accession)) return false;

            // Update PACS study with the order's accession
            await connection.ExecuteAsync(
                "UPDATE pacs.studies SET accession = @Accession, modified_date = NOW() WHERE id = @StudyId",
                new { Accession = accession, StudyId = pacsStudyId }, tx);

            // Link the first unlinked procedure to this study's UID
            await connection.ExecuteAsync("""
                UPDATE ris.order_procedures
                SET study_uid = @StudyUid, modified_date = NOW()
                WHERE order_id = @OrderId
                  AND (study_uid IS NULL OR study_uid = '')
                LIMIT 1
                """,
                new { StudyUid = study.StudyUid, OrderId = orderId }, tx);

            await tx.CommitAsync();
            return true;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    /// <summary>
    /// Unlink a PACS study from RIS orders by clearing accession and study UID references.
    /// </summary>
    public async Task<bool> UnlinkStudyAsync(long pacsStudyId)
    {
        var study = await _studyRepository.GetByIdAsync(pacsStudyId);
        if (study is null) return false;

        await using var connection = await CreateConnectionAsync();
        await using var tx = await connection.BeginTransactionAsync();

        try
        {
            // Clear accession on PACS study
            await connection.ExecuteAsync(
                "UPDATE pacs.studies SET accession = NULL, modified_date = NOW() WHERE id = @StudyId",
                new { StudyId = pacsStudyId }, tx);

            // Clear study_uid on any linked RIS procedures
            if (!string.IsNullOrWhiteSpace(study.StudyUid))
            {
                await connection.ExecuteAsync(
                    "UPDATE ris.order_procedures SET study_uid = NULL, modified_date = NOW() WHERE study_uid = @StudyUid",
                    new { StudyUid = study.StudyUid }, tx);
            }

            await tx.CommitAsync();
            return true;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    /// <summary>
    /// Merge RIS patients using the built-in database function.
    /// </summary>
    public async Task MergePatientAsync(PatientMergeRequest request)
    {
        const string sql = """
            SELECT ris.patients_merge(
                @TargetPatientId, @TargetSiteCode,
                @SourcePatientId, @SourceSiteCode,
                @MoveOrders, @MoveDocuments
            )
            """;

        await using var connection = await CreateConnectionAsync();
        await connection.ExecuteAsync(sql, new
        {
            request.TargetPatientId,
            request.TargetSiteCode,
            request.SourcePatientId,
            request.SourceSiteCode,
            request.MoveOrders,
            request.MoveDocuments
        });
    }

    // ================================================================
    // Field Sync — Push values between PACS and RIS
    // ================================================================

    private static readonly Dictionary<string, (string PacsTable, string PacsColumn, string RisTable, string RisColumn)> SyncFieldMap
        = new(StringComparer.OrdinalIgnoreCase)
    {
        ["accession"]        = ("pacs.studies",   "accession",        "ris.orders",           "accession_number"),
        ["firstName"]        = ("pacs.patients",  "first_name",       "ris.people",           "first_name"),
        ["lastName"]         = ("pacs.patients",  "last_name",        "ris.people",           "last_name"),
        ["middleName"]       = ("pacs.patients",  "middle_name",      "ris.people",           "middle_initial"),
        ["gender"]           = ("pacs.patients",  "gender",           "ris.people",           "sex"),
        ["dateOfBirth"]      = ("pacs.patients",  "birth_time",       "ris.people",           "date_of_birth"),
        ["patientId"]        = ("pacs.patients",  "patient_id",       "ris.patients",         "patient_id"),
        ["studyDescription"] = ("pacs.studies",   "anatomical_area",  "ris.orders",           "description"),
        ["studyDate"]        = ("pacs.studies",   "study_date",       "ris.order_procedures", "procedure_date_start"),
        ["studyUid"]         = ("pacs.studies",   "study_uid",        "ris.order_procedures", "study_uid"),
        ["modality"]         = ("pacs.studies",   "modality",         "ris.order_procedures", "modality_text"),
    };

    /// <summary>
    /// Sync a field value between PACS and RIS systems.
    /// </summary>
    public async Task<bool> SyncFieldAsync(long pacsStudyId, SyncFieldRequest request)
    {
        if (!SyncFieldMap.TryGetValue(request.FieldName, out var mapping))
            return false;

        var study = await _studyRepository.GetByIdAsync(pacsStudyId);
        if (study is null) return false;

        // For date fields, parse the string to a DateTime
        var isDateField = request.FieldName.Equals("dateOfBirth", StringComparison.OrdinalIgnoreCase)
                       || request.FieldName.Equals("studyDate", StringComparison.OrdinalIgnoreCase);
        object? dbValue = isDateField && !string.IsNullOrWhiteSpace(request.Value)
            ? DateTime.Parse(request.Value)
            : request.Value;

        await using var connection = await CreateConnectionAsync();
        await using var tx = await connection.BeginTransactionAsync();

        try
        {
            // Update PACS side
            if (request.Target is SyncTarget.Pacs or SyncTarget.Both)
            {
                var sql = BuildPacsUpdateSql(mapping.PacsTable, mapping.PacsColumn);
                if (sql is not null)
                {
                    var p = new DynamicParameters();
                    p.Add("Value", dbValue);
                    p.Add("StudyId", study.Id);
                    p.Add("PatientDbId", study.PatientDbId);
                    await connection.ExecuteAsync(sql, p, tx);
                }
            }

            // Update RIS side
            if (request.Target is SyncTarget.Ris or SyncTarget.Both)
            {
                var sql = BuildRisUpdateSql(mapping.RisTable, mapping.RisColumn, study);
                if (sql is not null)
                {
                    var p = new DynamicParameters();
                    p.Add("Value", dbValue);
                    p.Add("PatientId", study.PatientId);
                    p.Add("Accession", study.Accession);
                    await connection.ExecuteAsync(sql, p, tx);
                }
            }

            await tx.CommitAsync();
            return true;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    private static string? BuildPacsUpdateSql(string table, string column)
    {
        return table switch
        {
            "pacs.studies" => $"UPDATE pacs.studies SET {column} = @Value, modified_date = NOW() WHERE id = @StudyId",
            "pacs.patients" => $"UPDATE pacs.patients SET {column} = @Value, modified_date = NOW() WHERE id = @PatientDbId",
            _ => null
        };
    }

    private static string? BuildRisUpdateSql(string table, string column, StudyDetail study)
    {
        // modality_text is a virtual column name — for order_procedures we actually can't directly
        // update modality since it's an FK (modality_id). Skip RIS side for modality sync.
        if (table == "ris.order_procedures" && column == "modality_text")
            return null;

        return table switch
        {
            "ris.orders" when !string.IsNullOrWhiteSpace(study.Accession)
                => $"UPDATE ris.orders SET {column} = @Value WHERE accession_number = @Accession",
            "ris.order_procedures" when !string.IsNullOrWhiteSpace(study.Accession)
                => $"UPDATE ris.order_procedures SET {column} = @Value WHERE order_id IN (SELECT order_id FROM ris.orders WHERE accession_number = @Accession)",
            "ris.people"
                => $"UPDATE ris.people SET {column} = @Value WHERE person_id IN (SELECT person_id FROM ris.patients WHERE patient_id = @PatientId LIMIT 1)",
            "ris.patients"
                => $"UPDATE ris.patients SET {column} = @Value WHERE patient_id = @PatientId",
            _ => null
        };
    }

    // ================================================================
    // Order & Procedure Merge
    // ================================================================

    /// <summary>
    /// Merge source order into target order: move all procedures from source to target, then delete source.
    /// </summary>
    // Safe column names for field overrides (whitelist to prevent injection)
    private static readonly Dictionary<string, string> ProcedureFieldColumns = new(StringComparer.OrdinalIgnoreCase)
    {
        ["studyUid"] = "study_uid", ["status"] = "status", ["procedureName"] = "procedure_name",
        ["notes"] = "notes", ["schedulerNotes"] = "scheduler_notes",
        ["patientClass"] = "patient_class", ["patientLocation"] = "patient_location",
        ["visitNumber"] = "visit_number", ["customField1"] = "custom_field_1",
        ["customField2"] = "custom_field_2", ["customField3"] = "custom_field_3",
        ["procedureDateStart"] = "procedure_date_start", ["procedureDateEnd"] = "procedure_date_end",
        ["checkInTime"] = "check_in_time", ["statFlag"] = "stat_flag",
    };

    private static readonly Dictionary<string, string> OrderFieldColumns = new(StringComparer.OrdinalIgnoreCase)
    {
        ["accessionNumber"] = "accession_number", ["description"] = "description",
        ["status"] = "status", ["notes"] = "notes",
        ["patientComplaint"] = "patient_complaint", ["physicianReason"] = "physician_reason",
        ["customField1"] = "custom_field_1", ["customField2"] = "custom_field_2",
        ["customField3"] = "custom_field_3", ["customField4"] = "custom_field_4",
    };

    public async Task MergeOrdersAsync(long targetOrderId, long sourceOrderId,
        Dictionary<string, string?>? fieldOverrides = null)
    {
        await using var connection = await CreateConnectionAsync();
        await using var tx = await connection.BeginTransactionAsync();

        try
        {
            // Apply field overrides to target order
            if (fieldOverrides is { Count: > 0 })
            {
                foreach (var (fieldName, value) in fieldOverrides)
                {
                    if (OrderFieldColumns.TryGetValue(fieldName, out var column))
                    {
                        await connection.ExecuteAsync(
                            $"UPDATE ris.orders SET {column} = @Value WHERE order_id = @TargetId",
                            new { Value = value, TargetId = targetOrderId }, tx);
                    }
                }
            }

            // Move all procedures from source to target
            await connection.ExecuteAsync(
                "UPDATE ris.order_procedures SET order_id = @TargetId WHERE order_id = @SourceId",
                new { TargetId = targetOrderId, SourceId = sourceOrderId }, tx);

            // Delete the now-empty source order
            await connection.ExecuteAsync(
                "DELETE FROM ris.orders WHERE order_id = @SourceId",
                new { SourceId = sourceOrderId }, tx);

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task MergeProceduresAsync(long targetProcedureId, long sourceProcedureId,
        bool moveReports = true, Dictionary<string, string?>? fieldOverrides = null)
    {
        await using var connection = await CreateConnectionAsync();
        await using var tx = await connection.BeginTransactionAsync();

        try
        {
            // Apply field overrides to target procedure
            if (fieldOverrides is { Count: > 0 })
            {
                foreach (var (fieldName, value) in fieldOverrides)
                {
                    if (ProcedureFieldColumns.TryGetValue(fieldName, out var column))
                    {
                        // Handle boolean/timestamp conversion
                        if (column == "stat_flag")
                        {
                            await connection.ExecuteAsync(
                                $"UPDATE ris.order_procedures SET {column} = @Value WHERE procedure_id = @TargetId",
                                new { Value = value == "true", TargetId = targetProcedureId }, tx);
                        }
                        else if (column is "procedure_date_start" or "procedure_date_end" or "check_in_time")
                        {
                            var dateVal = string.IsNullOrWhiteSpace(value) ? (DateTime?)null : DateTime.Parse(value);
                            await connection.ExecuteAsync(
                                $"UPDATE ris.order_procedures SET {column} = @Value WHERE procedure_id = @TargetId",
                                new { Value = dateVal, TargetId = targetProcedureId }, tx);
                        }
                        else
                        {
                            await connection.ExecuteAsync(
                                $"UPDATE ris.order_procedures SET {column} = @Value WHERE procedure_id = @TargetId",
                                new { Value = value, TargetId = targetProcedureId }, tx);
                        }
                    }
                }
            }

            // Move reports from source to target (if requested)
            if (moveReports)
            {
                await connection.ExecuteAsync(
                    "UPDATE ris.reports SET procedure_id = @TargetId WHERE procedure_id = @SourceId",
                    new { TargetId = targetProcedureId, SourceId = sourceProcedureId }, tx);
            }

            // Move procedure steps from source to target
            await connection.ExecuteAsync(
                "UPDATE ris.order_procedure_steps SET procedure_id = @TargetId WHERE procedure_id = @SourceId",
                new { TargetId = targetProcedureId, SourceId = sourceProcedureId }, tx);

            // Delete the now-empty source procedure
            await connection.ExecuteAsync(
                "DELETE FROM ris.order_procedures WHERE procedure_id = @SourceId",
                new { SourceId = sourceProcedureId }, tx);

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    // ================================================================
    // Standard Reports (Precanned Text)
    // ================================================================

    public async Task<List<StandardReport>> GetStandardReportsAsync()
    {
        const string sql = """
            SELECT standard_report_id AS StandardReportId,
                   short_report_name AS ShortReportName,
                   report_text AS ReportText,
                   created_by AS CreatedBy
            FROM ris.standard_reports
            ORDER BY short_report_name
            """;

        await using var connection = await CreateConnectionAsync();
        var reports = await connection.QueryAsync<StandardReport>(sql);
        return reports.ToList();
    }

    public async Task<StandardReport> CreateStandardReportAsync(string name, string text, string? createdBy)
    {
        const string sql = """
            INSERT INTO ris.standard_reports (short_report_name, report_text, created_by)
            VALUES (@Name, @Text, @CreatedBy)
            RETURNING standard_report_id AS StandardReportId,
                      short_report_name AS ShortReportName,
                      report_text AS ReportText,
                      created_by AS CreatedBy
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleAsync<StandardReport>(sql,
            new { Name = name, Text = text, CreatedBy = createdBy });
    }

    public async Task<bool> UpdateStandardReportAsync(long id, string name, string text)
    {
        const string sql = """
            UPDATE ris.standard_reports
            SET short_report_name = @Name, report_text = @Text
            WHERE standard_report_id = @Id
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.ExecuteAsync(sql, new { Id = id, Name = name, Text = text }) > 0;
    }

    public async Task<bool> DeleteStandardReportAsync(long id)
    {
        await using var connection = await CreateConnectionAsync();
        return await connection.ExecuteAsync(
            "DELETE FROM ris.standard_reports WHERE standard_report_id = @Id",
            new { Id = id }) > 0;
    }

    // ================================================================
    // Patient Cleanup / Deletion
    // ================================================================

    public async Task<PatientDeletionPreview?> GetPatientDeletionPreviewAsync(string patientId, string siteCode)
    {
        await using var connection = await CreateConnectionAsync();

        // Get person_id for this patient
        var personId = await connection.ExecuteScalarAsync<long?>(
            "SELECT person_id FROM ris.patients WHERE patient_id = @PatientId AND site_code = @SiteCode",
            new { PatientId = patientId, SiteCode = siteCode });

        if (personId is null) return null;

        var preview = new PatientDeletionPreview
        {
            PatientId = patientId,
            SiteCode = siteCode,
            PersonId = personId.Value,
        };

        preview.OrderCount = await connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM ris.orders WHERE patient_id = @PatientId AND site_code = @SiteCode",
            new { PatientId = patientId, SiteCode = siteCode });

        preview.InsuranceReferences = await connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM ris.insurance WHERE insured_person_id = @PersonId",
            new { PersonId = personId.Value });

        preview.BillingAccountCount = await connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM ris.billing_accounts WHERE patient_id = @PatientId AND site_code = @SiteCode",
            new { PatientId = patientId, SiteCode = siteCode });

        preview.DocumentCount = await connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM ris.documents WHERE patient_id = @PatientId AND patient_group = @SiteCode",
            new { PatientId = patientId, SiteCode = siteCode });

        preview.CanDelete = preview.InsuranceReferences == 0;
        if (!preview.CanDelete)
            preview.BlockingReason = $"Patient is referenced as an insured person in {preview.InsuranceReferences} insurance record(s). Clear these references first.";

        return preview;
    }

    public async Task CleanupAndDeletePatientAsync(string patientId, string siteCode, bool clearInsurance)
    {
        await using var connection = await CreateConnectionAsync();
        await using var tx = await connection.BeginTransactionAsync();

        try
        {
            // Get person_id
            var personId = await connection.ExecuteScalarAsync<long>(
                "SELECT person_id FROM ris.patients WHERE patient_id = @PatientId AND site_code = @SiteCode",
                new { PatientId = patientId, SiteCode = siteCode }, tx);

            // Clear insurance references if requested
            if (clearInsurance)
            {
                await connection.ExecuteAsync(
                    "UPDATE ris.insurance SET insured_person_id = NULL WHERE insured_person_id = @PersonId",
                    new { PersonId = personId }, tx);
            }

            // Clear current insurance records
            await connection.ExecuteAsync(
                "DELETE FROM ris.patient_current_insurance WHERE patient_id = @PatientId AND site_code = @SiteCode",
                new { PatientId = patientId, SiteCode = siteCode }, tx);

            // Delete patient (cascades to orders, billing, etc.)
            await connection.ExecuteAsync(
                "SELECT ris.patients_delete_id(@PatientId, @SiteCode)",
                new { PatientId = patientId, SiteCode = siteCode }, tx);

            // Delete the person record (demographics)
            await connection.ExecuteAsync(
                "DELETE FROM ris.people WHERE person_id = @PersonId",
                new { PersonId = personId }, tx);

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }
}
