# Session Handoff

**Date:** 2026-02-27
**Session:** 11

## What Was Accomplished

### 1. Settings Separation (DONE)
- Created `/configuration` route for NRS Admin app config (connection.json — DB, mapping file, template dirs)
- Added `defaultExpanded` prop to `ConnectionSettingsCard` so it opens expanded on the dedicated page
- Added "Novarad" nav section with "Novarad Settings" link → `/settings`
- Added "System" nav section with "Configuration" link → `/configuration`
- Removed `ConnectionSettingsCard` from the settings page entirely
- Updated settings page description to clarify it's Novarad-only

### 2. Source-Based Settings Categories (DONE)
- **Complete rewrite** of `settings-categories.ts`: replaced 10 semantic categories (DICOM, Security, HL7, etc.) + 160 lines of regex/static-map categorization with 7 source-based categories
- Categories now map directly to DB source tables: Shared, Site, PACS, PACS Options, RIS, RIS Options, Object Store
- `categorizeAll()` groups by `setting.source` — no guessing, no maintenance
- Each category has its own icon and color: Share2/blue, Building2/emerald, HardDrive/cyan, SlidersHorizontal/teal, Monitor/violet, Settings/pink, Database/amber
- Novarad settings confirmed loading from DB

### 3. GrapesJS Visual Editor Fixes (PARTIAL)
- **Fixed content preservation**: Code→Visual→Code no longer wipes content
  - Added `extractBody()`/`wrapBody()` to preserve `<html>/<head>/<style>` document structure
  - Added `readyRef` init guard to prevent onChange during GrapesJS initialization events
- **Fixed refresh crash**: Replaced `gjsEditor.refresh()` (which crashed on v0.22 because Canvas module wasn't ready) with `canvas:frame:load` event listener
- **Fixed CSS loading**: Copied `grapes.min.css` to `public/css/`, load via `<link>` tag instead of broken dynamic import
- **STILL BROKEN**: Canvas is blank. Console error: `Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed and the 'allow-scripts' permission is not set`

## The GrapesJS Sandbox Bug — Key Details for Next Session

The **remaining issue** is that GrapesJS creates an iframe for its canvas and writes content via `doc.open()/write()/close()`. The browser is blocking script execution in that iframe because it considers it "sandboxed."

### What we know:
- Error: `about:srcdoc:1 Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed and the 'allow-scripts' permission is not set`
- GrapesJS v0.22.14 `FrameView` creates an iframe with `{ allowfullscreen: 'allowfullscreen' }` attributes — no explicit sandbox attribute
- The `template-preview.tsx` component uses `sandbox="allow-same-origin"` (without `allow-scripts`) but that's a **different iframe** only shown in code mode — NOT the GrapesJS canvas
- The GrapesJS CSS is loading correctly now (via `/css/grapes.min.css`)

### Likely causes to investigate:
1. **Next.js CSP headers** — Check if next.config.js/ts or middleware adds Content-Security-Policy headers that restrict iframe script execution
2. **GrapesJS canvas frame config** — Check if v0.22 has canvas frame options for sandbox/permissions
3. **Browser policy** — Check if the iframe inherits restrictions from the parent page context
4. **Try `canvas: { frameContent: '...' }` option** — GrapesJS v0.22 may support custom frame content with script tags enabled

### Key files to read:
- `src/nrs-admin-web/src/components/reports/grapesjs-editor.tsx` — current state of the editor
- `src/nrs-admin-web/next.config.ts` — check for CSP headers
- `node_modules/grapesjs/dist/grapes.mjs` lines ~33394-33700 — FrameView implementation

## Files Created
- `src/nrs-admin-web/src/app/(app)/configuration/page.tsx` — NRS Admin config page
- `src/nrs-admin-web/public/css/grapes.min.css` — GrapesJS CSS for reliable loading

## Files Modified
- `src/nrs-admin-web/src/components/nav-sidebar.tsx` — Added Novarad + System sections, Wrench icon
- `src/nrs-admin-web/src/app/(app)/settings/page.tsx` — Removed connection card, Novarad-only
- `src/nrs-admin-web/src/lib/settings-categories.ts` — Complete rewrite to source-based categories
- `src/nrs-admin-web/src/components/settings/settings-category-sidebar.tsx` — Simplified
- `src/nrs-admin-web/src/components/settings/connection-settings-card.tsx` — Added defaultExpanded prop
- `src/nrs-admin-web/src/components/reports/grapesjs-editor.tsx` — Multiple fixes (init guard, doc preservation, CSS loading, refresh fix)
- `src/nrs-admin-web/src/app/globals.css` — Removed broken grapesjs CSS import

## Current State
- features.json updated: yes (unified-settings-redesign=done, report-template-editor=in_progress with blocker)
- decisions.md updated: yes (3 new decisions: settings separation, source categories, GrapesJS CSS)
- Both `dotnet build` and `npm run build` pass clean
- No commits made this session

## Next Steps
1. **Fix GrapesJS blank canvas** — Investigate the iframe sandbox error. Check CSP headers, try canvas frame config options, or consider an alternative WYSIWYG (TinyMCE, CKEditor) if GrapesJS can't be made to work
2. **Test Visual editor** once canvas renders — drag-and-drop placeholders, template editing
3. **Commit all changes** — large batch of uncommitted work from sessions 10-11

## Quick Start Commands
```bash
cd "F:/iPro/Dev/Projects/NRS Admin"
cat .claude/state/active-session.json  # Check session state
cat .claude/state/features.json | head -50  # Check feature status
```
