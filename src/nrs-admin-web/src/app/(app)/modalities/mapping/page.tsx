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
import { mappingApi } from '@/lib/api';
import { MappingEntry, MappingBackup } from '@/lib/types';
import {
  FileCode2,
  Save,
  RotateCcw,
  Loader2,
  AlertCircle,
  History,
  Table2,
  Code,
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

  const loadData = useCallback(async () => {
    setLoading(true);
    const [entriesRes, rawRes, backupsRes] = await Promise.all([
      mappingApi.getEntries(),
      mappingApi.getRaw(),
      mappingApi.getBackups(),
    ]);

    if (entriesRes.success && entriesRes.data) setEntries(entriesRes.data);
    if (rawRes.success && rawRes.data !== undefined) setRawContent(rawRes.data);
    if (backupsRes.success && backupsRes.data) setBackups(backupsRes.data);
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
            <Button onClick={handleSaveRaw} disabled={saving || !hasChanges} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
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
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  Mapping Entries
                  <Badge variant="outline">{activeEntries.length} active</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {activeEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 gap-2">
                    <AlertCircle className="h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No active mapping entries. Switch to Raw Editor to add entries.
                    </p>
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
    </div>
  );
}
