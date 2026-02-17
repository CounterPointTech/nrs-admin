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
