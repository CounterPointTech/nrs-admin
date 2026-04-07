'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Users, ArrowRight, AlertTriangle, Loader2, Check, Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { UnifiedStudyDetail } from '@/lib/types';
import { studyApi } from '@/lib/api';

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: UnifiedStudyDetail;
  onDataChange: (data: UnifiedStudyDetail) => void;
}

type MergeDirection = 'pacs-to-ris' | 'ris-to-pacs' | null;

export function PatientMergeDialog({ open, onOpenChange, data, onDataChange }: Props) {
  const { study, risPatient } = data;
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<MergeDirection>(null);
  const [moveOrders, setMoveOrders] = useState(true);
  const [moveDocuments, setMoveDocuments] = useState(true);
  const [merging, setMerging] = useState(false);

  if (!risPatient) return null;

  function reset() {
    setStep(1);
    setDirection(null);
    setMoveOrders(true);
    setMoveDocuments(true);
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  async function executeMerge() {
    if (!direction || !risPatient) return;

    // In "pacs-to-ris": keep RIS patient, merge PACS patient into it
    // The PACS patient_id maps to a RIS patient_id for the merge
    const isKeepRis = direction === 'pacs-to-ris';
    const rp = risPatient;

    setMerging(true);
    try {
      const res = await studyApi.mergePatient(study.id, {
        targetPatientId: isKeepRis ? rp.patientId : study.patientId,
        targetSiteCode: isKeepRis ? rp.siteCode : rp.siteCode,
        sourcePatientId: isKeepRis ? study.patientId : rp.patientId,
        sourceSiteCode: rp.siteCode,
        moveOrders,
        moveDocuments,
      });
      if (res.success && res.data) {
        onDataChange(res.data);
        toast.success('Patient merge completed');
        handleClose();
      } else {
        toast.error(res.message || 'Merge failed');
      }
    } catch {
      toast.error('Merge operation failed');
    } finally {
      setMerging(false);
    }
  }

  const targetLabel = direction === 'pacs-to-ris'
    ? `${risPatient.lastName}, ${risPatient.firstName} (${risPatient.patientId})`
    : `${study.lastName}, ${study.firstName} (${study.patientId})`;

  const sourceLabel = direction === 'pacs-to-ris'
    ? `${study.lastName}, ${study.firstName} (${study.patientId})`
    : `${risPatient.lastName}, ${risPatient.firstName} (${risPatient.patientId})`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Merge Patient Records
          </DialogTitle>
          <DialogDescription>
            Merge two patient records in the RIS system. The source patient will be merged into the target.
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Choose Direction */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select which patient record to keep as the primary (target):
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Keep RIS */}
              <Card
                className={`cursor-pointer transition-all ${
                  direction === 'pacs-to-ris' ? 'ring-2 ring-primary' : 'hover:border-primary/50'
                }`}
                onClick={() => setDirection('pacs-to-ris')}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge variant="outline" className="text-purple-500 border-purple-500/30">RIS</Badge>
                    Keep RIS Patient
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  <p className="font-medium">{risPatient.lastName}, {risPatient.firstName}</p>
                  <p className="text-muted-foreground">ID: {risPatient.patientId}</p>
                  <p className="text-muted-foreground">DOB: {formatDate(risPatient.dateOfBirth)}</p>
                </CardContent>
              </Card>

              {/* Keep PACS */}
              <Card
                className={`cursor-pointer transition-all ${
                  direction === 'ris-to-pacs' ? 'ring-2 ring-primary' : 'hover:border-primary/50'
                }`}
                onClick={() => setDirection('ris-to-pacs')}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge variant="outline" className="text-blue-500 border-blue-500/30">PACS</Badge>
                    Keep PACS Patient
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  <p className="font-medium">{study.lastName}, {study.firstName}</p>
                  <p className="text-muted-foreground">ID: {study.patientId}</p>
                  <p className="text-muted-foreground">DOB: {formatDate(study.birthTime)}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 2: Options */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <span className="text-sm font-medium">{sourceLabel}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium">{targetLabel}</span>
              <Badge className="ml-auto">Target</Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="moveOrders"
                  checked={moveOrders}
                  onCheckedChange={(c) => setMoveOrders(c === true)}
                />
                <Label htmlFor="moveOrders" className="text-sm">Move orders from source to target patient</Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="moveDocuments"
                  checked={moveDocuments}
                  onCheckedChange={(c) => setMoveDocuments(c === true)}
                />
                <Label htmlFor="moveDocuments" className="text-sm">Move documents from source to target patient</Label>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-destructive">This action cannot be undone.</p>
                <p className="text-muted-foreground mt-1">
                  The source patient record will be permanently merged into the target.
                  Billing accounts, insurance, and visits will be consolidated.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-500" />
                <span><strong>Target (keep):</strong> {targetLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span><strong>Source (merge):</strong> {sourceLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                {moveOrders ? <Check className="h-4 w-4 text-emerald-500" /> : <span className="h-4 w-4" />}
                <span>Move orders: {moveOrders ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center gap-2">
                {moveDocuments ? <Check className="h-4 w-4 text-emerald-500" /> : <span className="h-4 w-4" />}
                <span>Move documents: {moveDocuments ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="mr-auto">
              Back
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !direction}>
              Next
            </Button>
          ) : (
            <Button variant="destructive" onClick={executeMerge} disabled={merging} className="gap-2">
              {merging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Execute Merge
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
