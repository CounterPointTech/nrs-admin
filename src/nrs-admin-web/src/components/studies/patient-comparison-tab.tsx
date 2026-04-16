'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SyncFieldRow, SyncFieldState } from './sync-field-row';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { User, AlertTriangle, ShieldCheck, Users, Save, X, Loader2, RotateCcw, Pencil, FolderOpen, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { UnifiedStudyDetail, UpdateRisPatientDetailsRequest, PatientGroup, PatientDeletionPreview } from '@/lib/types';
import { studyApi } from '@/lib/api';

function fmtDate(d?: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium">{value || '—'}</span>
    </div>
  );
}

// The fields we can sync between PACS and RIS
const SYNC_FIELDS = ['patientId', 'lastName', 'firstName', 'middleName', 'gender', 'dateOfBirth'] as const;
type SyncFieldName = typeof SYNC_FIELDS[number];

const FIELD_LABELS: Record<SyncFieldName, string> = {
  patientId: 'Patient ID', lastName: 'Last Name', firstName: 'First Name',
  middleName: 'Middle', gender: 'Gender', dateOfBirth: 'DOB',
};

function buildOriginals(data: UnifiedStudyDetail): Record<SyncFieldName, SyncFieldState> {
  const { patientComparison: pc } = data;
  return {
    patientId:   { pacsValue: pc.pacsPatientId || '',  risValue: pc.risPatientId || '' },
    lastName:    { pacsValue: pc.pacsLastName || '',    risValue: pc.risLastName || '' },
    firstName:   { pacsValue: pc.pacsFirstName || '',   risValue: pc.risFirstName || '' },
    middleName:  { pacsValue: pc.pacsMiddleName || '',  risValue: pc.risMiddleInitial || '' },
    gender:      { pacsValue: pc.pacsGender || '',      risValue: pc.risSex || '' },
    dateOfBirth: { pacsValue: pc.pacsBirthTime || '',   risValue: pc.risDateOfBirth || '' },
  };
}

interface Props {
  data: UnifiedStudyDetail;
  onDataChange: (data: UnifiedStudyDetail) => void;
  onOpenMergeDialog: () => void;
}

