# Key Decisions Log

This file tracks important architectural and design decisions.

---

### Decision: Target .NET 8 instead of .NET 10

**Context:** The `dotnet new` command generated a .NET 10 project (net10.0) since the SDK installed is 10.x. However, the plan specifies .NET 8 and Swashbuckle 10.x + Microsoft.OpenApi v2 has breaking namespace changes.
**Decision:** Retargeted to `net8.0` with compatible package versions (Swashbuckle 6.9.x, JWT 8.0.x, Npgsql 8.0.x, Serilog 8.0.x).
**Rationale:** .NET 8 is LTS, the plan specifies it, and it avoids OpenApi v2 breaking changes.
**Files Affected:** `src/NrsAdmin.Api/NrsAdmin.Api.csproj`

### Decision: Shadcn components at root vs src

**Context:** `npx shadcn@latest add` installs components to project root `components/ui/` and `lib/` by default, even though we use `src/` directory.
**Decision:** Copied components to `src/components/ui/` and created `src/lib/utils.ts` manually.
**Rationale:** Components.json aliases point to `@/components/ui` which maps to `./src/components/ui` via tsconfig paths.
**Files Affected:** `src/nrs-admin-web/src/components/ui/*`, `src/nrs-admin-web/src/lib/utils.ts`

### Decision: Safe delete pattern for modalities/modality types

**Context:** Deleting modalities or modality types that are referenced by foreign keys (order_procedures, modalities) would violate constraints.
**Decision:** Check for FK references before deleting. Return `(bool Deleted, bool HasReferences)` tuple from repository. Controller returns 409 Conflict with descriptive message when references exist.
**Rationale:** Matches the legacy tool's approach (Query.cs used temp tables for FK checks). Gives frontend clear error to display.
**Files Affected:** `ModalityRepository.cs`, `ModalityTypeRepository.cs`, `ModalitiesController.cs`, `ModalityTypesController.cs`

### Decision: MappingFileService — dual read/write modes (entries + raw)

**Context:** The mapping file can be edited as structured key=value entries or as raw text.
**Decision:** API supports both: GET/PUT `/mapping` for parsed entries, GET/PUT `/mapping/raw` for raw text. Backup is created automatically before any write.
**Rationale:** Visual table view is read-only (display parsed entries); raw Monaco editor is the primary editing mode. This avoids complex round-trip parsing issues while keeping visual view useful for quick reference.
**Files Affected:** `MappingFileService.cs`, `MappingController.cs`, `api.ts`

### Decision: AeMonitor graceful degradation

**Context:** `shared_local.events` and `shared_local.applications` tables may not exist on all Novarad installations. They're in the local DB, not the main DB.
**Decision:** AeMonitorRepository catches PostgresException with SqlState 42P01 (undefined_table) and returns empty list instead of throwing. Uses `CreateLocalConnectionAsync()`.
**Rationale:** AE monitoring is a nice-to-have feature; shouldn't break the app if local DB tables are absent. Warning logged for diagnostics.
**Files Affected:** `AeMonitorRepository.cs`

### Decision: In-memory refresh token storage

**Context:** Refresh tokens need to be stored server-side for validation.
**Decision:** Using `ConcurrentDictionary<int, RefreshTokenEntry>` in AuthService for now.
**Rationale:** Simple for dev/single-server deployment. Can be upgraded to Redis or a DB table later. Noted in code comment.
**Files Affected:** `src/NrsAdmin.Api/Services/AuthService.cs`

### Decision: Server-side pagination + sorting for study search

**Context:** Study tables can contain hundreds of thousands of rows — loading all client-side is infeasible.
**Decision:** Search uses server-side pagination (LIMIT/OFFSET) and sorting via dynamic SQL with a whitelist-based sort column resolver. PageSize clamped 1-200.
**Rationale:** Prevents performance issues and SQL injection. Frontend sends sort column name; backend maps to actual SQL column via allow-list.
**Files Affected:** `StudyRepository.cs`, `StudiesController.cs`, `studies/page.tsx`

### Decision: Studies are read-only in Phase 3

**Context:** Phase 3 focuses on data access and search — study update/edit deferred.
**Decision:** No PUT/PATCH endpoints for studies. Detail view is read-only with informational cards.
**Rationale:** Study data in PACS is primarily managed by the DICOM pipeline, not manual edits. Edit capability can be added in Phase 4 if needed.
**Files Affected:** `StudiesController.cs`, `studies/[id]/page.tsx`

### Decision: Remote connection via connection.json overlay

