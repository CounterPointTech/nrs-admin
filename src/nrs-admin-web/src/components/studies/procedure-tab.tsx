'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  ClipboardList,
  Stethoscope,
  Pencil,
  Save,
  X,
  Loader2,
  Check,
  Clock,
  CircleDashed,
  XCircle,
  AlertTriangle,
  Zap,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  UnifiedStudyDetail,
  RisOrder,
  RisOrderProcedure,
  UpdateRisOrderRequest,
  UpdateRisOrderProcedureRequest,
  SyncTarget,
  Facility,
  Site,
} from '@/lib/types';
import { studyApi, facilityApi, siteApi } from '@/lib/api';
import { SyncFieldRow, SyncFieldState } from './sync-field-row';
import { FacilityMappingRow } from './facility-mapping-row';
import { PhysicianPicker } from './physician-picker';

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Convert an ISO datetime string to the `YYYY-MM-DDTHH:mm` form required by <input type="datetime-local">. */
function toDatetimeLocal(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert a datetime-local value back to an ISO string (or null for empty). */
function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function orderStatusVariant(status?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status?.toLowerCase()) {
    case 'complete': case 'completed': return 'default';
    case 'cancelled': return 'destructive';
    case 'scheduled': return 'secondary';
    default: return 'outline';
  }
}

/**
 * Step status rendering. Values come from <c>ris.order_procedure_steps.status</c>
 * which is set by Novarad's workflow SQL functions. Real values observed:
 *   'COMPLETE'   — step finished
 *   'CANCELLED'  — step skipped
 *   'READY'      — current / next step to perform
 *    null        — not yet reached (future step)
 * (See `Documents/Novarad Analysis/Documents/novarad_database` fn `order_procedure_undo_steps`.)
 */
function stepStatusIcon(status?: string | null) {
  switch (status?.toUpperCase()) {
    case 'COMPLETE': return <Check className="h-4 w-4 text-emerald-500" />;
    case 'CANCELLED': return <XCircle className="h-4 w-4 text-red-500" />;
    case 'READY': return <Clock className="h-4 w-4 text-blue-500" />;
    default: return <CircleDashed className="h-4 w-4 text-muted-foreground/50" />;
  }
}

function stepStatusLabel(status?: string | null): string {
  switch (status?.toUpperCase()) {
    case 'COMPLETE': return 'COMPLETE';
    case 'CANCELLED': return 'CANCELLED';
    case 'READY': return 'READY';
    default: return 'NOT STARTED';
  }
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || '—'}</span>
    </div>
  );
}

interface Props {
  data: UnifiedStudyDetail;
  onDataChange: (data: UnifiedStudyDetail) => void;
}

// Sync-field definitions — grouped by purpose.
//
// **Linking** fields are the ones Novarad uses to correlate PACS studies with RIS
// procedures (see Documents/Novarad Analysis/Documents/workflows/hl7-order-to-study.md
// step 11). Mismatches on these are serious — the link can silently break.
//
// **Descriptive** fields are informational; mismatches there are cosmetic drift.
const LINKING_SYNC_FIELDS = ['accession', 'studyUid', 'studyDate', 'modality'] as const;
const DESCRIPTIVE_SYNC_FIELDS = ['studyDescription'] as const;
const PROCEDURE_SYNC_FIELDS = [...LINKING_SYNC_FIELDS, ...DESCRIPTIVE_SYNC_FIELDS] as const;
type ProcedureSyncFieldName = typeof PROCEDURE_SYNC_FIELDS[number];

const PROCEDURE_SYNC_LABELS: Record<ProcedureSyncFieldName, string> = {
  accession: 'Accession',
  studyUid: 'Study UID',
  studyDate: 'Study Date',
  modality: 'Modality',
  studyDescription: 'Description',
};

function buildProcedureSyncOriginals(data: UnifiedStudyDetail): Record<ProcedureSyncFieldName, SyncFieldState> {
  const oc = data.orderComparison;
  return {
    accession: { pacsValue: oc.pacsAccession || '', risValue: oc.risAccession || '' },
    studyUid: { pacsValue: oc.pacsStudyUid || '', risValue: oc.risStudyUid || '' },
    studyDate: { pacsValue: oc.pacsStudyDate || '', risValue: oc.risProcedureDate || '' },
    modality: { pacsValue: oc.pacsModality || '', risValue: oc.risModality || '' },
    studyDescription: { pacsValue: oc.pacsStudyDescription || '', risValue: oc.risDescription || '' },
  };
}

