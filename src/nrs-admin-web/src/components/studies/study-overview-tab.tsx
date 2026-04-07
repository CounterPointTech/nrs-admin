'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SyncFieldRow, SyncFieldState } from './sync-field-row';
import { Save, Loader2, Link2, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { UnifiedStudyDetail, getStudyStatusLabel } from '@/lib/types';
import { studyApi } from '@/lib/api';

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtDateTime(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusVariant(s: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (s) { case 0: return 'outline'; case 1: return 'secondary'; case 2: case 3: return 'default'; case 5: return 'destructive'; default: return 'secondary'; }
}

function Field({ label, value, mono, wide }: { label: string; value?: string | null; mono?: boolean; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2 sm:col-span-3 lg:col-span-4' : ''}>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={`text-xs font-medium mt-0.5 ${mono ? 'font-mono' : ''} ${!value ? 'text-muted-foreground' : ''}`}>{value || '—'}</dd>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</h3>;
}

interface Props {
  data: UnifiedStudyDetail;
  onDataChange: (data: UnifiedStudyDetail) => void;
  onOpenLinkDialog: () => void;
  onOpenUnlinkDialog: () => void;
}

export function StudyOverviewTab({ data, onDataChange, onOpenLinkDialog, onOpenUnlinkDialog }: Props) {
  const { study, link } = data;

  // Accession sync — staged
  const firstOrder = data.orders[0];
  const accOriginal = useMemo<SyncFieldState>(() => ({
    pacsValue: study.accession || '',
    risValue: firstOrder?.accessionNumber || '',
  }), [study.accession, firstOrder?.accessionNumber]);

  const [accStaged, setAccStaged] = useState<SyncFieldState>(accOriginal);
  const [accSaving, setAccSaving] = useState(false);

  const [accDataKey, setAccDataKey] = useState(study.accession + '|' + firstOrder?.accessionNumber);
  const currentAccKey = study.accession + '|' + firstOrder?.accessionNumber;
  if (currentAccKey !== accDataKey) {
    setAccStaged({ pacsValue: study.accession || '', risValue: firstOrder?.accessionNumber || '' });
    setAccDataKey(currentAccKey);
  }

  const accChanged = accStaged.pacsValue !== accOriginal.pacsValue || accStaged.risValue !== accOriginal.risValue;

  async function commitAccession() {
    setAccSaving(true);
    try {
      const pacsChanged = accStaged.pacsValue !== accOriginal.pacsValue;
      const risChanged = accStaged.risValue !== accOriginal.risValue;
      if (pacsChanged && risChanged && accStaged.pacsValue === accStaged.risValue) {
        await studyApi.syncField(study.id, { fieldName: 'accession', value: accStaged.pacsValue || undefined, target: 'Both' });
      } else {
        if (pacsChanged) await studyApi.syncField(study.id, { fieldName: 'accession', value: accStaged.pacsValue || undefined, target: 'Pacs' });
        if (risChanged) await studyApi.syncField(study.id, { fieldName: 'accession', value: accStaged.risValue || undefined, target: 'Ris' });
      }
      const res = await studyApi.getUnified(study.id);
      if (res.success && res.data) { onDataChange(res.data); toast.success('Accession saved'); }
    } catch { toast.error('Failed to save accession'); }
    finally { setAccSaving(false); }
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          {link.linkMethod === 'None' ? (
            <Badge variant="destructive" className="gap-1 text-xs h-5"><Unlink className="h-3 w-3" /> Unlinked</Badge>
          ) : (
            <Badge className="gap-1 text-xs h-5 bg-emerald-600"><Link2 className="h-3 w-3" /> Linked ({link.linkMethod})</Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {link.linkMethod === 'None' ? (
            <Button variant="outline" onClick={onOpenLinkDialog} size="sm" className="gap-1 h-7 text-xs"><Link2 className="h-3 w-3" /> Link to Order</Button>
          ) : (
            <Button variant="outline" onClick={onOpenUnlinkDialog} size="sm" className="gap-1 h-7 text-xs text-destructive hover:text-destructive"><Unlink className="h-3 w-3" /> Unlink</Button>
          )}
        </div>
      </div>

      <div className="px-4 py-3 space-y-4">
        {/* Accession Sync */}
        {link.linkMethod !== 'None' && firstOrder && (
          <>
            <div className="space-y-1.5">
              <SyncFieldRow label="Accession" original={accOriginal} current={accStaged} onChange={setAccStaged} />
              {accChanged && (
                <div className="flex items-center gap-1.5 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setAccStaged({ ...accOriginal })} disabled={accSaving} className="h-6 text-xs">Discard</Button>
                  <Button size="sm" onClick={commitAccession} disabled={accSaving} className="gap-1 h-6 text-xs">
                    {accSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                  </Button>
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Patient */}
        <div>
          <SectionLabel>Patient</SectionLabel>
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 mt-2">
            <Field label="Name" value={`${study.lastName}, ${study.firstName}${study.middleName ? ` ${study.middleName}` : ''}`} />
            <Field label="MRN" value={study.patientId} mono />
            <Field label="Gender" value={study.gender} />
            <Field label="Date of Birth" value={fmtDate(study.birthTime)} />
          </dl>
        </div>

        <Separator />

        {/* Study */}
        <div>
          <SectionLabel>Study</SectionLabel>
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 mt-2">
            <Field label="Study Date" value={fmtDate(study.studyDate)} />
            <Field label="Accession" value={study.accession} mono />
            <Field label="Modality" value={study.modality} />
            <Field label="Anatomical Area" value={study.anatomicalArea} />
            <Field label="Study UID" value={study.studyUid} mono wide />
          </dl>
        </div>

        <Separator />

        {/* Clinical */}
        <div>
          <SectionLabel>Clinical</SectionLabel>
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 mt-2">
            <Field label="Facility" value={study.facilityName} />
            <Field label="Referring Physician" value={study.physicianName} />
            <Field label="Radiologist" value={study.radiologistName} />
            <Field label="Institution" value={study.institution} />
            <div>
              <dt className="text-[11px] text-muted-foreground">Status</dt>
              <dd className="mt-0.5"><Badge variant={statusVariant(study.status)} className="text-[10px] h-4">{getStudyStatusLabel(study.status)}</Badge></dd>
            </div>
            <Field label="Priority" value={study.priority === 7 ? 'Stat' : study.priority === 0 ? 'Normal' : `Level ${study.priority}`} />
          </dl>
        </div>

        <Separator />

        {/* Comments */}
        <div>
          <SectionLabel>Comments</SectionLabel>
          <p className="text-xs whitespace-pre-wrap mt-2">{study.comments || <span className="text-muted-foreground italic">No comments</span>}</p>
        </div>

        <Separator />

        {/* Metadata */}
        <div>
          <SectionLabel>Metadata</SectionLabel>
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 mt-2">
            <Field label="Study Tags" value={study.studyTags} />
            <Field label="Valid" value={study.isValid ? 'Yes' : 'No'} />
            <Field label="Modified" value={fmtDateTime(study.modifiedDate)} />
            <Field label="First Processed" value={fmtDateTime(study.firstProcessedDate)} />
          </dl>
          {(() => {
            const customs = [study.custom1, study.custom2, study.custom3, study.custom4, study.custom5, study.custom6].map((v, i) => ({ v, i })).filter(x => x.v);
            return customs.length > 0 ? (
              <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 mt-2">
                {customs.map(({ v, i }) => <Field key={i} label={`Custom ${i + 1}`} value={v} />)}
              </dl>
            ) : null;
          })()}
        </div>
      </div>
    </div>
  );
}
