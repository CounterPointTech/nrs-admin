'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Monitor,
  Server,
  ArrowRight,
  Check,
  ChevronsUpDown,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Loader2,
  Wand2,
} from 'lucide-react';
import type { Modality, ModalityType, MappingEntry } from '@/lib/types';

interface MappingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modalities: Modality[];
  modalityTypes: ModalityType[];
  existingEntries: MappingEntry[];
  onSubmit: (entry: MappingEntry) => Promise<void>;
}

type SourceMode = 'registered' | 'manual';

interface WizardFormData {
  modalityAE: string;
  modalitySN: string;
  modalityStationName: string;
  modalityLocation: string;
  risAE: string;
  risSN: string;
  persistStudyUID: boolean;
}

const TOTAL_STEPS = 4;

function StepIndicator({ currentStep }: { currentStep: number }) {
  const labels = ['Device', 'RIS Target', 'Details', 'Review'];

  return (
    <div className="flex items-center justify-between px-4 pb-2">
      {labels.map((label, i) => {
        const stepNum = i + 1;
        const isComplete = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;

        return (
          <div key={label} className="flex items-center flex-1 last:flex-0">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-semibold transition-colors ${
                  isComplete
                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                    : isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {isComplete ? <Check className="h-4 w-4" /> : stepNum}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isCurrent ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div
                className={`flex-1 h-px mx-2 mb-4 ${
                  stepNum < currentStep ? 'bg-emerald-500/40' : 'bg-border'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function buildRawLine(data: WizardFormData): string {
  const parts = [
    data.modalityAE || '',
    data.modalitySN || '',
    data.modalityStationName ? data.modalityStationName.replace(/ /g, '*') : '',
    data.modalityLocation ? data.modalityLocation.replace(/ /g, '*') : '',
    data.risAE || '',
    data.risSN || '',
    data.persistStudyUID ? 'true' : 'false',
  ];
  return parts.join('|');
}

export function MappingWizard({
  open,
  onOpenChange,
  modalities,
  modalityTypes,
  existingEntries,
  onSubmit,
}: MappingWizardProps) {
  const [step, setStep] = useState(1);
  const [sourceMode, setSourceMode] = useState<SourceMode>('registered');
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedModalityId, setSelectedModalityId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [rawPreviewOpen, setRawPreviewOpen] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<WizardFormData>({
    modalityAE: '',
    modalitySN: '',
    modalityStationName: '',
    modalityLocation: '',
    risAE: '',
    risSN: '',
    persistStudyUID: false,
  });

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep(1);
      setSourceMode('registered');
      setSelectedModalityId(null);
      setComboboxOpen(false);
      setSaving(false);
      setRawPreviewOpen(false);
      setFormData({
        modalityAE: '',
        modalitySN: '',
        modalityStationName: '',
        modalityLocation: '',
        risAE: '',
        risSN: '',
        persistStudyUID: false,
      });
    }
  }, [open]);

  // Auto-focus first input when step changes
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => firstInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [step, open]);

  const selectedModality = modalities.find((m) => m.modalityId === selectedModalityId);

  function handleSelectModality(modalityId: number) {
    const mod = modalities.find((m) => m.modalityId === modalityId);
    if (mod) {
      setSelectedModalityId(modalityId);
      setFormData((prev) => ({
        ...prev,
        modalityAE: mod.aeTitle || '',
        modalitySN: mod.modalityTypeId || '',
      }));
    }
    setComboboxOpen(false);
  }

  function handleNext() {
    if (step === 1 && formData.risAE === '' && formData.risSN === '') {
      // Pre-fill RIS fields from source as smart defaults
      setFormData((prev) => ({
        ...prev,
        risAE: prev.risAE || prev.modalityAE,
        risSN: prev.risSN || prev.modalitySN,
      }));
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleCreate() {
    setSaving(true);
    try {
      const entry: MappingEntry = {
        lineNumber: 0,
        modalityAE: formData.modalityAE.trim() || undefined,
        modalitySN: formData.modalitySN.trim() || undefined,
        modalityStationName: formData.modalityStationName.trim()
          ? formData.modalityStationName.trim().replace(/ /g, '*')
          : undefined,
        modalityLocation: formData.modalityLocation.trim()
          ? formData.modalityLocation.trim().replace(/ /g, '*')
          : undefined,
        risAE: formData.risAE.trim() || undefined,
        risSN: formData.risSN.trim() || undefined,
        persistStudyUID: formData.persistStudyUID,
        isComment: false,
      };
      await onSubmit(entry);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  // Validation per step
  const step1Valid =
    (formData.modalityAE.trim() !== '' || formData.modalitySN.trim() !== '');
  const step2Valid =
    (formData.risAE.trim() !== '' || formData.risSN.trim() !== '');
  const canProceed =
    (step === 1 && step1Valid) ||
    (step === 2 && step2Valid) ||
    step === 3 ||
    step === 4;

  // Duplicate detection
  const duplicateMatch = existingEntries.find(
    (e) =>
      !e.isComment &&
      formData.modalityAE.trim() !== '' &&
      e.modalityAE?.toLowerCase() === formData.modalityAE.trim().toLowerCase()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            New Mapping Wizard
          </DialogTitle>
          <DialogDescription>
            Create a new modality-to-RIS mapping step by step.
          </DialogDescription>
        </DialogHeader>

        <StepIndicator currentStep={step} />
        <Separator />

        <div className="min-h-[300px] py-2">
          {/* ========== STEP 1: Source Device ========== */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-1">
                  Which imaging device is this mapping for?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A mapping tells the system how to translate a physical imaging
                  device&apos;s identity into the correct entry in the Radiology
                  Information System (RIS).
                </p>
              </div>

              {/* Mode selector cards */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSourceMode('registered');
                    setFormData((prev) => ({ ...prev, modalityAE: '', modalitySN: '' }));
                    setSelectedModalityId(null);
                  }}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    sourceMode === 'registered'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="text-sm font-medium mb-0.5">Choose from registered devices</div>
                  <div className="text-[11px] text-muted-foreground">
                    Select a modality already configured in the system.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSourceMode('manual');
                    setSelectedModalityId(null);
                  }}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    sourceMode === 'manual'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="text-sm font-medium mb-0.5">Enter details manually</div>
                  <div className="text-[11px] text-muted-foreground">
                    Type the AE Title and device type yourself.
                  </div>
                </button>
              </div>

              {sourceMode === 'registered' ? (
                <div className="space-y-2">
                  <Label>Select Device</Label>
                  <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={comboboxOpen}
                        className="w-full justify-between font-normal"
                      >
                        {selectedModality ? (
                          <span className="flex items-center gap-2">
                            <span>{selectedModality.name}</span>
                            {selectedModality.aeTitle && (
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {selectedModality.aeTitle}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[10px]">
                              {selectedModality.modalityTypeId}
                            </Badge>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Search for a device...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" style={{ zIndex: 51 }}>
                      <Command>
                        <CommandInput placeholder="Search by name, AE Title, or type..." />
                        <CommandList>
                          <CommandEmpty>No devices found.</CommandEmpty>
                          <CommandGroup>
                            {modalities
                              .filter((m) => !m.isRetired)
                              .map((mod) => (
                                <CommandItem
                                  key={mod.modalityId}
                                  value={`${mod.name} ${mod.aeTitle || ''} ${mod.modalityTypeId}`}
                                  onSelect={() => handleSelectModality(mod.modalityId)}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      selectedModalityId === mod.modalityId
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    }`}
                                  />
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="truncate">{mod.name}</span>
                                    {mod.aeTitle && (
                                      <Badge
                                        variant="outline"
                                        className="font-mono text-[10px] shrink-0"
                                      >
                                        {mod.aeTitle}
                                      </Badge>
                                    )}
                                    <Badge variant="secondary" className="text-[10px] shrink-0">
                                      {mod.modalityTypeId}
                                    </Badge>
                                    {mod.room && (
                                      <span className="text-[10px] text-muted-foreground truncate">
                                        {mod.room}
                                      </span>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {selectedModality && (
                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">AE Title:</span>
                        <span className="font-mono">{selectedModality.aeTitle || '(none)'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span>{selectedModality.modalityTypeId}</span>
                      </div>
                      {selectedModality.room && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Room:</span>
                          <span>{selectedModality.room}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="wiz-modalityAE">
                      Device Identifier (AE Title)
                    </Label>
                    <Input
                      ref={firstInputRef}
                      id="wiz-modalityAE"
                      value={formData.modalityAE}
                      onChange={(e) =>
                        setFormData({ ...formData, modalityAE: e.target.value })
                      }
                      maxLength={16}
                      placeholder="e.g. CT_SCANNER_1"
                      className="font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      The unique name your imaging device uses to identify itself
                      on the network. Max 16 characters.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wiz-modalitySN">Device Type</Label>
                    <Select
                      value={formData.modalitySN}
                      onValueChange={(val) =>
                        setFormData({ ...formData, modalitySN: val })
                      }
                    >
                      <SelectTrigger id="wiz-modalitySN">
                        <SelectValue placeholder="Select a modality type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {modalityTypes.map((mt) => (
                          <SelectItem
                            key={mt.modalityTypeId}
                            value={mt.modalityTypeId}
                          >
                            <span className="font-mono">{mt.modalityTypeId}</span>
                            {mt.description && (
                              <span className="text-muted-foreground ml-2">
                                &mdash; {mt.description}
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      The type of imaging equipment (e.g. CT, MR, US, XA).
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========== STEP 2: RIS Target ========== */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-1">
                  How should this device appear in the RIS?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  These values define how the device is identified within the
                  Radiology Information System after the mapping is applied.
                </p>
              </div>

              {/* Context card showing step 1 config */}
              <div className="flex items-center gap-3 rounded-lg bg-muted/40 border px-4 py-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-500/15 text-blue-500">
                    <Monitor className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-medium">Source</span>
                </div>
                <div className="text-xs space-y-0.5">
                  {formData.modalityAE && (
                    <div>
                      AE: <span className="font-mono font-medium">{formData.modalityAE}</span>
                    </div>
                  )}
                  {formData.modalitySN && (
                    <div>
                      Type: <Badge variant="outline" className="text-[10px] font-mono">{formData.modalitySN}</Badge>
                    </div>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground mx-2" />
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500/15 text-emerald-500">
                    <Server className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-medium">RIS</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Configure below
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wiz-risAE">RIS Device Identifier (AE Title)</Label>
                  <Input
                    ref={firstInputRef}
                    id="wiz-risAE"
                    value={formData.risAE}
                    onChange={(e) =>
                      setFormData({ ...formData, risAE: e.target.value })
                    }
                    maxLength={16}
                    placeholder="e.g. RIS_CT1"
                    className="font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    How this device&apos;s AE Title should appear in the RIS. Often
                    the same as the source, but can differ.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wiz-risSN">RIS Device Type</Label>
                  <Select
                    value={formData.risSN}
                    onValueChange={(val) =>
                      setFormData({ ...formData, risSN: val })
                    }
                  >
                    <SelectTrigger id="wiz-risSN">
                      <SelectValue placeholder="Select a modality type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {modalityTypes.map((mt) => (
                        <SelectItem
                          key={mt.modalityTypeId}
                          value={mt.modalityTypeId}
                        >
                          <span className="font-mono">{mt.modalityTypeId}</span>
                          {mt.description && (
                            <span className="text-muted-foreground ml-2">
                              &mdash; {mt.description}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.risSN &&
                    formData.modalitySN &&
                    formData.risSN !== formData.modalitySN && (
                      <p className="text-[11px] text-amber-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Source type ({formData.modalitySN}) differs from RIS type ({formData.risSN})
                      </p>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* ========== STEP 3: Additional Details ========== */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-1">
                  Additional Details
                  <Badge variant="secondary" className="ml-2 text-[10px]">Optional</Badge>
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  These fields are optional. You can skip this step and add them
                  later if needed.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wiz-stationName">Station Name</Label>
                  <Input
                    ref={firstInputRef}
                    id="wiz-stationName"
                    value={formData.modalityStationName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        modalityStationName: e.target.value,
                      })
                    }
                    placeholder="e.g. Main CT Room 1"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    A friendly name for the device. Spaces are fine here &mdash;
                    they&apos;ll be converted automatically.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wiz-location">Location / Room</Label>
                  <Input
                    id="wiz-location"
                    value={formData.modalityLocation}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        modalityLocation: e.target.value,
                      })
                    }
                    placeholder="e.g. Building A Floor 2"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Where this device is physically located. Spaces are fine
                    here too.
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <Label htmlFor="wiz-persist" className="font-medium">
                      Preserve Study Identifier
                    </Label>
                    <p className="text-[11px] text-muted-foreground leading-relaxed max-w-md">
                      When enabled, the system remembers the study identifier so
                      repeated worklist requests get the same ID instead of
                      generating a new one each time.
                    </p>
                  </div>
                  <Switch
                    id="wiz-persist"
                    checked={formData.persistStudyUID}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, persistStudyUID: checked })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========== STEP 4: Review ========== */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-1">Review and Create</h3>
                <p className="text-xs text-muted-foreground">
                  Verify the mapping details below before creating.
                </p>
              </div>

              {/* Visual flow diagram */}
              <div className="flex items-center justify-center gap-4 py-3 px-6 rounded-lg bg-muted/40 border">
                <div className="flex flex-col items-center gap-1.5 min-w-[120px]">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-500/15 text-blue-500">
                    <Monitor className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium">
                    {formData.modalityAE || formData.modalitySN || '—'}
                  </span>
                  {formData.modalityAE && formData.modalitySN && (
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {formData.modalitySN}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-medium">
                    maps to
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5 min-w-[120px]">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-emerald-500/15 text-emerald-500">
                    <Server className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium">
                    {formData.risAE || formData.risSN || '—'}
                  </span>
                  {formData.risAE && formData.risSN && (
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {formData.risSN}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-semibold">Source (Device)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">AE Title</span>
                    <span className="font-mono">{formData.modalityAE || '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Type</span>
                    <span>{formData.modalitySN || '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Station Name</span>
                    <span>{formData.modalityStationName || '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Location</span>
                    <span>{formData.modalityLocation || '—'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold">Target (RIS)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">AE Title</span>
                    <span className="font-mono">{formData.risAE || '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Type</span>
                    <span>{formData.risSN || '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Persist UID</span>
                    <span>{formData.persistStudyUID ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>

              {/* Raw line preview (collapsible) */}
              <div className="rounded-md border">
                <button
                  type="button"
                  onClick={() => setRawPreviewOpen(!rawPreviewOpen)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {rawPreviewOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  Raw file line preview
                </button>
                {rawPreviewOpen && (
                  <div className="px-3 pb-2">
                    <code className="block text-[11px] font-mono bg-muted/50 rounded px-2 py-1.5 break-all">
                      {buildRawLine(formData)}
                    </code>
                  </div>
                )}
              </div>

              {/* Duplicate warning */}
              {duplicateMatch && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-medium text-amber-500">
                      Possible duplicate
                    </span>
                    <p className="text-muted-foreground mt-0.5">
                      An existing mapping already uses AE Title{' '}
                      <span className="font-mono font-medium">
                        {duplicateMatch.modalityAE}
                      </span>
                      . Creating another may cause conflicts. You can still
                      proceed if this is intentional.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Navigation footer */}
        <DialogFooter className="flex items-center !justify-between">
          <div>
            {step === 1 ? (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            ) : (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step === 3 && (
              <Button variant="ghost" onClick={handleNext}>
                Skip
              </Button>
            )}
            {step < TOTAL_STEPS ? (
              <Button onClick={handleNext} disabled={!canProceed}>
                Next
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Mapping
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
