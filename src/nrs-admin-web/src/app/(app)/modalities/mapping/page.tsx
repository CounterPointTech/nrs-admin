'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { mappingApi, modalityApi, modalityTypeApi } from '@/lib/api';
import { MappingEntry, MappingBackup, Modality, ModalityType } from '@/lib/types';
import { MappingWizard } from '@/components/modalities/mapping-wizard';
import {
  FileCode2,
  Save,
  RotateCcw,
  Loader2,
  AlertCircle,
  History,
  Table2,
  Code,
  Plus,
  Pencil,
  Trash2,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Monitor,
  Server,
  Asterisk,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react').then(mod => mod.default), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 border rounded-lg bg-muted/20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

export default function MappingEditorPage() {
  const [entries, setEntries] = useState<MappingEntry[]>([]);
  const [rawContent, setRawContent] = useState('');
  const [backups, setBackups] = useState<MappingBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [tab, setTab] = useState('visual');
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [modalityTypes, setModalityTypes] = useState<ModalityType[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [entriesRes, rawRes, backupsRes, modalitiesRes, typesRes] = await Promise.all([
      mappingApi.getEntries(),
      mappingApi.getRaw(),
      mappingApi.getBackups(),
      modalityApi.getAll(),
      modalityTypeApi.getAll(),
    ]);

    if (entriesRes.success && entriesRes.data) setEntries(entriesRes.data);
    if (rawRes.success && rawRes.data !== undefined) setRawContent(rawRes.data);
    if (backupsRes.success && backupsRes.data) setBackups(backupsRes.data);
    if (modalitiesRes.success && modalitiesRes.data) setModalities(modalitiesRes.data);
    if (typesRes.success && typesRes.data) setModalityTypes(typesRes.data);
    setHasChanges(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSaveRaw() {
    setSaving(true);
    try {
      const res = await mappingApi.saveRaw(rawContent);
      if (res.success) {
        toast.success('Mapping file saved');
        setHasChanges(false);
        // Reload to get updated parsed entries and backup list
        await loadData();
      } else {
        toast.error(res.message || 'Failed to save mapping file');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore() {
    if (!selectedBackup) return;
    setSaving(true);
    try {
      const res = await mappingApi.restore(selectedBackup);
      if (res.success) {
        toast.success(`Restored from ${selectedBackup}`);
        setRestoreOpen(false);
        setSelectedBackup('');
        await loadData();
      } else {
        toast.error(res.message || 'Failed to restore backup');
      }
    } finally {
      setSaving(false);
    }
  }

  // CRUD state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MappingEntry | null>(null);
  const [formData, setFormData] = useState({
    modalityAE: '',
    modalitySN: '',
    modalityStationName: '',
    modalityLocation: '',
    risAE: '',
    risSN: '',
    persistStudyUID: false,
  });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingEntry, setDeletingEntry] = useState<MappingEntry | null>(null);

  const isFormValid =
    (formData.modalityAE.trim() || formData.modalitySN.trim()) &&
    (formData.risAE.trim() || formData.risSN.trim());

  function openEditor(entry?: MappingEntry) {
    if (entry) {
      setEditingEntry(entry);
      setFormData({
        modalityAE: entry.modalityAE || '',
        modalitySN: entry.modalitySN || '',
        modalityStationName: entry.modalityStationName || '',
        modalityLocation: entry.modalityLocation || '',
        risAE: entry.risAE || '',
        risSN: entry.risSN || '',
        persistStudyUID: entry.persistStudyUID ?? false,
      });
    } else {
      setEditingEntry(null);
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
    setEditorOpen(true);
  }

  async function handleSaveEntry() {
    setSaving(true);
    try {
      let updatedEntries: MappingEntry[];
      if (editingEntry) {
        updatedEntries = entries.map((e) =>
          e.lineNumber === editingEntry.lineNumber
            ? {
                ...e,
                modalityAE: formData.modalityAE.trim() || undefined,
                modalitySN: formData.modalitySN.trim() || undefined,
                modalityStationName: formData.modalityStationName.trim() || undefined,
                modalityLocation: formData.modalityLocation.trim() || undefined,
                risAE: formData.risAE.trim() || undefined,
                risSN: formData.risSN.trim() || undefined,
                persistStudyUID: formData.persistStudyUID,
                isComment: false,
              }
            : e
        );
      } else {
        const newEntry: MappingEntry = {
          lineNumber: 0,
          modalityAE: formData.modalityAE.trim() || undefined,
          modalitySN: formData.modalitySN.trim() || undefined,
          modalityStationName: formData.modalityStationName.trim() || undefined,
          modalityLocation: formData.modalityLocation.trim() || undefined,
          risAE: formData.risAE.trim() || undefined,
          risSN: formData.risSN.trim() || undefined,
          persistStudyUID: formData.persistStudyUID,
          isComment: false,
        };
        updatedEntries = [...entries, newEntry];
      }
      const res = await mappingApi.saveEntries(updatedEntries);
      if (res.success) {
        toast.success(editingEntry ? 'Mapping updated' : 'Mapping added');
        setEditorOpen(false);
        await loadData();
      } else {
        toast.error(res.message || 'Failed to save mapping');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEntry() {
    if (!deletingEntry) return;
    setSaving(true);
    try {
      const updatedEntries = entries.filter(
        (e) => e.lineNumber !== deletingEntry.lineNumber
      );
      const res = await mappingApi.saveEntries(updatedEntries);
      if (res.success) {
        toast.success('Mapping deleted');
        setDeleteOpen(false);
        setDeletingEntry(null);
        await loadData();
      } else {
        toast.error(res.message || 'Failed to delete mapping');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleWizardSubmit(entry: MappingEntry) {
    const updatedEntries = [...entries, entry];
    const res = await mappingApi.saveEntries(updatedEntries);
    if (res.success) {
      toast.success('Mapping created');
      await loadData();
    } else {
      toast.error(res.message || 'Failed to create mapping');
      throw new Error(res.message || 'Failed to create mapping');
    }
  }

  const activeEntries = entries.filter((e) => !e.isComment);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mapping Editor"
        description="Edit the modality mapping configuration file"
        icon={FileCode2}
        actions={
          <div className="flex items-center gap-2">
            {backups.length > 0 && (
              <Button variant="outline" onClick={() => setRestoreOpen(true)} className="gap-2">
                <History className="h-4 w-4" />
                Restore
                <Badge variant="secondary" className="ml-1">{backups.length}</Badge>
              </Button>
            )}
            {tab === 'raw' && (
              <Button onClick={handleSaveRaw} disabled={saving || !hasChanges} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            )}
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="visual" className="gap-2">
              <Table2 className="h-4 w-4" /> Visual
            </TabsTrigger>
            <TabsTrigger value="raw" className="gap-2">
              <Code className="h-4 w-4" /> Raw Editor
            </TabsTrigger>
          </TabsList>

          {/* Visual Table View */}
          <TabsContent value="visual" className="space-y-4">
            {/* How Mapping Works Guide */}
            <Card className="border-dashed">
              <CardHeader className="py-3 cursor-pointer select-none" onClick={() => setShowGuide(!showGuide)}>
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  {showGuide ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <HelpCircle className="h-4 w-4" />
                  How Mapping Works
                </CardTitle>
              </CardHeader>
              {showGuide && (
                <CardContent className="pt-0 space-y-5">
                  {/* Overview */}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    When a modality sends a DICOM worklist request, the system uses these mapping
                    rules to translate the modality&apos;s identity into the correct RIS entry. Each
                    rule matches a <strong className="text-foreground">source</strong> (the physical
                    device) to a <strong className="text-foreground">target</strong> (how it appears in the RIS).
                  </p>

                  {/* Visual Flow Diagram */}
                  <div className="flex items-center justify-center gap-3 py-4 px-6 rounded-lg bg-muted/40 border">
                    <div className="flex flex-col items-center gap-1.5 min-w-[140px]">
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-500/15 text-blue-500">
                        <Monitor className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-medium">Modality Device</span>
                      <span className="text-[10px] text-muted-foreground">CT, MRI, Ultrasound...</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground font-medium">mapping rule</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 min-w-[140px]">
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-emerald-500/15 text-emerald-500">
                        <Server className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-medium">RIS System</span>
                      <span className="text-[10px] text-muted-foreground">Radiology Information System</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Field Reference */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Field Reference
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Source Fields */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          <span className="text-xs font-semibold">Source (Modality)</span>
                        </div>

                        <div className="rounded-md border px-3 py-2 space-y-1">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs font-medium">Modality AE</span>
                            <Badge variant="outline" className="text-[10px] h-4">max 16 chars</Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-snug">
                            The DICOM Application Entity Title of the device sending the worklist request.
                          </p>
                        </div>

                        <div className="rounded-md border px-3 py-2 space-y-1">
                          <span className="text-xs font-medium">Modality SN</span>
                          <p className="text-[11px] text-muted-foreground leading-snug">
                            The modality type or short name (e.g. CT, MR, US, XA, CR).
                          </p>
                        </div>

                        <div className="rounded-md border px-3 py-2 space-y-1 border-dashed">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Station Name</span>
                            <Badge variant="secondary" className="text-[10px] h-4">optional</Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-snug">
                            Friendly name for the modality. Overrides DICOM tag (0040,0010).
                          </p>
                        </div>

                        <div className="rounded-md border px-3 py-2 space-y-1 border-dashed">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Location</span>
                            <Badge variant="secondary" className="text-[10px] h-4">optional</Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-snug">
                            Room or area where the modality is located. Overrides DICOM tags (0040,0011) and (0040,1005).
                          </p>
                        </div>
                      </div>

                      {/* Target Fields */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-semibold">Target (RIS)</span>
                        </div>

                        <div className="rounded-md border px-3 py-2 space-y-1">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs font-medium">RIS AE</span>
                            <Badge variant="outline" className="text-[10px] h-4">max 16 chars</Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-snug">
                            The AE Title of this modality as registered in the RIS.
                          </p>
                        </div>

                        <div className="rounded-md border px-3 py-2 space-y-1">
                          <span className="text-xs font-medium">RIS SN</span>
                          <p className="text-[11px] text-muted-foreground leading-snug">
                            The modality type or short name as it should appear in the RIS (e.g. MRI instead of MR).
                          </p>
                        </div>

                        <div className="rounded-md border px-3 py-2 space-y-1 border-dashed">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Persist Study UID</span>
                            <Badge variant="secondary" className="text-[10px] h-4">optional</Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-snug">
                            When enabled, the RIS-generated Study UID is preserved across
                            repeated worklist requests instead of being regenerated each time.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Tips */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex gap-2 rounded-md bg-muted/40 px-3 py-2.5">
                      <Asterisk className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium mb-0.5">Spaces in Names</p>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Use <code className="bg-muted px-1 rounded text-[10px]">*</code> instead
                          of spaces in Station Name and Location fields.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 rounded-md bg-muted/40 px-3 py-2.5">
                      <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium mb-0.5">Required Fields</p>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Each mapping needs at least one source field (AE or SN) and
                          one target field (RIS AE or SN).
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 rounded-md bg-muted/40 px-3 py-2.5">
                      <RefreshCw className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium mb-0.5">Auto-Backup</p>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Every save automatically creates a backup of the previous
                          file. Use the Restore button to roll back.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    Mapping Entries
                    <Badge variant="outline">{activeEntries.length} active</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditor()} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Quick Add
                    </Button>
                    <Button size="sm" onClick={() => setWizardOpen(true)} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      New Mapping
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {activeEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 gap-3">
                    <AlertCircle className="h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No active mapping entries.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Add your first mapping
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Modality AE</TableHead>
                        <TableHead>Modality SN</TableHead>
                        <TableHead>Station Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>RIS AE</TableHead>
                        <TableHead>RIS SN</TableHead>
                        <TableHead className="w-20">Persist UID</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeEntries.map((entry, i) => (
                        <TableRow key={entry.lineNumber}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{entry.lineNumber}</TableCell>
                          <TableCell className="font-mono text-xs">{entry.modalityAE || '—'}</TableCell>
                          <TableCell>
                            {entry.modalitySN ? (
                              <Badge variant="outline" className="font-mono">{entry.modalitySN}</Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-xs">{entry.modalityStationName?.replace(/\*/g, ' ') || '—'}</TableCell>
                          <TableCell className="text-xs">{entry.modalityLocation?.replace(/\*/g, ' ') || '—'}</TableCell>
                          <TableCell className="font-mono text-xs">{entry.risAE || '—'}</TableCell>
                          <TableCell>
                            {entry.risSN ? (
                              <Badge variant="outline" className="font-mono">{entry.risSN}</Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {entry.persistStudyUID === true ? (
                              <Badge variant="default" className="text-[10px]">Yes</Badge>
                            ) : entry.persistStudyUID === false ? 'No' : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEditor(entry)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setDeletingEntry(entry);
                                  setDeleteOpen(true);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Raw Monaco Editor */}
          <TabsContent value="raw">
            <Card>
              <CardContent className="p-0 overflow-hidden rounded-lg">
                <MonacoEditor
                  height="500px"
                  language="ini"
                  theme="vs-dark"
                  value={rawContent}
                  onChange={(value) => {
                    setRawContent(value || '');
                    setHasChanges(true);
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: 'JetBrains Mono, Consolas, monospace',
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    renderLineHighlight: 'gutter',
                    padding: { top: 12, bottom: 12 },
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Restore Backup Dialog */}
      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restore from Backup</DialogTitle>
            <DialogDescription>
              Select a backup to restore. The current file will be backed up first.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Select value={selectedBackup} onValueChange={setSelectedBackup}>
              <SelectTrigger><SelectValue placeholder="Select backup" /></SelectTrigger>
              <SelectContent>
                {backups.map((b) => (
                  <SelectItem key={b.fileName} value={b.fileName}>
                    {b.fileName}
                    <span className="text-xs text-muted-foreground ml-2">
                      ({(b.sizeBytes / 1024).toFixed(1)} KB)
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreOpen(false)}>Cancel</Button>
            <Button onClick={handleRestore} disabled={saving || !selectedBackup} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Mapping Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Mapping' : 'Add Mapping'}</DialogTitle>
            <DialogDescription>
              {editingEntry
                ? 'Update the modality-to-RIS mapping fields.'
                : 'Create a new modality-to-RIS mapping entry.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modalityAE">Modality AE</Label>
                <Input
                  id="modalityAE"
                  value={formData.modalityAE}
                  onChange={(e) => setFormData({ ...formData, modalityAE: e.target.value })}
                  maxLength={16}
                  placeholder="e.g. CT_SCANNER_1"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modalitySN">Modality SN</Label>
                <Input
                  id="modalitySN"
                  value={formData.modalitySN}
                  onChange={(e) => setFormData({ ...formData, modalitySN: e.target.value })}
                  placeholder="e.g. 12345"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modalityStationName">Station Name</Label>
                <Input
                  id="modalityStationName"
                  value={formData.modalityStationName}
                  onChange={(e) => setFormData({ ...formData, modalityStationName: e.target.value })}
                  placeholder="use * for spaces"
                />
                <p className="text-[11px] text-muted-foreground">Use * for spaces</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="modalityLocation">Location</Label>
                <Input
                  id="modalityLocation"
                  value={formData.modalityLocation}
                  onChange={(e) => setFormData({ ...formData, modalityLocation: e.target.value })}
                  placeholder="use * for spaces"
                />
                <p className="text-[11px] text-muted-foreground">Use * for spaces</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="risAE">RIS AE</Label>
                <Input
                  id="risAE"
                  value={formData.risAE}
                  onChange={(e) => setFormData({ ...formData, risAE: e.target.value })}
                  maxLength={16}
                  placeholder="e.g. RIS_AE"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="risSN">RIS SN</Label>
                <Input
                  id="risSN"
                  value={formData.risSN}
                  onChange={(e) => setFormData({ ...formData, risSN: e.target.value })}
                  placeholder="e.g. 67890"
                  className="font-mono"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.persistStudyUID}
                onCheckedChange={(c) => setFormData({ ...formData, persistStudyUID: !!c })}
              />
              <span className="text-sm">Persist Study UID</span>
            </label>

            {!isFormValid && (
              <p className="text-xs text-muted-foreground">
                Requires at least one source field (Modality AE or SN) and one target field (RIS AE or SN).
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEntry} disabled={saving || !isFormValid}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingEntry ? 'Save Changes' : 'Add Mapping'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mapping Wizard */}
      <MappingWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        modalities={modalities}
        modalityTypes={modalityTypes}
        existingEntries={entries}
        onSubmit={handleWizardSubmit}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Mapping</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this mapping?
            </DialogDescription>
          </DialogHeader>
          {deletingEntry && (
            <div className="py-2 text-sm">
              <span className="font-mono">
                {deletingEntry.modalityAE || deletingEntry.modalitySN || '?'}
              </span>
              {' → '}
              <span className="font-mono">
                {deletingEntry.risAE || deletingEntry.risSN || '?'}
              </span>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteEntry} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
