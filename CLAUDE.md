# NRS Admin

Administrative web application for managing Novarad NovaPACS/NovaRIS radiology systems.

---

## Project Overview

NRS Admin is a modern web-based administration tool for Novarad's radiology platform. It provides configuration management, monitoring, and operational tools for DICOM imaging networks, RIS workflows, and PACS infrastructure.

### Domain Context

- **Novarad** — Radiology software vendor (NovaPACS, NovaRIS products)
- **PACS** — Picture Archiving and Communication System (medical image storage/retrieval)
- **RIS** — Radiology Information System (orders, scheduling, reporting)
- **DICOM** — Digital Imaging and Communications in Medicine (standard protocol)
- **HL7** — Health Level 7 (healthcare messaging standard)
- **AE Title** — Application Entity Title (unique DICOM device identifier)
- **Modality** — Imaging equipment type (CT, MRI, US, XR, etc.)
- **Worklist** — Scheduled procedures sent to modalities via DICOM MWL

### Reference Projects

These are in `Reference Projects/` for architectural guidance — do not modify them.

- **NRS-Modality-Mapping-Tool-master** — Legacy WinForms (.NET 4.8) tool for DICOM modality-to-RIS mappings. Shows domain patterns, DB queries, and Novarad data model usage.
- **Transfix Frontend** — Modern Next.js 16 / React 19 application with DICOM routing pipelines. Use as the primary reference for tech stack, UI patterns, and API conventions.

---

## Tech Stack

Based on the Transfix Frontend reference and project direction:

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| UI Components | shadcn/ui (new-york style) + Radix UI |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Forms | React Hook Form + Zod validation |
| Tables | TanStack React Table |
| Charts | Recharts |
| Code Editor | Monaco Editor |
| Notifications | Sonner (toast) |
| Theming | next-themes (light/dark) |
| Database | PostgreSQL 14 (via Novarad) |

---

## Database

### Connection

- PostgreSQL 14.18 via Npgsql
- Owner: `nrsvc`
- Schema dump: `Documents/novarad_db_schema.sql` (308 tables)

### Schemas

| Schema | Purpose |
|--------|---------|
| `ris` | RIS data — modalities, orders, patients, physicians, reports, HL7 |
| `pacs` | PACS data — routing, destinations, DICOM labels, archive ops, studies |
| `shared` | Cross-system — facilities, users, roles, settings, HL7 config, auth |
| `object_store` | Storage — archive stats, replication, transactions, scopes |
| `site` | Site admin — backups, locks, maintenance, settings |

### Key Tables

**RIS:**
`ris.modalities`, `ris.modality_types`, `ris.order_procedures`, `ris.order_procedure_steps`, `ris.orders`, `ris.patients`, `ris.people`, `ris.physicians`, `ris.reports`, `ris.internal_users`, `ris.hl7_field_mapping`, `ris.hl7_message_forwarding`

**PACS:**
`pacs.destinations`, `pacs.route_history`, `pacs.dicom_labels`, `pacs.abstract_syntaxes`, `pacs.view_settings`, `pacs.datasets_status`, `pacs.archive_operations`

**Shared:**
`shared.facilities`, `shared.users`, `shared.roles`, `shared.medical_groups`, `shared.settings`, `shared.hl7_locations`, `shared.hl7_message_destinations`, `shared.procedure_codes`, `shared.active_sessions`

---

## Project Conventions

### File Structure (Target)

```
src/
├── app/                    # Next.js App Router pages
│   ├── (app)/              # Authenticated route group
│   │   ├── dashboard/
│   │   ├── modalities/
│   │   └── ...
│   ├── login/
│   └── layout.tsx
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   └── [feature]/          # Feature-specific components
├── lib/
│   ├── api/                # API client modules
│   ├── auth/               # Auth context and utilities
│   └── utils.ts            # Shared utilities
├── hooks/                  # Custom React hooks
└── types/                  # TypeScript type definitions
```

### Code Style

- Use `'use client'` directive only on components requiring browser APIs or React state
- Prefer server components where possible for performance
- Path alias: `@/*` maps to `./src/*`
- Use CVA (class-variance-authority) for component variants
- Use `cn()` helper (clsx + tailwind-merge) for conditional classes

### API Patterns

Follow the Transfix Frontend conventions:

```typescript
// Standard API response wrapper
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

// Paginated responses
interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}
```

- Use `fetchWithAuth` wrapper for all API calls
- Bearer token authentication with auto-refresh on 401
- API base URL from `NEXT_PUBLIC_API_URL` environment variable
- Organize API functions by domain (e.g., `modalityApi`, `facilityApi`)

### Component Patterns

- Use React Hook Form + Zod for all form validation
- Use TanStack React Table for data tables with sorting/filtering/pagination
- Use Sonner for toast notifications
- Loading states with skeleton UI
- Error boundaries at route level

### Color System

- OKLch color space with CSS custom properties
- Dark mode: medical/DICOM aesthetic with teal/cyan primary
- Light mode: clean, clinical palette
- Support both via `next-themes`

---

## Development

### Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # ESLint check
```

---

## Key Documents

| File | Purpose |
|------|---------|
| `Documents/novarad_db_schema.sql` | Full PostgreSQL schema dump (308 tables) |
| `Documents/modality_mapping.txt` | DICOM modality mapping config format reference |
| `.claude/state/features.json` | Feature/task tracking |
| `.claude/state/decisions.md` | Architectural decisions log |

---

## Rules

### Healthcare Data

- Never log or expose PHI (Protected Health Information) in client-side code
- Sanitize all patient-related data in error messages and logs
- Follow HIPAA minimum necessary principle — only query/display data needed for the task

### DICOM Specifics

- DICOM tags use format `(GGGG,EEEE)` — always validate tag format
- AE Titles are max 16 characters, uppercase alphanumeric + limited special chars
- Modality types use standard DICOM codes: CT, MR, US, XA, CR, DX, MG, NM, PT, etc.
- Use the fo-dicom-reference and dicom-conformance skills when working with DICOM elements

### Database

- Never run DDL (CREATE, ALTER, DROP) against the Novarad database — it is managed externally
- Use parameterized queries for all database access — no string concatenation
- Respect schema ownership (`nrsvc`) and existing constraints
- Read-only access to production data by default; write operations require explicit confirmation