**Context:** NRS Admin hardcoded DB connection in appsettings.json. Users need to configure remote DB connections without editing config files.
**Decision:** Created `connection.json` as a custom IConfigurationSource that overrides appsettings.json. ConnectionSettingsService manages atomic read/write. All repositories switched from `IOptions<DatabaseSettings>` to `IOptionsMonitor<DatabaseSettings>` for hot-reload on save.
**Rationale:** Avoids modifying appsettings.json at runtime. IOptionsMonitor enables config hot-reload without app restart. Anonymous access to connection endpoints when DB is unconfigured (chicken-and-egg: can't auth against a DB that isn't configured).
**Files Affected:** `ConnectionSettings.cs`, `ConnectionJsonConfigurationSource.cs`, `ConnectionSettingsService.cs`, `ConnectionController.cs`, `BaseRepository.cs`, all 10 repo subclasses, `MappingFileService.cs`, `Program.cs`

### Decision: API port changed from 5000 to 5001

**Context:** Docker Desktop was occupying port 5000 on the dev machine, causing the API to fail to bind.
**Decision:** Changed API to port 5001 in launchSettings.json, appsettings.json, and frontend .env.local/api.ts.
**Rationale:** Port 5000 is commonly used by Docker/AirPlay on modern systems. 5001 avoids the conflict.
**Files Affected:** `launchSettings.json`, `appsettings.json`, `.env.local`, `api.ts`

### Decision: Physician name resolution via two-hop JOIN

**Context:** `pacs.studies.physician_id` references `ris.physicians.physician_id`, which has `person_id` referencing `ris.people.person_id`. Name is on `ris.people`.
**Decision:** Two LEFT JOINs: `ris.physicians` → `ris.people` for both referring physician and radiologist. Uses CONCAT_WS for null-safe name formatting.
**Rationale:** Matches Novarad's data model where physicians are a specialized view of people. Only used in detail view (GetByIdAsync) to avoid extra JOINs in search results.
**Files Affected:** `StudyRepository.cs`

### Decision: CPT code import uses two-step preview → execute flow

**Context:** Bulk importing CPT codes from CSV could introduce bad data (duplicates, invalid fields).
**Decision:** Two-step import: POST `/import/preview` parses CSV, validates rows, checks for duplicates against DB, returns preview. POST `/import/execute` accepts validated rows with `overwriteExisting` flag. Uses PostgreSQL `ON CONFLICT` for upserts.
**Rationale:** Prevents accidental data corruption. User sees validation errors and duplicate counts before committing. Round-trip compatible with export format.
**Files Affected:** `BillingCodeRepository.cs`, `CptCodesController.cs`, `CptImportResponses.cs`, `billing/cpt-codes/page.tsx`

### Decision: ICD delete with obsolete fallback

**Context:** ICD codes referenced by billing orders (via FK `billing_orders_icd_codes.icd_code_id`) cannot be deleted.
**Decision:** Delete endpoint returns 409 Conflict with message suggesting "mark as obsolete instead". Frontend toast includes a one-click "Mark Obsolete" action button. Obsolete codes get `obsolete_date = NOW()`, restore clears it to NULL.
**Rationale:** Medical coding standards require keeping historical ICD codes for audit trails. Obsolete is the standard workflow — soft-delete via date stamp rather than hard delete.
**Files Affected:** `IcdCodeRepository.cs`, `IcdCodesController.cs`, `billing/icd-codes/page.tsx`

### Decision: Report template directory configurable via connection.json

**Context:** Report template settings had a config section in appsettings.json but weren't wired into the connection.json overlay system, so there was no UI to configure the template directory path.
**Decision:** Added ReportTemplateConnectionSettings to ConnectionSettings model, wired into ConnectionJsonConfigurationProvider, controller GET/PUT, and frontend Settings > Connection tab with browse buttons.
**Rationale:** Follows exact same pattern as MappingFile settings. IOptionsMonitor picks up changes immediately without restart.
**Files Affected:** `ConnectionSettings.cs`, `ConnectionJsonConfigurationSource.cs`, `ConnectionResponses.cs`, `ConnectionRequests.cs`, `ConnectionController.cs`, `types.ts`, `settings/page.tsx`

### Decision: Visual tab CRUD for mapping editor

**Context:** The Visual tab was read-only — users had to manually type key=value format in the Raw Editor to add/edit mappings, which was error-prone.
**Decision:** Added add/edit/delete dialogs to the Visual tab using `mappingApi.saveEntries()`. Includes a collapsible "How Mapping Works" guide with visual flow diagram and field reference.
**Rationale:** `saveEntries()` endpoint already existed but was unused. Backend handles validation, serialization, and backup. Comment lines are preserved through the entries array.
**Files Affected:** `modalities/mapping/page.tsx`

### Decision: Remove HL7 section from app

