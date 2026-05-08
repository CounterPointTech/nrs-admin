using Dapper;
using Microsoft.Extensions.Options;
using NpgsqlTypes;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;
using NrsAdmin.Api.Models.Requests;

namespace NrsAdmin.Api.Repositories;

/// <summary>
/// Ports the WPF NRS HL7 Resend Tool repositories. Two responsibilities:
///   1. DFT resend — read a procedure's full snapshot, INSERT into public.dft_stage. Mirth picks up.
///   2. MDM resend — find procedures by accession or date range, reset report status so Novarad regenerates MDM messages.
/// This is a STAGING tool. Actual HL7 transmission happens in Mirth/middleware.
/// </summary>
public class Hl7ResendRepository : BaseRepository
{
    public Hl7ResendRepository(IOptionsMonitor<DatabaseSettings> settings) : base(settings) { }

    // ---------- DFT search ----------

    public async Task<List<Hl7ProcedureSearchResult>> SearchProceduresAsync(Hl7ProcedureSearchRequest request)
    {
        var parameters = new DynamicParameters();
        parameters.Add("StartDate", request.StartDate.Date);
        parameters.Add("EndDate", request.EndDate.Date.AddDays(1).AddSeconds(-1));

        var sql = @"
            SELECT
                op.procedure_id          AS ProcedureId,
                COALESCE(o.accession_number, '') AS AccessionNumber,
                COALESCE(o.patient_id, '')       AS PatientId,
                COALESCE(p.last_name || ', ' || p.first_name, '') AS PatientName,
                op.procedure_date_start  AS ProcedureDate,
                COALESCE(op.procedure_name, '')  AS ProcedureName,
                COALESCE(m.name, '')             AS Modality,
                COALESCE(fa.name, '')            AS Facility,
                COALESCE(op.status, '')          AS Status,
                'Not Sent'                       AS ResendStatus
            FROM ris.orders o
                INNER JOIN ris.order_procedures op ON o.order_id = op.order_id
                INNER JOIN ris.modalities m        ON op.modality_id = m.modality_id
                INNER JOIN shared.facilities fa    ON m.facility_id = fa.facility_id
                INNER JOIN ris.patients pa         ON o.patient_id = pa.patient_id AND o.site_code = pa.site_code
                INNER JOIN ris.people p            ON pa.person_id = p.person_id
            WHERE op.procedure_date_start BETWEEN @StartDate AND @EndDate
        ";

        if (!string.IsNullOrWhiteSpace(request.AccessionNumber))
        {
            sql += " AND o.accession_number = @AccessionNumber";
            parameters.Add("AccessionNumber", request.AccessionNumber.Trim());
        }
        if (!string.IsNullOrWhiteSpace(request.PatientId))
        {
            sql += " AND o.patient_id = @PatientId";
            parameters.Add("PatientId", request.PatientId.Trim());
        }
        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            sql += " AND op.status ILIKE @Status";
            parameters.Add("Status", $"%{request.Status}%");
        }

        sql += " ORDER BY op.procedure_date_start DESC LIMIT 1000";

        await using var connection = await CreateConnectionAsync();
        var results = (await connection.QueryAsync<Hl7ProcedureSearchResult>(sql, parameters)).ToList();

        if (results.Count > 0)
        {
            var statuses = await GetResendStatusesInternalAsync(connection, results.Select(r => r.ProcedureId).ToList());
            foreach (var r in results)
            {
                if (statuses.TryGetValue(r.ProcedureId, out var status))
                    r.ResendStatus = status;
            }
        }