export function PatientComparisonTab({ data, onDataChange, onOpenMergeDialog }: Props) {
  const { study, risPatient, link, patientComparison } = data;

  // Original values from the server (reset when data changes from parent)
  const originals = useMemo(() => buildOriginals(data), [data]);

  // Staged values — local edits that haven't been committed yet
  const [staged, setStaged] = useState<Record<SyncFieldName, SyncFieldState>>(() => buildOriginals(data));
  const [saving, setSaving] = useState(false);

  // Reset staged when underlying data changes (e.g. after commit)
  const [lastDataId, setLastDataId] = useState(data.study.id + '|' + data.study.modifiedDate);
  const currentDataId = data.study.id + '|' + data.study.modifiedDate;
  if (currentDataId !== lastDataId) {
    setStaged(buildOriginals(data));
    setLastDataId(currentDataId);
  }

  // Check if anything has been changed
  const pendingChanges = SYNC_FIELDS.filter(f =>
    staged[f].pacsValue !== originals[f].pacsValue ||
    staged[f].risValue !== originals[f].risValue
  );
  const hasPending = pendingChanges.length > 0;

  function handleFieldChange(field: SyncFieldName, next: SyncFieldState) {
    setStaged(prev => ({ ...prev, [field]: next }));
  }

  function discardAll() {
    setStaged({ ...originals });
  }

  async function commitAll() {
    setSaving(true);
    try {
      // For each changed field, push the appropriate side(s)
      for (const field of pendingChanges) {
        const orig = originals[field];
        const curr = staged[field];
        const pacsChanged = curr.pacsValue !== orig.pacsValue;
        const risChanged = curr.risValue !== orig.risValue;

        if (pacsChanged && risChanged) {
          // Both sides changed — if they're the same value push as "Both", otherwise two calls
          if (curr.pacsValue === curr.risValue) {
            await studyApi.syncField(study.id, { fieldName: field, value: curr.pacsValue || undefined, target: 'Both' });
          } else {
            await studyApi.syncField(study.id, { fieldName: field, value: curr.pacsValue || undefined, target: 'Pacs' });
            await studyApi.syncField(study.id, { fieldName: field, value: curr.risValue || undefined, target: 'Ris' });
          }
        } else if (pacsChanged) {
          await studyApi.syncField(study.id, { fieldName: field, value: curr.pacsValue || undefined, target: 'Pacs' });
        } else if (risChanged) {
          await studyApi.syncField(study.id, { fieldName: field, value: curr.risValue || undefined, target: 'Ris' });
        }
      }

      // Refresh the full data from the server
      const res = await studyApi.getUnified(study.id);
      if (res.success && res.data) {
        onDataChange(res.data);
        toast.success(`${pendingChanges.length} field${pendingChanges.length > 1 ? 's' : ''} saved`);
      }
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  const hasDiscrepancies = patientComparison.discrepancies.length > 0;
  const hasRisData = risPatient != null;

  return (
    <div className="space-y-3">
      {/* Summary + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasRisData ? (
            hasDiscrepancies && !hasPending ? (
              <Badge variant="secondary" className="gap-1 text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                <AlertTriangle className="h-3 w-3" /> {patientComparison.discrepancies.length} discrepanc{patientComparison.discrepancies.length === 1 ? 'y' : 'ies'}
              </Badge>
            ) : hasPending ? (
              <Badge variant="secondary" className="gap-1 text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                {pendingChanges.length} unsaved change{pendingChanges.length > 1 ? 's' : ''}
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                <ShieldCheck className="h-3 w-3" /> All demographics match
              </Badge>
            )
          ) : (
            <Badge variant="secondary" className="text-xs">No RIS patient linked</Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {hasPending && (
            <>
              <Button variant="outline" size="sm" onClick={discardAll} disabled={saving} className="gap-1 h-7 text-xs">
                <RotateCcw className="h-3 w-3" /> Discard
              </Button>
              <Button size="sm" onClick={commitAll} disabled={saving} className="gap-1 h-7 text-xs">
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save Changes
              </Button>
            </>
          )}
          {hasRisData && !hasPending && (
            <Button variant="outline" size="sm" onClick={onOpenMergeDialog} className="gap-1 h-7 text-xs">
              <Users className="h-3 w-3" /> Merge Patients
            </Button>
          )}
        </div>
      </div>

      {/* Patient Group */}
      <PatientGroupCard studyId={study.id} currentGroup={study.patientGroup} onDataChange={onDataChange} />

      {/* Sync Fields */}
      {hasRisData && (
        <Card className="shadow-none">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm">Demographics Comparison</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-1.5">
            {SYNC_FIELDS.map(field => (
              <SyncFieldRow
                key={field}
                label={FIELD_LABELS[field]}
                original={originals[field]}
                current={staged[field]}
                onChange={(next) => handleFieldChange(field, next)}
                formatFn={field === 'dateOfBirth' ? fmtDate : undefined}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* RIS Extended Demographics — Editable */}
      {hasRisData && risPatient && (
        <RisPatientDetailsCard studyId={study.id} risPatient={risPatient} onDataChange={onDataChange} />
      )}

      {!hasRisData && (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <User className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">No RIS patient data available</p>
            <p className="text-xs text-muted-foreground mt-1">
              {link.linkMethod === 'None' ? 'Link this study to a RIS order first.' : 'No matching RIS patient record found.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone — Delete RIS Patient */}
      {hasRisData && risPatient && (
        <PatientDangerZone studyId={study.id} onDataChange={onDataChange} />
      )}
    </div>
  );
}

// ============== RIS Patient Details (editable) ==============

interface RisDetailField {
  key: keyof UpdateRisPatientDetailsRequest;
  label: string;
}

const DETAIL_FIELDS: RisDetailField[] = [
  { key: 'address1', label: 'Address' },
  { key: 'address2', label: 'Address 2' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip', label: 'ZIP' },
  { key: 'homePhone', label: 'Home Phone' },
  { key: 'workPhone', label: 'Work Phone' },
  { key: 'mobilePhone', label: 'Mobile' },
  { key: 'email', label: 'Email' },
  { key: 'healthNumber', label: 'Health #' },
  { key: 'emergencyContact', label: 'Emergency Contact' },
  { key: 'emergencyContactPhone', label: 'Emergency Phone' },
  { key: 'notes', label: 'Notes' },
];

function buildDetailForm(rp: NonNullable<UnifiedStudyDetail['risPatient']>): UpdateRisPatientDetailsRequest {
  return {
    address1: rp.address1 ?? '', address2: rp.address2 ?? '', city: rp.city ?? '',
    state: rp.state ?? '', zip: rp.zip ?? '', homePhone: rp.homePhone ?? '',
    workPhone: rp.workPhone ?? '', mobilePhone: rp.mobilePhone ?? '', email: rp.email ?? '',
    healthNumber: rp.healthNumber ?? '', emergencyContact: rp.emergencyContact ?? '',
    emergencyContactPhone: rp.emergencyContactPhone ?? '', notes: rp.notes ?? '',
  };
}

function RisPatientDetailsCard({ studyId, risPatient, onDataChange }: {
  studyId: number;
  risPatient: NonNullable<UnifiedStudyDetail['risPatient']>;
  onDataChange: (data: UnifiedStudyDetail) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateRisPatientDetailsRequest>(() => buildDetailForm(risPatient));
  const [saving, setSaving] = useState(false);

  // Reset form when risPatient changes from server
  const [dataKey, setDataKey] = useState(JSON.stringify(risPatient));
  const currentKey = JSON.stringify(risPatient);
  if (currentKey !== dataKey) {
    setForm(buildDetailForm(risPatient));
    setDataKey(currentKey);
    setEditing(false);
  }

  const original = useMemo(() => buildDetailForm(risPatient), [risPatient]);

  const changedFields = DETAIL_FIELDS.filter(f => (form[f.key] ?? '') !== (original[f.key] ?? ''));
  const hasChanges = changedFields.length > 0;

  function startEditing() { setForm(buildDetailForm(risPatient)); setEditing(true); }
  function discard() { setForm(buildDetailForm(risPatient)); setEditing(false); }

  async function save() {
    setSaving(true);
    try {
      // Only send changed fields
      const payload: UpdateRisPatientDetailsRequest = {};
      for (const f of changedFields) {
        (payload as Record<string, string>)[f.key] = form[f.key] ?? '';
      }
      const res = await studyApi.updateRisPatientDetails(studyId, payload);
      if (res.success && res.data) {
        onDataChange(res.data);
        toast.success(`${changedFields.length} field${changedFields.length > 1 ? 's' : ''} saved`);
        setEditing(false);
      } else {
        toast.error(res.message || 'Save failed');
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function updateField(key: keyof UpdateRisPatientDetailsRequest, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-1 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            RIS Patient Details
            <Badge variant="outline" className="text-[10px] text-purple-500 border-purple-500/30 h-4">RIS</Badge>
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {editing && hasChanges && (
              <>
                <Button variant="outline" size="sm" onClick={discard} disabled={saving} className="gap-1 h-6 text-[11px]">
                  <RotateCcw className="h-3 w-3" /> Discard
                </Button>
                <Button size="sm" onClick={save} disabled={saving} className="gap-1 h-6 text-[11px]">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                </Button>
              </>
            )}
            {editing && !hasChanges && (
              <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="h-6 text-[11px]">Done</Button>
            )}
            {!editing && (
              <Button variant="ghost" size="sm" onClick={startEditing} className="gap-1 h-6 text-[11px]">
                <Pencil className="h-3 w-3" /> Edit
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1.5">
          {DETAIL_FIELDS.map(f => {
            const val = form[f.key] ?? '';
            const orig = original[f.key] ?? '';
            const changed = val !== orig;

            if (editing) {
              return (
                <div key={f.key}>
                  <label className="text-[11px] text-muted-foreground">{f.label}</label>
                  <Input
                    value={val}
                    onChange={(e) => updateField(f.key, e.target.value)}
                    className={`h-6 text-xs mt-0.5 ${changed ? 'border-blue-500 bg-blue-500/5' : ''}`}
                    placeholder="—"
                  />
                </div>
              );
            }

            return <Row key={f.key} label={f.label} value={val || undefined} />;
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============== Patient Group Card ==============

function PatientGroupCard({
  studyId,
  currentGroup,
  onDataChange,
}: {
  studyId: number;
  currentGroup?: string | null;
  onDataChange: (data: UnifiedStudyDetail) => void;
}) {
  const [groups, setGroups] = useState<PatientGroup[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadGroups() {
    if (loaded) return;
    const res = await studyApi.getPatientGroups();
    if (res.success && res.data) setGroups(res.data);
    setLoaded(true);
  }

  async function handleChange(newGroup: string) {
    if (newGroup === (currentGroup || '')) return;
    setSaving(true);
    try {
      const res = await studyApi.updatePatientGroup(studyId, newGroup);
      if (res.success) {
        toast.success(`Patient moved to ${newGroup}`);
        // Refresh the full study data
        const refreshed = await studyApi.getUnified(studyId);
        if (refreshed.success && refreshed.data) onDataChange(refreshed.data);
      } else {
        toast.error(res.message || 'Failed to update patient group');
      }
    } catch {
      toast.error('Failed to update patient group');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-1 pt-3 px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FolderOpen className="h-3.5 w-3.5" />
          Patient Group
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="flex items-center gap-3">
          <Select
            value={currentGroup || ''}
            onValueChange={handleChange}
            disabled={saving}
            onOpenChange={(open) => open && loadGroups()}
          >
            <SelectTrigger className="h-8 text-xs w-56">
              <SelectValue placeholder={currentGroup || 'No group assigned'} />
            </SelectTrigger>
            <SelectContent>
              {groups.map(g => (
                <SelectItem key={g.patientGroupId} value={g.name}>
                  {g.name}
                  {g.isDefault && <span className="text-muted-foreground ml-1">(default)</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          {currentGroup && (
            <span className="text-[10px] text-muted-foreground">
              Currently: {currentGroup}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============== Patient Danger Zone ==============

function PatientDangerZone({
  studyId,
  onDataChange,
}: {
  studyId: number;
  onDataChange: (data: UnifiedStudyDetail) => void;
}) {
  const [preview, setPreview] = useState<PatientDeletionPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function checkReferences() {
    setLoading(true);
    try {
      const res = await studyApi.getPatientDeletionPreview(studyId);
      if (res.success && res.data) setPreview(res.data);
      else toast.error(res.message || 'Failed to check references');
    } catch { toast.error('Failed to check references'); }
    finally { setLoading(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const clearInsurance = preview ? preview.insuranceReferences > 0 : false;
      const res = await studyApi.deleteRisPatient(studyId, clearInsurance);
      if (res.success) {
        toast.success('RIS patient deleted');
        setConfirmOpen(false);
        setPreview(null);
        const refreshed = await studyApi.getUnified(studyId);
        if (refreshed.success && refreshed.data) onDataChange(refreshed.data);
      } else {
        toast.error(res.message || 'Delete failed');
      }
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(false); }
  }

  return (
    <Card className="shadow-none border-destructive/30">
      <CardHeader className="pb-1 pt-3 px-4">
        <CardTitle className="flex items-center gap-2 text-sm text-destructive">
          <Shield className="h-3.5 w-3.5" />
          Danger Zone
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2">
        <p className="text-xs text-muted-foreground">
          Delete this patient from RIS, including all orders, billing accounts, and demographic data.
          This cannot be undone.
        </p>

        {!preview ? (
          <Button variant="outline" size="sm" className="gap-1 h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={checkReferences} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            Check References
          </Button>
        ) : (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Orders:</span> <span className="font-medium">{preview.orderCount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Billing Accounts:</span> <span className="font-medium">{preview.billingAccountCount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Documents:</span> <span className="font-medium">{preview.documentCount}</span></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Insurance Refs:</span>
                <span className={`font-medium ${preview.insuranceReferences > 0 ? 'text-destructive' : ''}`}>
                  {preview.insuranceReferences}
                </span>
              </div>
            </div>

            {preview.insuranceReferences > 0 && (
              <p className="text-[10px] text-amber-600">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                Insurance references will be cleared automatically during deletion.
              </p>
            )}

            <Button variant="destructive" size="sm" className="gap-1 h-7 text-xs"
              onClick={() => setConfirmOpen(true)}>
              <Trash2 className="h-3 w-3" /> Delete RIS Patient
            </Button>
          </div>
        )}

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete RIS Patient</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the RIS patient record ({preview?.patientId} / {preview?.siteCode}),
                including {preview?.orderCount} order(s), {preview?.billingAccountCount} billing account(s),
                and all demographic data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