export function ProcedureTab({ data, onDataChange }: Props) {
  const { study, orders, procedures, orderComparison } = data;

  // Novarad is 1:1 Study ↔ Order ↔ Procedure — just take the first pair.
  const order: RisOrder | null = orders[0] ?? null;
  const procedure: RisOrderProcedure | null = useMemo(() => {
    if (!order) return null;
    return procedures.find((p) => p.orderId === order.orderId) ?? procedures[0] ?? null;
  }, [order, procedures]);

  const [editing, setEditing] = useState(false);
  const [orderForm, setOrderForm] = useState<UpdateRisOrderRequest>({});
  const [procForm, setProcForm] = useState<UpdateRisOrderProcedureRequest>({});
  const [procPhysicianName, setProcPhysicianName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Facility / Site lookups — loaded once per mount, reused in the edit form.
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  useEffect(() => {
    let cancelled = false;
    Promise.all([facilityApi.getAll(), siteApi.getAll()]).then(([fRes, sRes]) => {
      if (cancelled) return;
      if (fRes.success && fRes.data) setFacilities(fRes.data);
      if (sRes.success && sRes.data) setSites(sRes.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync-field state (PACS ↔ RIS mapping)
  const originals = buildProcedureSyncOriginals(data);
  const [syncFields, setSyncFields] = useState<Record<ProcedureSyncFieldName, SyncFieldState>>(
    () => buildProcedureSyncOriginals(data)
  );
  const [syncSaving, setSyncSaving] = useState(false);

  // Inline facility/site selections in the mapping panel — always editable, committed via Save Mapping.
  const originalFacilityId = study.facilityId ?? null;
  const originalSiteCode = orders[0]?.siteCode ?? '';
  const [pendingFacilityId, setPendingFacilityId] = useState<number | null>(originalFacilityId);
  const [pendingSiteCode, setPendingSiteCode] = useState<string>(originalSiteCode);

  // Keep inline selections in sync when the upstream data changes (e.g., after a save refresh).
  useEffect(() => {
    setPendingFacilityId(study.facilityId ?? null);
    setPendingSiteCode(orders[0]?.siteCode ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study.facilityId, orders[0]?.siteCode]);

  const facilityPending = pendingFacilityId !== originalFacilityId;
  const sitePending = pendingSiteCode !== originalSiteCode;

  const pendingSyncChanges = PROCEDURE_SYNC_FIELDS.filter((f) => {
    const o = originals[f];
    const c = syncFields[f];
    return o.pacsValue !== c.pacsValue || o.risValue !== c.risValue;
  });

  function startEdit() {
    if (!order || !procedure) return;
    setOrderForm({
      description: order.description ?? '',
      notes: order.notes ?? '',
      patientComplaint: order.patientComplaint ?? '',
      physicianReason: order.physicianReason ?? '',
      customField1: order.customField1 ?? '',
      customField2: order.customField2 ?? '',
      customField3: order.customField3 ?? '',
      customField4: order.customField4 ?? '',
    });
    setProcForm({
      notes: procedure.notes ?? '',
      schedulerNotes: procedure.schedulerNotes ?? '',
      customField1: procedure.customField1 ?? '',
      customField2: procedure.customField2 ?? '',
      customField3: procedure.customField3 ?? '',
      assignedPhysicianId: procedure.assignedPhysicianId ?? null,
      patientClass: procedure.patientClass ?? '',
      patientLocation: procedure.patientLocation ?? '',
      visitNumber: procedure.visitNumber ?? '',
      checkInTime: procedure.checkInTime ?? null,
      procedureDateStart: procedure.procedureDateStart ?? null,
      procedureDateEnd: procedure.procedureDateEnd ?? null,
      statFlag: procedure.statFlag,
    });
    setProcPhysicianName(procedure.assignedPhysicianName ?? null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function save() {
    if (!order || !procedure) return;
    setSaving(true);
    try {
      const [orderRes, procRes] = await Promise.all([
        studyApi.updateRisOrder(study.id, order.orderId, orderForm),
        studyApi.updateRisProcedure(study.id, procedure.procedureId, procForm),
      ]);

      const latest = procRes.success && procRes.data
        ? procRes.data
        : orderRes.success && orderRes.data
          ? orderRes.data
          : null;

      if (latest) {
        onDataChange(latest);
        setEditing(false);
        toast.success('Procedure updated');
      } else {
        toast.error(procRes.message || orderRes.message || 'Update failed');
      }
    } catch {
      toast.error('Failed to update procedure');
    } finally {
      setSaving(false);
    }
  }

  async function commitSyncChanges() {
    setSyncSaving(true);
    try {
      // Text sync fields (study description, study uid, study date, modality)
      for (const field of pendingSyncChanges) {
        const o = originals[field];
        const c = syncFields[field];
        const pacsChanged = o.pacsValue !== c.pacsValue;
        const risChanged = o.risValue !== c.risValue;
        const target: SyncTarget = pacsChanged && risChanged ? 'Both'
          : pacsChanged ? 'Pacs' : 'Ris';
        const value = pacsChanged ? c.pacsValue : c.risValue;
        await studyApi.syncField(study.id, { fieldName: field, value, target });
      }

      // Facility (PACS) and Site (RIS) — direct updates since they're FK/code, not sync-field table entries.
      const tasks: Promise<unknown>[] = [];
      if (facilityPending && pendingFacilityId != null) {
        tasks.push(studyApi.update(study.id, { facilityId: pendingFacilityId }));
      }
      if (sitePending && order) {
        tasks.push(studyApi.updateRisOrder(study.id, order.orderId, { siteCode: pendingSiteCode }));
      }
      if (tasks.length > 0) await Promise.all(tasks);

      const refreshed = await studyApi.getUnified(study.id);
      if (refreshed.success && refreshed.data) {
        onDataChange(refreshed.data);
        setSyncFields(buildProcedureSyncOriginals(refreshed.data));
        toast.success('Procedure fields synced');
      }
    } catch {
      toast.error('Failed to sync fields');
    } finally {
      setSyncSaving(false);
    }
  }

  function discardSyncChanges() {
    setSyncFields(buildProcedureSyncOriginals(data));
    setPendingFacilityId(originalFacilityId);
    setPendingSiteCode(originalSiteCode);
  }

  if (!order || !procedure) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium mb-1">No RIS procedure linked</p>
          <p className="text-sm text-muted-foreground">
            Link this study to a RIS order to view the procedure, scheduling, and workflow steps.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasDiscrepancies = orderComparison.discrepancies.length > 0;
  const hasSyncPending = pendingSyncChanges.length > 0 || facilityPending || sitePending;

  return (
    <div className="space-y-4">
      <Card>
        {/* Procedure Header */}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-base flex-wrap">
                <Stethoscope className="h-4 w-4 shrink-0" />
                <span className="truncate">{procedure.procedureName || `Procedure #${procedure.procedureId}`}</span>
                {procedure.modalityName && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {procedure.modalityType || procedure.modalityName}
                  </Badge>
                )}
                <Badge variant={orderStatusVariant(procedure.status)} className="text-xs">
                  {procedure.status || 'Unknown'}
                </Badge>
                {procedure.statFlag && !editing && (
                  <Badge variant="destructive" className="text-xs gap-0.5">
                    <Zap className="h-3 w-3" /> STAT
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                {order.accessionNumber && <span className="font-mono">ACC: {order.accessionNumber}</span>}
                {order.siteName && <span>{order.siteName}</span>}
                <span>Created {formatDateTime(order.creationDate)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {editing ? (
                <>
                  <Button size="sm" onClick={save} disabled={saving} className="gap-1 h-7">
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving} className="h-7">
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" onClick={startEdit} className="h-7 gap-1">
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Scheduling & Assignment */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Scheduling &amp; Assignment
            </h3>
            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs">Assigned Physician</Label>
                  <PhysicianPicker
                    value={procForm.assignedPhysicianId ?? null}
                    valueDisplayName={procPhysicianName}
                    onChange={(id, name) => {
                      setProcForm({ ...procForm, assignedPhysicianId: id });
                      setProcPhysicianName(name);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Patient Class</Label>
                  <Input
                    value={procForm.patientClass ?? ''}
                    onChange={(e) => setProcForm({ ...procForm, patientClass: e.target.value })}
                    className="h-8 text-sm"
                    placeholder="e.g. Inpatient, Outpatient"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Patient Location</Label>
                  <Input
                    value={procForm.patientLocation ?? ''}
                    onChange={(e) => setProcForm({ ...procForm, patientLocation: e.target.value })}
                    className="h-8 text-sm"
                    placeholder="Room / unit"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Visit #</Label>
                  <Input
                    value={procForm.visitNumber ?? ''}
                    onChange={(e) => setProcForm({ ...procForm, visitNumber: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col justify-end">
                  <Label className="text-xs flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={procForm.statFlag === true}
                      onCheckedChange={(v) => setProcForm({ ...procForm, statFlag: v === true })}
                    />
                    <span className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-destructive" /> STAT priority
                    </span>
                  </Label>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Check-In</Label>
                  <Input
                    type="datetime-local"
                    value={toDatetimeLocal(procForm.checkInTime)}
                    onChange={(e) => setProcForm({ ...procForm, checkInTime: fromDatetimeLocal(e.target.value) })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Start</Label>
                  <Input
                    type="datetime-local"
                    value={toDatetimeLocal(procForm.procedureDateStart)}
                    onChange={(e) => setProcForm({ ...procForm, procedureDateStart: fromDatetimeLocal(e.target.value) })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">End</Label>
                  <Input
                    type="datetime-local"
                    value={toDatetimeLocal(procForm.procedureDateEnd)}
                    onChange={(e) => setProcForm({ ...procForm, procedureDateEnd: fromDatetimeLocal(e.target.value) })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <InfoRow label="Assigned Physician" value={procedure.assignedPhysicianName} />
                <InfoRow label="Referring Physician" value={order.referringPhysicianName} />
                <InfoRow label="Patient Class" value={procedure.patientClass} />
                <InfoRow label="Patient Location" value={procedure.patientLocation} />
                <InfoRow label="Visit #" value={procedure.visitNumber} />
                <InfoRow label="STAT" value={procedure.statFlag ? 'Yes' : 'No'} />
                <InfoRow label="Check-In" value={formatDateTime(procedure.checkInTime)} />
                <InfoRow label="Start" value={formatDateTime(procedure.procedureDateStart)} />
                <InfoRow label="End" value={formatDateTime(procedure.procedureDateEnd)} />
              </div>
            )}
          </section>

          {/* Clinical Details */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Clinical Details
            </h3>
            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs">Study Description</Label>
                  <Input
                    value={orderForm.description ?? ''}
                    onChange={(e) => setOrderForm({ ...orderForm, description: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Patient Complaint</Label>
                  <Input
                    value={orderForm.patientComplaint ?? ''}
                    onChange={(e) => setOrderForm({ ...orderForm, patientComplaint: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Reason for Order</Label>
                  <Input
                    value={orderForm.physicianReason ?? ''}
                    onChange={(e) => setOrderForm({ ...orderForm, physicianReason: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs">General Notes</Label>
                  <Textarea
                    value={orderForm.notes ?? ''}
                    onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Procedure Notes</Label>
                  <Textarea
                    value={procForm.notes ?? ''}
                    onChange={(e) => setProcForm({ ...procForm, notes: e.target.value })}
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Scheduler Notes</Label>
                  <Textarea
                    value={procForm.schedulerNotes ?? ''}
                    onChange={(e) => setProcForm({ ...procForm, schedulerNotes: e.target.value })}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <InfoRow label="Study Description" value={order.description} />
                <InfoRow label="Patient Complaint" value={order.patientComplaint} />
                <InfoRow label="Reason for Order" value={order.physicianReason} />
                <InfoRow label="General Notes" value={order.notes} />
                <InfoRow label="Procedure Notes" value={procedure.notes} />
                <InfoRow label="Scheduler Notes" value={procedure.schedulerNotes} />
              </div>
            )}
          </section>

          {/* Custom Fields */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Custom Fields
            </h3>
            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Procedure Custom 1</Label>
                  <Input value={procForm.customField1 ?? ''} onChange={(e) => setProcForm({ ...procForm, customField1: e.target.value })} className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Procedure Custom 2</Label>
                  <Input value={procForm.customField2 ?? ''} onChange={(e) => setProcForm({ ...procForm, customField2: e.target.value })} className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Procedure Custom 3</Label>
                  <Input value={procForm.customField3 ?? ''} onChange={(e) => setProcForm({ ...procForm, customField3: e.target.value })} className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Order Custom 1</Label>
                  <Input value={orderForm.customField1 ?? ''} onChange={(e) => setOrderForm({ ...orderForm, customField1: e.target.value })} className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Order Custom 2</Label>
                  <Input value={orderForm.customField2 ?? ''} onChange={(e) => setOrderForm({ ...orderForm, customField2: e.target.value })} className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Order Custom 3</Label>
                  <Input value={orderForm.customField3 ?? ''} onChange={(e) => setOrderForm({ ...orderForm, customField3: e.target.value })} className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Order Custom 4</Label>
                  <Input value={orderForm.customField4 ?? ''} onChange={(e) => setOrderForm({ ...orderForm, customField4: e.target.value })} className="h-8 text-sm" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <InfoRow label="Procedure Custom 1" value={procedure.customField1} />
                <InfoRow label="Procedure Custom 2" value={procedure.customField2} />
                <InfoRow label="Procedure Custom 3" value={procedure.customField3} />
                <InfoRow label="Order Custom 1" value={order.customField1} />
                <InfoRow label="Order Custom 2" value={order.customField2} />
                <InfoRow label="Order Custom 3" value={order.customField3} />
                <InfoRow label="Order Custom 4" value={order.customField4} />
              </div>
            )}
          </section>

          {/* Procedure Field Mapping (PACS ↔ RIS sync) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Procedure Field Mapping
              </h3>
              <div className="flex items-center gap-1.5">
                {hasSyncPending ? (
                  <>
                    <Button variant="outline" size="sm" onClick={discardSyncChanges} disabled={syncSaving} className="gap-1 h-7 text-xs">
                      <RotateCcw className="h-3 w-3" /> Discard
                    </Button>
                    <Button size="sm" onClick={commitSyncChanges} disabled={syncSaving} className="gap-1 h-7 text-xs">
                      {syncSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Save Mapping
                    </Button>
                  </>
                ) : hasDiscrepancies ? (
                  <Badge variant="secondary" className="gap-1 text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                    <AlertTriangle className="h-3 w-3" /> {orderComparison.discrepancies.length} mismatch{orderComparison.discrepancies.length > 1 ? 'es' : ''}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1 text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    <ShieldCheck className="h-3 w-3" /> Fields match
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-3">
              {/* Linking fields — Novarad uses these to correlate PACS ↔ RIS (Accession + StudyUID are primary, Date + Modality are fuzzy fallbacks). Mismatches here risk a silently broken link. */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Linking Fields</span>
                  <span className="text-[10px] text-muted-foreground/70">Used to match PACS ↔ RIS</span>
                </div>
                {LINKING_SYNC_FIELDS.map((field) => (
                  <SyncFieldRow
                    key={field}
                    label={PROCEDURE_SYNC_LABELS[field]}
                    original={originals[field]}
                    current={syncFields[field]}
                    onChange={(next) => setSyncFields((prev) => ({ ...prev, [field]: next }))}
                    formatFn={field === 'studyDate' ? (v) => {
                      if (!v) return '';
                      try { return new Date(v).toLocaleDateString(); } catch { return v; }
                    } : undefined}
                  />
                ))}
              </div>

              {/* Descriptive fields — informational; mismatches here are cosmetic drift, not broken links. */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Descriptive</span>
                  <span className="text-[10px] text-muted-foreground/70">Informational; not used for matching</span>
                </div>
                {DESCRIPTIVE_SYNC_FIELDS.map((field) => (
                  <SyncFieldRow
                    key={field}
                    label={PROCEDURE_SYNC_LABELS[field]}
                    original={originals[field]}
                    current={syncFields[field]}
                    onChange={(next) => setSyncFields((prev) => ({ ...prev, [field]: next }))}
                  />
                ))}
                <FacilityMappingRow
                  facilityId={pendingFacilityId}
                  siteCode={pendingSiteCode}
                  originalFacilityId={originalFacilityId}
                  originalSiteCode={originalSiteCode}
                  facilities={facilities}
                  sites={sites}
                  onChange={({ facilityId, siteCode }) => {
                    setPendingFacilityId(facilityId);
                    setPendingSiteCode(siteCode);
                  }}
                />
              </div>
            </div>
          </section>

          {/* Steps Timeline — only show steps this site has enabled (ris.standard_steps.is_enabled).
              Disabled templates (Vetted / Arrived / Scan Verified by default) are always NULL-status
              and would clutter the timeline without signal. */}
          {(() => {
            const activeSteps = procedure.steps.filter((s) => !s.isDisabled);
            if (activeSteps.length === 0) return null;
            return (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Workflow Steps
              </h3>
              <div className="space-y-0">
                {activeSteps.map((step, idx) => (
                  <div key={`${step.procedureId}-${step.stepNumber}`} className="flex items-start gap-3 relative">
                    {idx < activeSteps.length - 1 && (
                      <div className="absolute left-[7px] top-6 bottom-0 w-px bg-border" />
                    )}
                    <div className="shrink-0 mt-0.5 z-10 bg-background">
                      {stepStatusIcon(step.status)}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Step {step.stepNumber}</span>
                        <Badge variant="outline" className="text-[10px]">{stepStatusLabel(step.status)}</Badge>
                      </div>
                      {step.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                      )}
                      {step.completionDate && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Completed: {formatDateTime(step.completionDate)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
