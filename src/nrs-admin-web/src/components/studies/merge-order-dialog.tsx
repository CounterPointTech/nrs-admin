'use client';

import { useState, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, ArrowRightLeft, Loader2, RotateCcw, AlertTriangle, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { RisOrder, UnifiedStudyDetail } from '@/lib/types';
import { studyApi } from '@/lib/api';

interface MergeFieldDef {
  key: string;
  label: string;
  getValue: (o: RisOrder) => string;
}

const MERGE_FIELDS: MergeFieldDef[] = [
  { key: 'accessionNumber', label: 'Accession', getValue: o => o.accessionNumber || '' },
  { key: 'description', label: 'Description', getValue: o => o.description || '' },
  { key: 'status', label: 'Status', getValue: o => o.status || '' },
  { key: 'notes', label: 'Notes', getValue: o => o.notes || '' },
  { key: 'patientComplaint', label: 'Patient Complaint', getValue: o => o.patientComplaint || '' },
  { key: 'physicianReason', label: 'Physician Reason', getValue: o => o.physicianReason || '' },
  { key: 'referringPhysicianName', label: 'Referring Physician', getValue: o => o.referringPhysicianName || '' },
  { key: 'customField1', label: 'Custom Field 1', getValue: o => o.customField1 || '' },
  { key: 'customField2', label: 'Custom Field 2', getValue: o => o.customField2 || '' },
  { key: 'customField3', label: 'Custom Field 3', getValue: o => o.customField3 || '' },
  { key: 'customField4', label: 'Custom Field 4', getValue: o => o.customField4 || '' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: number;
  orders: RisOrder[];
  initialTarget: RisOrder;
  initialSource: RisOrder;
  onDataChange: (data: UnifiedStudyDetail) => void;
}

export function MergeOrderDialog({
  open, onOpenChange, studyId, orders, initialTarget, initialSource, onDataChange,
}: Props) {
  const [targetId, setTargetId] = useState(initialTarget.orderId);
  const [sourceId, setSourceId] = useState(initialSource.orderId);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const target = orders.find(o => o.orderId === targetId) ?? initialTarget;
  const source = orders.find(o => o.orderId === sourceId) ?? initialSource;

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
    setOverrides(prev => ({ ...prev, [key]: field.getValue(source) }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await studyApi.mergeOrders(studyId, {
        targetOrderId: targetId,
        sourceOrderId: sourceId,
        fieldOverrides: hasChanges ? overrides : undefined,
      });
      if (res.success && res.data) {
        onDataChange(res.data);
        toast.success('Orders merged successfully');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle>Merge Orders</DialogTitle>
          <DialogDescription>
            All procedures from the cancelled order will be moved to the kept order. Use the arrow buttons to copy field values.
          </DialogDescription>
        </DialogHeader>

        {/* Header with swap */}
        <div className="flex items-center gap-3 px-6 py-3 bg-muted/30 border-y">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-600 text-white text-[10px]">KEEP</Badge>
              <span className="font-semibold text-sm">Order #{target.orderId}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {target.accessionNumber || 'No accession'} — {target.description || 'No description'}
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={swap} className="gap-1.5 h-8 shrink-0">
            <ArrowRightLeft className="h-3.5 w-3.5" /> Swap
          </Button>

          <div className="flex-1 text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="font-semibold text-sm">Order #{source.orderId}</span>
              <Badge variant="destructive" className="text-[10px]">CANCEL</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {source.accessionNumber || 'No accession'} — {source.description || 'No description'}
            </p>
          </div>
        </div>

        {/* Field comparison */}
        <div className="px-6 py-3 space-y-1">
          {MERGE_FIELDS.map(field => {
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
                <span className="w-36 shrink-0 font-medium text-muted-foreground">{field.label}</span>

                <div className="flex-1 min-w-0">
                  <span className={`truncate block ${!targetVal ? 'text-muted-foreground/50 italic' : ''} ${isOverridden ? 'text-blue-500 font-semibold' : ''}`}>
                    {targetVal || '—'}
                  </span>
                </div>

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

                <div className="flex-1 min-w-0 text-right">
                  <span className={`truncate block ${!sourceVal ? 'text-muted-foreground/50 italic' : ''}`}>
                    {sourceVal || '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <div className="flex items-center justify-between w-full">
            <div>
              {hasChanges && (
                <Button variant="ghost" size="sm" onClick={() => setOverrides({})} className="gap-1 text-xs">
                  <RotateCcw className="h-3 w-3" /> Reset
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Merge Orders
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