**Context:** User says the HL7 configuration UI (Phase 5) is not helpful for their use case.
**Decision:** Remove HL7 from navigation sidebar and app in next session. Backend APIs can remain for potential future use.
**Rationale:** User preference — they want to focus on more useful features like unified settings management.
**Files Affected:** (planned for next session) `nav-sidebar.tsx`, potentially HL7 page files

### Decision: Fix connection.json password preservation on save

**Context:** When saving connection settings from the frontend, the password field is cleared after save for security (`setDbPassword('')`). On subsequent saves, the empty password overwrites the existing password in connection.json. After API restart, the connection fails because the stored password is empty.
**Decision:** Added guard in `ConnectionController.SaveSettings`: if `db.Password` is empty/null and an existing password exists, preserve the existing password.
**Rationale:** Prevents silent data loss of credentials. The frontend intentionally clears the password field after save — the backend must handle this by treating empty password as "no change" rather than "set to empty."
**Files Affected:** `ConnectionController.cs` (SaveSettings method)

### Decision: Separate NRS Admin settings from Novarad DB settings

**Context:** The unified settings page mixed NRS Admin app configuration (connection.json — DB host, mapping file, template dirs) with Novarad database settings (shared.settings, site.settings, pacs.settings, etc.). User explicitly wants these in separate sections — they are conceptually different things.
**Decision:** (PENDING — to be implemented next session) NRS Admin connection/app settings should be in their own distinct section, separate from the Novarad database settings manager. The Novarad settings categories (DICOM, Archive, Security, etc.) should only contain settings from the 7 database tables.
**Rationale:** NRS Admin config is about configuring THIS app; Novarad settings are about configuring the radiology system. Mixing them is confusing.
**Files Affected:** (next session) `settings/page.tsx`, possibly new route or tabs

### Decision: Separate NRS Admin config from Novarad settings — distinct nav sections

**Context:** The unified settings page mixed NRS Admin app configuration (connection.json) with Novarad database settings. User explicitly wanted them separated.
**Decision:** Created `/configuration` route for NRS Admin config (connection.json — DB, mapping file, template dirs) with its own "Configuration" nav item under System. Settings page shows only Novarad DB settings. Added "Novarad" nav section with "Novarad Settings" link.
**Rationale:** NRS Admin config is about configuring THIS app; Novarad settings configure the radiology system. Clear separation avoids confusion.
**Files Affected:** `configuration/page.tsx` (new), `nav-sidebar.tsx`, `settings/page.tsx`, `connection-settings-card.tsx`

### Decision: Source-based settings categories instead of semantic categorization

**Context:** The original settings categories used regex/static-map guessing to assign settings to semantic categories (DICOM, Security, HL7, etc.). User preferred organizing by actual database source tables.
**Decision:** Replaced 10 semantic categories + 160 lines of categorization logic with 7 source-based categories: Shared, Site, PACS, PACS Options, RIS, RIS Options, Object Store. `categorizeAll()` now simply groups by `setting.source`.
**Rationale:** Direct mapping to Novarad DB tables is more intuitive for admins who know the system. No guessing, no maintenance of regex rules.
**Files Affected:** `settings-categories.ts` (complete rewrite), `settings-category-sidebar.tsx`

### Decision: GrapesJS CSS loaded via public/ instead of bundler

**Context:** Dynamic `import('grapesjs/dist/css/grapes.min.css')` and `@import` in globals.css both failed to load GrapesJS CSS properly through Next.js Turbopack/Tailwind pipeline.
**Decision:** Copied `grapes.min.css` to `public/css/` and inject a `<link>` tag dynamically when the GrapesJS component loads.
**Rationale:** Bypasses all bundler/PostCSS/Tailwind processing. The CSS loads as a static file, guaranteed to work.
**Files Affected:** `public/css/grapes.min.css` (new), `grapesjs-editor.tsx`, `globals.css`

### Decision: Report templates are filesystem-based, not DB-stored

**Context:** Novarad report templates are .htm files on disk. `ris.facility_details.report_template_name` stores just the filename per facility.
**Decision:** Template editor will read/write .htm files via API (similar to MappingFileService pattern). Templates use HTML comment placeholders like `<!--PatientName-->`, `<!--ReportText-->`, etc.
**Rationale:** Matches Novarad's existing architecture. No DDL needed. Templates can be backed up and versioned like mapping files.
**Files Affected:** (planned for next session)

---

### Decision: External Tools launches via backend Process.Start (host-side execution)

