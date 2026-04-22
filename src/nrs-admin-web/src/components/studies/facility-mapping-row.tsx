'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, AlertTriangle, Pencil, RotateCcw } from 'lucide-react';
import { Facility, Site } from '@/lib/types';

/**
 * Editable facility/site comparison row for the Procedure Field Mapping panel.
 * Mirrors `SyncFieldRow`'s visual pattern but uses dropdowns in edit mode because
 * PACS uses <c>facility_id</c> (FK to shared.facilities) while RIS uses <c>site_code</c>
 * (string key into shared.sites) — different lookup tables, so dropdowns are required.
 */
interface FacilityMappingRowProps {
  /** Currently-pending PACS facility id (may differ from original while user is editing). */
  facilityId: number | null;
  /** Currently-pending RIS site code. */
  siteCode: string;
  /** The PACS facility id last received from the server — used to detect pending changes. */
  originalFacilityId: number | null;
  /** The RIS site code last received from the server. */
  originalSiteCode: string;
  facilities: Facility[];
  sites: Site[];
  onChange: (next: { facilityId: number | null; siteCode: string }) => void;
}

export function FacilityMappingRow({
  facilityId,
  siteCode,
  originalFacilityId,
  originalSiteCode,
  facilities,
  sites,
  onChange,
}: FacilityMappingRowProps) {
  const [editing, setEditing] = useState(false);
  const [editFacility, setEditFacility] = useState<number | null>(facilityId);
  const [editSite, setEditSite] = useState<string>(siteCode);

  const facilityChanged = facilityId !== originalFacilityId;
  const siteChanged = siteCode !== originalSiteCode;
  const anyChanged = facilityChanged || siteChanged;

  const facilityName = facilities.find((f) => f.facilityId === facilityId)?.name ?? '';
  const siteLabel = siteCode || '';

  // PACS and RIS use different dictionaries — strict string equality can't determine "match".
  // Heuristic: match when facility name contains or equals site code (case-insensitive).
  const pacsLower = facilityName.toLowerCase();
  const risLower = siteLabel.toLowerCase();
  const bothSet = !!facilityName && !!siteLabel;
  const isMatch = bothSet && (pacsLower === risLower || pacsLower.includes(risLower) || risLower.includes(pacsLower));
  const hasMismatch = bothSet && !isMatch;
  const bothEmpty = !facilityName && !siteLabel;

  function startEditing() {
    setEditFacility(facilityId);
    setEditSite(siteCode);
    setEditing(true);
  }

  function applyEdits() {
    onChange({ facilityId: editFacility, siteCode: editSite });
    setEditing(false);
  }

  function revert() {
    onChange({ facilityId: originalFacilityId, siteCode: originalSiteCode });
  }

  if (editing) {
    return (
      <div className="rounded-md border border-blue-500/40 bg-blue-500/5 px-3 py-1.5 text-xs space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-20 shrink-0 font-medium text-muted-foreground">Facility</span>

          {/* PACS Facility picker */}
          <div className="flex-1 min-w-0 flex items-center gap-1">
            <Badge variant="outline" className="shrink-0 text-[9px] h-4 px-1 text-blue-500 border-blue-500/30">PACS</Badge>
            <Select
              value={editFacility != null ? String(editFacility) : ''}
              onValueChange={(v) => setEditFacility(v ? Number(v) : null)}
            >
              <SelectTrigger className="h-6 text-xs flex-1"><SelectValue placeholder="Select facility" /></SelectTrigger>
              <SelectContent>
                {facilities.map((f) => (
                  <SelectItem key={f.facilityId} value={String(f.facilityId)}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="shrink-0 px-1 text-[10px] text-muted-foreground">
            {/* No cross-dictionary push — PACS facility_id and RIS site_code live in different tables. */}
            different lookups
          </div>

          {/* RIS Site picker */}
          <div className="flex-1 min-w-0 flex items-center gap-1">
            <Select
              value={editSite || ''}
              onValueChange={(v) => setEditSite(v)}
            >
              <SelectTrigger className="h-6 text-xs flex-1"><SelectValue placeholder="Select site" /></SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.siteId} value={s.siteCode}>
                    <span className="font-mono text-xs mr-1.5">{s.siteCode}</span>
                    {s.description && <span className="text-muted-foreground">— {s.description}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="shrink-0 text-[9px] h-4 px-1 text-purple-500 border-purple-500/30">RIS</Badge>
          </div>
        </div>

        <div className="flex items-center gap-1.5 justify-end">
          <Button size="sm" variant="ghost" className="h-5 text-[10px] px-2" onClick={() => setEditing(false)}>Cancel</Button>
          <Button size="sm" className="h-5 text-[10px] px-2" onClick={applyEdits}>Apply</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors ${
      anyChanged ? 'border-blue-500/40 bg-blue-500/5' :
      hasMismatch ? 'border-amber-500/40 bg-amber-500/5' :
      isMatch ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border'
    }`}>
      <span className="w-20 shrink-0 font-medium text-muted-foreground">Facility</span>

      {/* PACS facility name */}
      <div className="flex-1 min-w-0 flex items-center gap-1">
        <Badge variant="outline" className={`shrink-0 text-[9px] h-4 px-1 ${facilityChanged ? 'text-blue-600 border-blue-500 bg-blue-500/10 font-bold' : 'text-blue-500 border-blue-500/30'}`}>PACS</Badge>
        <span className={`truncate ${!facilityName ? 'text-muted-foreground italic' : ''} ${facilityChanged ? 'text-blue-600 font-semibold' : ''}`}>
          {facilityName || '—'}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-0.5 shrink-0">
        {bothEmpty ? (
          <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px]" onClick={startEditing}>
            <Pencil className="h-2.5 w-2.5 mr-0.5" /> Set
          </Button>
        ) : (
          <>
            {isMatch && !anyChanged && <Check className="h-3.5 w-3.5 text-emerald-500" />}
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={startEditing} title="Edit both"><Pencil className="h-2.5 w-2.5" /></Button>
            {anyChanged && <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-muted-foreground" onClick={revert} title="Revert"><RotateCcw className="h-2.5 w-2.5" /></Button>}
            {hasMismatch && !anyChanged && <AlertTriangle className="h-3 w-3 text-amber-500" />}
          </>
        )}
      </div>

      {/* RIS site code */}
      <div className="flex-1 min-w-0 flex items-center gap-1 justify-end">
        <span className={`truncate ${!siteLabel ? 'text-muted-foreground italic' : ''} ${siteChanged ? 'text-blue-600 font-semibold' : ''}`}>
          {siteLabel || '—'}
        </span>
        <Badge variant="outline" className={`shrink-0 text-[9px] h-4 px-1 ${siteChanged ? 'text-blue-600 border-blue-500 bg-blue-500/10 font-bold' : 'text-purple-500 border-purple-500/30'}`}>RIS</Badge>
      </div>
    </div>
  );
}
