'use client';

import { useState, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft, ArrowRightLeft, Loader2, RotateCcw, AlertTriangle, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { RisOrderProcedure, UnifiedStudyDetail } from '@/lib/types';
import { studyApi } from '@/lib/api';

interface MergeFieldDef {
  key: string;
  label: string;
  group: 'identity' | 'dates' | 'clinical' | 'admin';
  getValue: (p: RisOrderProcedure) => string;
}

const MERGE_FIELDS: MergeFieldDef[] = [
  // Identity
  { key: 'procedureName', label: 'Procedure Name', group: 'identity', getValue: p => p.procedureName || '' },
  { key: 'studyUid', label: 'Study UID', group: 'identity', getValue: p => p.studyUid || '' },
  { key: 'status', label: 'Status', group: 'identity', getValue: p => p.status || '' },
  // Dates
  { key: 'procedureDateStart', label: 'Start Date/Time', group: 'dates', getValue: p => p.procedureDateStart || '' },
  { key: 'procedureDateEnd', label: 'End Date/Time', group: 'dates', getValue: p => p.procedureDateEnd || '' },
  { key: 'checkInTime', label: 'Check-in Time', group: 'dates', getValue: p => p.checkInTime || '' },
  // Clinical
  { key: 'modalityType', label: 'Modality', group: 'clinical', getValue: p => p.modalityType || p.modalityName || '' },
  { key: 'assignedPhysicianName', label: 'Assigned Radiologist', group: 'clinical', getValue: p => p.assignedPhysicianName || '' },
  { key: 'statFlag', label: 'Stat', group: 'clinical', getValue: p => p.statFlag ? 'Yes' : 'No' },
  { key: 'patientClass', label: 'Patient Class', group: 'clinical', getValue: p => p.patientClass || '' },
  { key: 'patientLocation', label: 'Patient Location', group: 'clinical', getValue: p => p.patientLocation || '' },
  { key: 'visitNumber', label: 'Visit Number', group: 'clinical', getValue: p => p.visitNumber || '' },
  // Admin
  { key: 'notes', label: 'Notes', group: 'admin', getValue: p => p.notes || '' },
  { key: 'schedulerNotes', label: 'Scheduler Notes', group: 'admin', getValue: p => p.schedulerNotes || '' },
  { key: 'customField1', label: 'Custom Field 1', group: 'admin', getValue: p => p.customField1 || '' },
  { key: 'customField2', label: 'Custom Field 2', group: 'admin', getValue: p => p.customField2 || '' },
  { key: 'customField3', label: 'Custom Field 3', group: 'admin', getValue: p => p.customField3 || '' },
];

const GROUP_LABELS: Record<string, string> = {
  identity: 'Identification',
  dates: 'Dates & Times',
  clinical: 'Clinical',
  admin: 'Notes & Custom Fields',
};

function formatValue(key: string, val: string): string {
  if (!val) return '—';
  if (key.includes('Date') || key === 'checkInTime') {
    try { return new Date(val).toLocaleString(); } catch { return val; }
  }
  return val;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: number;
  procedures: RisOrderProcedure[];
  initialTarget: RisOrderProcedure;
  initialSource: RisOrderProcedure;
  onDataChange: (data: UnifiedStudyDetail) => void;
}

export function MergeProcedureDialog({
  open, onOpenChange, studyId, procedures, initialTarget, initialSource, onDataChange,
}: Props) {
  const [targetId, setTargetId] = useState(initialTarget.procedureId);
  const [sourceId, setSourceId] = useState(initialSource.procedureId);
  const [moveReports, setMoveReports] = useState(true);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const target = procedures.find(p => p.procedureId === targetId) ?? initialTarget;
  const source = procedures.find(p => p.procedureId === sourceId) ?? initialSource;

  // Compute effective values (original target + any overrides)
  const effectiveTarget = useMemo(() => {
    const result: Record<string, string> = {};
    for (const f of MERGE_FIELDS) {
      result[f.key] = overrides[f.key] ?? f.getValue(target);
    }
    return result;
  }, [target, overrides]);

  const hasChanges = Object.keys(overrides).length > 0;

  function swap() {
    setTargetId(sourceId);
    setSourceId(targetId);
    setOverrides({});
  }

  function copyField(key: string) {
    const field = MERGE_FIELDS.find(f => f.key === key);
    if (!field) return;
    const sourceVal = field.getValue(source);
    setOverrides(prev => ({ ...prev, [key]: sourceVal }));
  }

  function reset() {
    setOverrides({});
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await studyApi.mergeProcedures(studyId, {
        targetProcedureId: targetId,
        sourceProcedureId: sourceId,
        moveReports,
        fieldOverrides: hasChanges ? overrides : undefined,
      });
      if (res.success && res.data) {
        onDataChange(res.data);
        toast.success('Procedures merged successfully');
        onOpenChange(false);
      } else {
        toast.error(res.message || 'Merge failed');
      }
    } catch {
      toast.error('Merge failed');
    } finally {
      setSaving(false);
    }
  }

  const groups = ['identity', 'dates', 'clinical', 'admin'] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle>Merge Procedures</DialogTitle>
          <DialogDescription>
            Compare fields side by side. Use the arrow buttons to copy values from the cancelled procedure to the kept one.
          </DialogDescription>
        </DialogHeader>

        {/* Header with swap */}
        <div className="flex items-center gap-3 px-6 py-3 bg-muted/30 border-y">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-600 text-white text-[10px]">KEEP</Badge>
              <span className="font-semibold text-sm">{target.procedureName || `Procedure #${target.procedureId}`}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {target.procedureDateStart ? new Date(target.procedureDateStart).toLocaleString() : 'No date'}
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={swap} className="gap-1.5 h-8 shrink-0">
            <ArrowRightLeft className="h-3.5 w-3.5" /> Swap
          </Button>

          <div className="flex-1 text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="font-semibold text-sm">{source.procedureName || `Procedure #${source.procedureId}`}</span>
              <Badge variant="destructive" className="text-[10px]">CANCEL</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {source.procedureDateStart ? new Date(source.procedureDateStart).toLocaleString() : 'No date'}
            </p>
          </div>
        </div>

        {/* Move reports toggle */}
        <div className="px-6 py-2 border-b">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={moveReports} onCheckedChange={c => setMoveReports(!!c)} />
            <span className="text-xs font-medium">Move reports to kept procedure</span>
          </label>
        </div>

        {/* Field comparison */}
        <div className="px-6 py-3 space-y-4">
          {groups.map(group => {
            const groupFields = MERGE_FIELDS.filter(f => f.group === group);
            return (
              <div key={group}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                  {GROUP_LABELS[group]}
                </p>
                <div className="space-y-1">
                  {groupFields.map(field => {
                    const targetVal = effectiveTarget[field.key];
                    const sourceVal = field.getValue(source);
                    const isOverridden = field.key in overrides;
                    const isMatch = targetVal.toLowerCase() === sourceVal.toLowerCase() && (targetVal !== '' || sourceVal !== '');
                    const hasMismatch = targetVal !== '' && sourceVal !== '' && !isMatch;
                    const bothEmpty = targetVal === '' && sourceVal === '';

                    return (
                      <div key={field.key} className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                        isOverridden ? 'border-blue-500/40 bg-blue-500/5' :
                        hasMismatch ? 'border-amber-500/30 bg-amber-500/5' :
                        isMatch ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border'
                      }`}>
                        {/* Label */}
                        <span className="w-32 shrink-0 font-medium text-muted-foreground">{field.label}</span>

                        {/* Target (keep) value */}
                        <div className="flex-1 min-w-0">
                          <span className={`truncate block ${!targetVal ? 'text-muted-foreground/50 italic' : ''} ${isOverridden ? 'text-blue-500 font-semibold' : ''}`}>
                            {formatValue(field.key, targetVal)}
                          </span>
                        </div>

                        {/* Copy button */}
                        <div className="shrink-0 w-8 flex justify-center">
                          {!bothEmpty && sourceVal && !isMatch ? (
                            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-muted-foreground hover:text-blue-500"
                              onClick={() => copyField(field.key)} title="Copy from cancelled">
                              <ArrowLeft className="h-3 w-3" />
                            </Button>
                          ) : isMatch && !bothEmpty ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : hasMismatch ? (
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                          ) : null}
                        </div>

                        {/* Source (cancel) value */}
                        <div className="flex-1 min-w-0 text-right">
                          <span className={`truncate block ${!sourceVal ? 'text-muted-foreground/50 italic' : ''}`}>
                            {formatValue(field.key, sourceVal)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <div className="flex items-center justify-between w-full">
            <div>
              {hasChanges && (
                <Button variant="ghost" size="sm" onClick={reset} className="gap-1 text-xs">
                  <RotateCcw className="h-3 w-3" /> Reset
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Merge Procedures
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