**Context:** Users want to launch desktop apps, CLI commands, and file/folder shortcuts from NRS Admin. Browsers can't invoke arbitrary executables directly; options were custom URI scheme handler, local helper HTTP listener, or backend Process.Start.
**Decision:** Launches fire via `POST /api/v1/external-tools/{id}/launch` which calls `Process.Start` on the API host. Commands use `cmd /c start "Title" shell /k <cmd>` to reliably spawn a new console window (avoids inheriting the API host's console). Elevated launches skip the `start` trick and use `UseShellExecute=true + Verb="runas"` directly, which ShellExecute handles natively with UAC.
**Rationale:** Simplest zero-install path. Works for on-prem deploys where the API runs on the admin's workstation (the common case). UI surfaces a one-time warning that non-URL launches execute on the API host machine. Future v2 could add a client-side URI-scheme helper for centralized API deploys where the admin's browser is on a different machine.
**Files Affected:** `src/NrsAdmin.Api/Services/ExternalToolsService.cs`, `src/NrsAdmin.Api/Controllers/V1/ExternalToolsController.cs`, `src/nrs-admin-web/src/components/tools/*`

### Decision: ServicesMonitor:Host driven by NovaradServer.Host in connection.json

**Context:** The Services dashboard card queries Windows services via `ServiceController.GetServices(machineName)`. Needed a way to point at the actual PACS/RIS host, which is often a different machine from the database host.
**Decision:** Added `NovaradServer.Host` to `connection.json` (edited via the Configuration page). The `ConnectionJsonConfigurationProvider` maps `NovaradServer.Host` → `ServicesMonitor:Host` at load/reload time so `IOptionsMonitor<ServicesMonitorSettings>` picks it up hot.
**Rationale:** Single source of truth for "where Novarad runs" that can be extended to future features (remote log tails, remote file browsing) without touching each feature's config. Separates this cleanly from `Database.Host`.
**Files Affected:** `src/NrsAdmin.Api/Configuration/ConnectionSettings.cs`, `src/NrsAdmin.Api/Configuration/ConnectionJsonConfigurationSource.cs`, `src/nrs-admin-web/src/components/settings/connection-settings-card.tsx`

### Decision: Study ↔ Order ↔ Procedure treated as strict 1:1 in the UI

**Context:** The Orders tab rendered orders as first-class expandable containers with merge-orders + merge-procedures buttons, but a senior tech confirmed Novarad operates 1:1 between Study, Order, and Procedure. The "order" is just a DB container.
**Decision:** Renamed tab to "Procedure", flattened the UI to a single card, removed merge dialogs entirely, relabeled order-level fields inside the procedure card without the "order" word. One Save button fans out updateRisOrder + updateRisProcedure in parallel.
**Rationale:** Matches the actual domain model users have in their heads. Removes dead UI (merge buttons) that could produce garbage data. Simplifies the view substantially.
**Files Affected:** `src/nrs-admin-web/src/components/studies/procedure-tab.tsx` (new), `src/app/(app)/studies/[id]/page.tsx`, `src/components/studies/panel-layout.tsx`. Deleted: `orders-procedures-tab.tsx`, `merge-order-dialog.tsx`, `merge-procedure-dialog.tsx`.

### Decision: Procedure Field Mapping grouped into Linking vs Descriptive

**Context:** The mapping panel mixed linker fields (StudyUID, Date, Modality) with descriptive fields (StudyDescription, Facility). Accession — Novarad's other primary matcher alongside StudyUID — was missing entirely.
**Decision:** Grouped into two subsections: "Linking Fields · Used to match PACS ↔ RIS" (Accession, Study UID, Study Date, Modality) and "Descriptive · Informational; not used for matching" (Description, Facility). Added Accession to `OrderComparison` and the sync-field list.
**Rationale:** Per `Documents/Novarad Analysis/Documents/workflows/hl7-order-to-study.md` step 11, Novarad matches on "StudyInstanceUID or accession number". Mismatches on linkers can silently break `pacs.studies.ris_procedure_id`; mismatches on descriptive fields are just cosmetic drift. The grouping makes the severity visually obvious.
**Files Affected:** `src/NrsAdmin.Api/Models/Domain/RisModels.cs`, `src/NrsAdmin.Api/Repositories/RisRepository.cs`, `src/nrs-admin-web/src/components/studies/procedure-tab.tsx`, `src/nrs-admin-web/src/lib/types.ts`

### Decision: Workflow step statuses use real Novarad values

**Context:** Earlier code used `PENDING` as a placeholder status; the pg_dump shows Novarad's actual function `ris.order_procedure_undo_steps` writes only `COMPLETE`, `CANCELLED`, `READY`, or `NULL`.
**Decision:** `stepStatusIcon` / `stepStatusLabel` switched to real values. NULL renders as "NOT STARTED" with a dashed circle icon. Timeline also filters out `is_disabled=true` standard_steps rows (Vetted/Arrived/Scan Verified in this install).
**Rationale:** Code comment cites the source function so future edits don't drift. Using real values means any future procedure.status lookups can reliably compare.
**Files Affected:** `src/nrs-admin-web/src/components/studies/procedure-tab.tsx`