        return results;
    }

    // ---------- DFT status polling ----------

    public async Task<List<Hl7ResendStatusItem>> GetResendStatusesAsync(List<long> procedureIds)
    {
        if (procedureIds.Count == 0) return new List<Hl7ResendStatusItem>();

        await using var connection = await CreateConnectionAsync();

        var sql = @"
            SELECT
                ds.procedure_id AS ProcedureId,
                COALESCE(ds.custom_field_1, 'Pending') AS Status,
                ds.current_dt AS LastUpdated
            FROM public.dft_stage ds
            INNER JOIN (
                SELECT procedure_id, MAX(current_dt) AS latest_dt
                FROM public.dft_stage
                WHERE procedure_id = ANY(@ProcedureIds)
                GROUP BY procedure_id
            ) latest ON ds.procedure_id = latest.procedure_id AND ds.current_dt = latest.latest_dt
        ";

        var rows = (await connection.QueryAsync<Hl7ResendStatusItem>(sql, new { ProcedureIds = procedureIds.ToArray() })).ToList();
        return rows;
    }

    private async Task<Dictionary<long, string>> GetResendStatusesInternalAsync(
        Npgsql.NpgsqlConnection connection, List<long> procedureIds)
    {
        var sql = @"
            SELECT
                ds.procedure_id AS ProcedureId,
                COALESCE(ds.custom_field_1, 'Pending') AS Status
            FROM public.dft_stage ds
            INNER JOIN (
                SELECT procedure_id, MAX(current_dt) AS latest_dt
                FROM public.dft_stage
                WHERE procedure_id = ANY(@ProcedureIds)
                GROUP BY procedure_id
            ) latest ON ds.procedure_id = latest.procedure_id AND ds.current_dt = latest.latest_dt
        ";

        var rows = await connection.QueryAsync<(long ProcedureId, string Status)>(
            sql, new { ProcedureIds = procedureIds.ToArray() });

        return rows.ToDictionary(r => r.ProcedureId, r => r.Status ?? "Pending");
    }

    // ---------- DFT resend (stage to public.dft_stage) ----------

    /// <summary>
    /// Verifies public.dft_stage exists. The table is owned by Mirth, not Novarad —
    /// sites without the DFT outbound integration won't have it. Uses to_regclass so
    /// a missing table returns null rather than raising an error.
    /// </summary>
    public async Task<bool> DftStageTableExistsAsync()
    {
        await using var connection = await CreateConnectionAsync();
        var oid = await connection.ExecuteScalarAsync<string?>(
            "SELECT to_regclass('public.dft_stage')::text");
        return !string.IsNullOrEmpty(oid);
    }

    public async Task<bool> StageProcedureForResendAsync(long procedureId)
    {
        await using var connection = await CreateConnectionAsync();

        var record = await ReadDftStageSnapshotAsync(connection, procedureId);
        if (record is null) return false;

        await InsertDftStageRecordAsync(connection, record);
        return true;
    }

    private static async Task<DftStageRecord?> ReadDftStageSnapshotAsync(
        Npgsql.NpgsqlConnection connection, long procedureId)
    {
        // The full procedure snapshot — same column set as the WPF tool's StageProcedureForResend query.
        const string sql = @"
            SELECT
                'NOVARIS'  AS sending_app,
                'MIRTH'    AS receiving_app,
                op.procedure_id || to_char(now(), 'yyyyMMddHH24MISS') AS msg_ctrl_id,
                now()      AS current_dt,
                'DFT^P03'  AS message_type,
                'P'        AS processing_id,
                '2.3'      AS version,
                'P03'      AS event_type_code,
                p.person_id AS patient_person_id,
                o.patient_id AS patient_mrn,
                o.site_code,
                p.last_name  AS patient_last_name,
                p.first_name AS patient_first_name,
                p.middle_initial AS patient_middle_initial,
                p.date_of_birth  AS patient_birth_date,
                p.sex AS patient_gender,
                p.address_1 AS patient_address_1,
                p.address_2 AS patient_address_2,
                p.city  AS patient_city,
                p.state AS patient_state,
                p.zip   AS patient_zip,
                p.home_phone AS patient_home_phone,
                p.work_phone AS patient_work_phone,
                p.email      AS patient_email,
                o.order_id,
                replace(regexp_replace(o.patient_complaint, E'[\n\r]+', ' ', 'g' ), '|', ' ') AS patient_complaint,
                replace(regexp_replace(o.physician_reason, E'[\n\r]+', ' ', 'g' ), '|', ' ') AS physician_reason,
                icd1.icd_code_id AS icd_code_id_1, icd1.icd_code_display AS icd_code_1,
                icd1.description AS icd_code_description_1, icd1.icd_code_version AS icd_code_version_1,
                icd2.icd_code_id AS icd_code_id_2, icd2.icd_code_display AS icd_code_2,
                icd2.description AS icd_code_description_2, icd2.icd_code_version AS icd_code_version_2,
                icd3.icd_code_id AS icd_code_id_3, icd3.icd_code_display AS icd_code_3,
                icd3.description AS icd_code_description_3, icd3.icd_code_version AS icd_code_version_3,
                op.procedure_id,
                o.accession_number,
                COALESCE(op.patient_class, 'O') AS patient_class,
                op.patient_location,
                'CG'  AS tran_type,
                'CPT' AS coding_method,
                m.modality_id,
                m.modality_type_id AS modality_type,
                m.name AS modality_name,
                fa.name AS facility,
                op.procedure_name,
                op.study_uid AS exam_study_uid,
                op.status    AS exam_status,
                op.stat_flag,
                op.procedure_date_start AS exam_scheduled_date_time,
                op.procedure_date_end   AS exam_end_date_time,
                bop.pre_auth_number,
                bop.pre_auth_date,
                bsc1.service_code AS procedure_code_1,
                opsl1.units       AS procedure_code_units_1,
                bsc1.description  AS procedure_description_1,
                bsc2.service_code AS procedure_code_2,
                opsl2.units       AS procedure_code_units_2,
                bsc2.description  AS procedure_description_2,
                bsc3.service_code AS procedure_code_3,
                opsl3.units       AS procedure_code_units_3,
                bsc3.description  AS procedure_description_3,
                ins1.insurance_id AS primary_insurance_id,
                ins1.insured_card_number AS primary_insurance_insured_card_number,
                ins1.group_number AS primary_insurance_group_number,
                ins1.effective_date AS primary_insurance_effective_date,
                ins1.requires_pre_auth AS primary_insurance_requires_pre_auth,
                ic1.insurance_co_id AS primary_insurance_co_id,
                ic1.name AS primary_insurance_co_name,
                ins1.plan_id AS primary_plan_id,
                ip1.name     AS primary_plan_name,
                ip1.address_1 AS primary_plan_address_1, ip1.address_2 AS primary_plan_address_2,
                ip1.city AS primary_plan_city, ip1.state AS primary_plan_state, ip1.zip AS primary_plan_zip,
                ip1.phone AS primary_plan_phone, ip1.fax AS primary_plan_fax,
                ip1.requires_referral AS primary_plan_requires_referral, ip1.is_active AS primary_plan_is_active,
                ins2.insurance_id AS secondary_insurance_id,
                ins2.insured_card_number AS secondary_insurance_insured_card_number,
                ins2.group_number AS secondary_insurance_group_number,
                ins2.effective_date AS secondary_insurance_effective_date,
                ins2.requires_pre_auth AS secondary_insurance_requires_pre_auth,
                ic2.insurance_co_id AS secondary_insurance_co_id,
                ic2.name AS secondary_insurance_co_name,
                ins2.plan_id AS secondary_plan_id,
                ip2.name AS secondary_plan_name,
                ip2.address_1 AS secondary_plan_address_1, ip2.address_2 AS secondary_plan_address_2,
                ip2.city AS secondary_plan_city, ip2.state AS secondary_plan_state, ip2.zip AS secondary_plan_zip,
                ip2.phone AS secondary_plan_phone, ip2.fax AS secondary_plan_fax,
                ip2.requires_referral AS secondary_plan_requires_referral, ip2.is_active AS secondary_plan_is_active,
                ins3.insurance_id AS tertiary_insurance_id,
                ins3.insured_card_number AS tertiary_insurance_insured_card_number,
                ins3.group_number AS tertiary_insurance_group_number,
                ins3.effective_date AS tertiary_insurance_effective_date,
                ins3.requires_pre_auth AS tertiary_insurance_requires_pre_auth,
                ic3.insurance_co_id AS tertiary_insurance_co_id,
                ic3.name AS tertiary_insurance_co_name,
                ins3.plan_id AS tertiary_plan_id,
                ip3.name AS tertiary_plan_name,
                ip3.address_1 AS tertiary_plan_address_1, ip3.address_2 AS tertiary_plan_address_2,
                ip3.city AS tertiary_plan_city, ip3.state AS tertiary_plan_state, ip3.zip AS tertiary_plan_zip,
                ip3.phone AS tertiary_plan_phone, ip3.fax AS tertiary_plan_fax,
                ip3.requires_referral AS tertiary_plan_requires_referral, ip3.is_active AS tertiary_plan_is_active,
                o.referring_physician_id,
                ph.npi AS referring_physician_npi,
                ph.ein AS referring_physician_ein,
                ph.specialty_1 AS referring_physician_specialty,
                p2.last_name  AS referring_physician_last_name,
                p2.first_name AS referring_physician_first_name,
                p2.middle_initial AS referring_physician_middle_initial,
                p2.address_1 AS referring_physician_address_1, p2.address_2 AS referring_physician_address_2,
                p2.city AS referring_physician_city, p2.state AS referring_physician_state, p2.zip AS referring_physician_zip,
                p2.home_phone AS referring_physician_home_phone, p2.work_phone AS referring_physician_work_phone,
                p2.email AS referring_physician_email, p2.fax AS referring_physician_fax
            FROM ris.orders o
                INNER JOIN ris.order_procedures op ON o.order_id = op.order_id
                INNER JOIN ris.modalities m        ON op.modality_id = m.modality_id
                INNER JOIN shared.facilities fa    ON m.facility_id = fa.facility_id
                INNER JOIN ris.patients pa         ON o.patient_id = pa.patient_id AND o.site_code = pa.site_code
                INNER JOIN ris.people p            ON pa.person_id = p.person_id
                LEFT OUTER JOIN ris.physicians ph  ON o.referring_physician_id = ph.physician_id
                LEFT OUTER JOIN ris.people p2      ON ph.person_id = p2.person_id
                LEFT OUTER JOIN ris.billing_order_procedures bop ON op.procedure_id = bop.procedure_id
                LEFT OUTER JOIN ris.billing_orders bo ON o.order_id = bo.order_id
                LEFT OUTER JOIN ris.billing_orders_icd_codes boi1 ON o.order_id = boi1.order_id AND boi1.priority_order = 1
                LEFT OUTER JOIN ris.billing_orders_icd_codes boi2 ON o.order_id = boi2.order_id AND boi2.priority_order = 2
                LEFT OUTER JOIN ris.billing_orders_icd_codes boi3 ON o.order_id = boi3.order_id AND boi3.priority_order = 3
                LEFT OUTER JOIN ris.icd_codes icd1 ON boi1.icd_code_id = icd1.icd_code_id
                LEFT OUTER JOIN ris.icd_codes icd2 ON boi2.icd_code_id = icd2.icd_code_id
                LEFT OUTER JOIN ris.icd_codes icd3 ON boi3.icd_code_id = icd3.icd_code_id
                LEFT OUTER JOIN ris.insurance ins1 ON bo.primary_insurance_id   = ins1.insurance_id
                LEFT OUTER JOIN ris.insurance ins2 ON bo.secondary_insurance_id = ins2.insurance_id
                LEFT OUTER JOIN ris.insurance ins3 ON bo.tertiary_insurance_id  = ins3.insurance_id
                LEFT OUTER JOIN ris.insurance_plans ip1 ON ins1.plan_id = ip1.plan_id
                LEFT OUTER JOIN ris.insurance_plans ip2 ON ins2.plan_id = ip2.plan_id
                LEFT OUTER JOIN ris.insurance_plans ip3 ON ins3.plan_id = ip3.plan_id
                LEFT OUTER JOIN ris.insurance_companies ic1 ON ip1.insurance_co_id = ic1.insurance_co_id
                LEFT OUTER JOIN ris.insurance_companies ic2 ON ip2.insurance_co_id = ic2.insurance_co_id
                LEFT OUTER JOIN ris.insurance_companies ic3 ON ip3.insurance_co_id = ic3.insurance_co_id
                LEFT OUTER JOIN ris.order_procedure_service_lines opsl1 ON op.procedure_id = opsl1.procedure_id AND opsl1.service_line_id = 1
                LEFT OUTER JOIN ris.order_procedure_service_lines opsl2 ON op.procedure_id = opsl2.procedure_id AND opsl2.service_line_id = 2
                LEFT OUTER JOIN ris.order_procedure_service_lines opsl3 ON op.procedure_id = opsl3.procedure_id AND opsl3.service_line_id = 3
                LEFT OUTER JOIN ris.billing_service_codes bsc1 ON opsl1.service_code_id = bsc1.service_code_id
                LEFT OUTER JOIN ris.billing_service_codes bsc2 ON opsl2.service_code_id = bsc2.service_code_id
                LEFT OUTER JOIN ris.billing_service_codes bsc3 ON opsl3.service_code_id = bsc3.service_code_id
            WHERE op.procedure_id = @ProcedureId
        ";

        var record = await connection.QueryFirstOrDefaultAsync<DftStageRecord>(
            sql,
            new { ProcedureId = procedureId },
            commandTimeout: 60);

        return record;
    }

    private static async Task InsertDftStageRecordAsync(Npgsql.NpgsqlConnection connection, DftStageRecord r)
    {
        // Mirror the WPF tool's INSERT — including custom_field_2 = 'NRS Admin' (instead of 'NRS HL7 Resend Tool')
        // so audit/queue inspection can distinguish where the resend came from. custom_field_3 carries msg_ctrl_id
        // for traceback into the queue (same convention as WPF).
        const string sql = @"
            INSERT INTO public.dft_stage (
                sending_app, receiving_app, msg_ctrl_id, current_dt, message_type,
                processing_id, version, event_type_code, patient_person_id, patient_mrn,
                site_code, patient_last_name, patient_first_name, patient_middle_initial,
                patient_birth_date, patient_gender, patient_address_1, patient_address_2,
                patient_city, patient_state, patient_zip, patient_home_phone,
                patient_work_phone, patient_email, order_id, patient_complaint,
                physician_reason, icd_code_id_1, icd_code_1, icd_code_description_1,
                icd_code_version_1, icd_code_id_2, icd_code_2, icd_code_description_2,
                icd_code_version_2, icd_code_id_3, icd_code_3, icd_code_description_3,
                icd_code_version_3, procedure_id, accession_number, patient_class,
                patient_location, tran_type, coding_method, modality_id, modality_type,
                modality_name, facility, procedure_name, exam_study_uid, exam_status,
                stat_flag, exam_scheduled_date_time, exam_end_date_time, pre_auth_number,
                pre_auth_date, procedure_code_1, procedure_code_units_1, procedure_description_1,
                procedure_code_2, procedure_code_units_2, procedure_description_2,
                procedure_code_3, procedure_code_units_3, procedure_description_3,
                primary_insurance_id, primary_insurance_insured_card_number, primary_insurance_group_number,
                primary_insurance_effective_date, primary_insurance_requires_pre_auth,
                primary_insurance_co_id, primary_insurance_co_name, primary_plan_id,
                primary_plan_name, primary_plan_address_1, primary_plan_address_2,
                primary_plan_city, primary_plan_state, primary_plan_zip,
                primary_plan_phone, primary_plan_fax, primary_plan_requires_referral,
                primary_plan_is_active, secondary_insurance_id, secondary_insurance_insured_card_number,
                secondary_insurance_group_number, secondary_insurance_effective_date,
                secondary_insurance_requires_pre_auth, secondary_insurance_co_id,
                secondary_insurance_co_name, secondary_plan_id, secondary_plan_name,
                secondary_plan_address_1, secondary_plan_address_2, secondary_plan_city,
                secondary_plan_state, secondary_plan_zip, secondary_plan_phone,
                secondary_plan_fax, secondary_plan_requires_referral, secondary_plan_is_active,
                tertiary_insurance_id, tertiary_insurance_insured_card_number,
                tertiary_insurance_group_number, tertiary_insurance_effective_date,
                tertiary_insurance_requires_pre_auth, tertiary_insurance_co_id,
                tertiary_insurance_co_name, tertiary_plan_id, tertiary_plan_name,
                tertiary_plan_address_1, tertiary_plan_address_2, tertiary_plan_city,
                tertiary_plan_state, tertiary_plan_zip, tertiary_plan_phone,
                tertiary_plan_fax, tertiary_plan_requires_referral, tertiary_plan_is_active,
                referring_physician_id, referring_physician_npi, referring_physician_ein,
                referring_physician_specialty, referring_physician_last_name,
                referring_physician_first_name, referring_physician_middle_initial,
                referring_physician_address_1, referring_physician_address_2,
                referring_physician_city, referring_physician_state, referring_physician_zip,
                referring_physician_home_phone, referring_physician_work_phone,
                referring_physician_email, referring_physician_fax,
                custom_field_1, custom_field_2, custom_field_3, custom_field_4, custom_field_5
            ) VALUES (
                @SendingApp, @ReceivingApp, @MsgCtrlId, @CurrentDt, @MessageType,
                @ProcessingId, @Version, @EventTypeCode, @PatientPersonId, @PatientMrn,
                @SiteCode, @PatientLastName, @PatientFirstName, @PatientMiddleInitial,
                @PatientBirthDate, @PatientGender, @PatientAddress1, @PatientAddress2,
                @PatientCity, @PatientState, @PatientZip, @PatientHomePhone,
                @PatientWorkPhone, @PatientEmail, @OrderId, @PatientComplaint,
                @PhysicianReason, @IcdCodeId1, @IcdCode1, @IcdCodeDescription1,
                @IcdCodeVersion1, @IcdCodeId2, @IcdCode2, @IcdCodeDescription2,
                @IcdCodeVersion2, @IcdCodeId3, @IcdCode3, @IcdCodeDescription3,
                @IcdCodeVersion3, @ProcedureId, @AccessionNumber, @PatientClass,
                @PatientLocation, @TranType, @CodingMethod, @ModalityId, @ModalityType,
                @ModalityName, @Facility, @ProcedureName, @ExamStudyUid, @ExamStatus,
                @StatFlag, @ExamScheduledDateTime, @ExamEndDateTime, @PreAuthNumber,
                @PreAuthDate, @ProcedureCode1, @ProcedureCodeUnits1, @ProcedureDescription1,
                @ProcedureCode2, @ProcedureCodeUnits2, @ProcedureDescription2,
                @ProcedureCode3, @ProcedureCodeUnits3, @ProcedureDescription3,
                @PrimaryInsuranceId, @PrimaryInsuranceInsuredCardNumber, @PrimaryInsuranceGroupNumber,
                @PrimaryInsuranceEffectiveDate, @PrimaryInsuranceRequiresPreAuth,
                @PrimaryInsuranceCoId, @PrimaryInsuranceCoName, @PrimaryPlanId,
                @PrimaryPlanName, @PrimaryPlanAddress1, @PrimaryPlanAddress2,
                @PrimaryPlanCity, @PrimaryPlanState, @PrimaryPlanZip,
                @PrimaryPlanPhone, @PrimaryPlanFax, @PrimaryPlanRequiresReferral,
                @PrimaryPlanIsActive, @SecondaryInsuranceId, @SecondaryInsuranceInsuredCardNumber,
                @SecondaryInsuranceGroupNumber, @SecondaryInsuranceEffectiveDate,
                @SecondaryInsuranceRequiresPreAuth, @SecondaryInsuranceCoId,
                @SecondaryInsuranceCoName, @SecondaryPlanId, @SecondaryPlanName,
                @SecondaryPlanAddress1, @SecondaryPlanAddress2, @SecondaryPlanCity,
                @SecondaryPlanState, @SecondaryPlanZip, @SecondaryPlanPhone,
                @SecondaryPlanFax, @SecondaryPlanRequiresReferral, @SecondaryPlanIsActive,
                @TertiaryInsuranceId, @TertiaryInsuranceInsuredCardNumber,
                @TertiaryInsuranceGroupNumber, @TertiaryInsuranceEffectiveDate,
                @TertiaryInsuranceRequiresPreAuth, @TertiaryInsuranceCoId,
                @TertiaryInsuranceCoName, @TertiaryPlanId, @TertiaryPlanName,
                @TertiaryPlanAddress1, @TertiaryPlanAddress2, @TertiaryPlanCity,
                @TertiaryPlanState, @TertiaryPlanZip, @TertiaryPlanPhone,
                @TertiaryPlanFax, @TertiaryPlanRequiresReferral, @TertiaryPlanIsActive,
                @ReferringPhysicianId, @ReferringPhysicianNpi, @ReferringPhysicianEin,
                @ReferringPhysicianSpecialty, @ReferringPhysicianLastName,
                @ReferringPhysicianFirstName, @ReferringPhysicianMiddleInitial,
                @ReferringPhysicianAddress1, @ReferringPhysicianAddress2,
                @ReferringPhysicianCity, @ReferringPhysicianState, @ReferringPhysicianZip,
                @ReferringPhysicianHomePhone, @ReferringPhysicianWorkPhone,
                @ReferringPhysicianEmail, @ReferringPhysicianFax,
                'Pending', 'NRS Admin', @MsgCtrlId, NULL, NULL
            )
        ";

        await connection.ExecuteAsync(sql, r, commandTimeout: 60);
    }

    // ---------- MDM resend ----------

    public async Task<int> ResendMdmByAccessionAsync(List<string> accessionNumbers)
    {
        if (accessionNumbers.Count == 0) return 0;

        await using var connection = await CreateConnectionAsync();

        var procedureIds = (await connection.QueryAsync<long>(@"
            SELECT op.procedure_id
            FROM ris.order_procedures op
            INNER JOIN ris.orders o   ON op.order_id = o.order_id
            INNER JOIN ris.reports r  ON op.procedure_id = r.procedure_id
                                      AND r.report_type = 'TEXT'
                                      AND r.status IN ('signed', 'finalized', 'distributed')
            WHERE o.accession_number = ANY(@Accessions)
        ", new { Accessions = accessionNumbers.ToArray() })).ToList();

        if (procedureIds.Count > 0)
            await ResetProceduresForMdmResendAsync(connection, procedureIds);

        return procedureIds.Count;
    }

    public async Task<int> ResendMdmByDateAsync(DateTime startDateTime, DateTime endDateTime, long? physicianId)
    {
        await using var connection = await CreateConnectionAsync();

        var sql = @"
            SELECT op.procedure_id
            FROM ris.order_procedures op
            INNER JOIN ris.reports r ON op.procedure_id = r.procedure_id
                                     AND r.report_type = 'TEXT'
                                     AND r.status IN ('signed', 'finalized', 'distributed')
            WHERE op.procedure_date_start >= @StartDateTime
              AND op.procedure_date_start <= @EndDateTime
        ";
        var parameters = new DynamicParameters();
        parameters.Add("StartDateTime", startDateTime);
        parameters.Add("EndDateTime", endDateTime);

        if (physicianId.HasValue)
        {
            sql += " AND r.signing_physician_id = @PhysicianId";
            parameters.Add("PhysicianId", physicianId.Value);
        }

        var procedureIds = (await connection.QueryAsync<long>(sql, parameters)).ToList();

        if (procedureIds.Count > 0)
            await ResetProceduresForMdmResendAsync(connection, procedureIds);

        return procedureIds.Count;
    }

    private static async Task ResetProceduresForMdmResendAsync(Npgsql.NpgsqlConnection connection, List<long> procedureIds)
    {
        // Same multi-statement reset as the WPF tool. Triggers Novarad's MDM regeneration logic
        // by re-running the report-finalization workflow steps.
        const string sql = @"
            UPDATE ris.reports
                SET status = 'Signed'
                WHERE procedure_id = ANY(@Ids);

            UPDATE ris.order_procedure_steps
                SET status = NULL, completion_date = NULL, completed_by_user_id = NULL
                WHERE procedure_id = ANY(@Ids) AND description = 'Report Sent';

            UPDATE ris.order_procedure_steps
                SET status = 'Ready', completion_date = NULL, completed_by_user_id = NULL
                WHERE procedure_id = ANY(@Ids) AND description = 'Report Finalized';

            UPDATE ris.order_procedure_steps
                SET completion_date = CURRENT_DATE - INTERVAL '4 minutes'
                WHERE procedure_id = ANY(@Ids) AND description = 'Report Signed';

            UPDATE ris.order_procedures
                SET status = 'Report Signed'
                WHERE procedure_id = ANY(@Ids);
        ";

        await connection.ExecuteAsync(sql, new { Ids = procedureIds.ToArray() }, commandTimeout: 60);
    }

    // ---------- Physicians ----------

    public async Task<List<Hl7Physician>> GetPhysiciansAsync()
    {
        await using var connection = await CreateConnectionAsync();
        const string sql = @"
            SELECT
                phy.physician_id AS PhysicianId,
                (p.last_name || ', ' || p.first_name) AS PhysicianName
            FROM ris.people p
            INNER JOIN ris.physicians phy ON p.person_id = phy.person_id
            WHERE phy.is_referring_physician = '0'
              AND p.first_name NOT ILIKE '%test%'
              AND p.last_name  NOT ILIKE 'test'
            ORDER BY PhysicianName ASC
        ";
        return (await connection.QueryAsync<Hl7Physician>(sql)).ToList();
    }
}
