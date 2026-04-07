'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlaceholderPanel } from '@/components/reports/placeholder-panel';
import { TemplatePreview } from '@/components/reports/template-preview';
import { reportTemplateApi } from '@/lib/api';
import {
  ReportTemplateBackup,
  TemplatePlaceholder,
  TemplateSection,
} from '@/lib/types';
import {
  FileText,
  Save,
  Loader2,
  ArrowLeft,
  History,
  Eye,
  EyeOff,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import type { editor } from 'monaco-editor';

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react').then(mod => mod.default), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full border rounded-lg bg-muted/20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

// Dynamically import GrapesJS editor (only loads when Visual tab is selected)
const GrapesJsEditor = dynamic(
  () => import('@/components/reports/grapesjs-editor').then(mod => ({ default: mod.GrapesJsEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full border rounded-lg bg-muted/20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground text-sm">Loading visual editor...</span>
      </div>
    ),
  }
);

export default function TemplateEditorPage() {
  const params = useParams<{ name: string }>();
  const router = useRouter();
  const templateName = decodeURIComponent(params.name);

  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [placeholders, setPlaceholders] = useState<TemplatePlaceholder[]>([]);
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [backups, setBackups] = useState<ReportTemplateBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'code' | 'visual'>('code');
  const [showPreview, setShowPreview] = useState(true);
  const [showPlaceholders, setShowPlaceholders] = useState(true);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState('');

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const hasChanges = content !== originalContent;

  const loadData = useCallback(async () => {
    setLoading(true);
    const [contentRes, phRes, secRes, backupRes] = await Promise.all([
      reportTemplateApi.read(templateName),
      reportTemplateApi.getPlaceholders(),
      reportTemplateApi.getSections(),
      reportTemplateApi.listBackups(),
    ]);

    if (contentRes.success && contentRes.data !== undefined) {
      setContent(contentRes.data);
      setOriginalContent(contentRes.data);
    } else {
      toast.error(contentRes.message || 'Failed to load template');
    }
    if (phRes.success && phRes.data) setPlaceholders(phRes.data);
    if (secRes.success && secRes.data) setSections(secRes.data);
    if (backupRes.success && backupRes.data) {
      // Filter backups for this template
      setBackups(backupRes.data.filter(
        (b) => b.originalTemplate.toLowerCase() === templateName.toLowerCase()
      ));
    }
    setLoading(false);
  }, [templateName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Warn on navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await reportTemplateApi.save(templateName, { content });
      if (res.success) {
        toast.success('Template saved');
        setOriginalContent(content);
        // Refresh backup list
        const backupRes = await reportTemplateApi.listBackups();
        if (backupRes.success && backupRes.data) {
          setBackups(backupRes.data.filter(
            (b) => b.originalTemplate.toLowerCase() === templateName.toLowerCase()
          ));
        }
      } else {
        toast.error(res.message || 'Failed to save template');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore() {
    if (!selectedBackup) return;
    setSaving(true);
    try {
      const res = await reportTemplateApi.restoreBackup(selectedBackup);
      if (res.success) {
        toast.success('Template restored from backup');
        setRestoreOpen(false);
        await loadData();
      } else {
        toast.error(res.message || 'Failed to restore backup');
      }
    } finally {
      setSaving(false);
    }
  }

  function handleInsertPlaceholder(tag: string) {
    if (mode === 'code' && editorRef.current) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      if (selection) {
        editor.executeEdits('placeholder-insert', [{
          range: selection,
          text: tag,
          forceMoveMarkers: true,
        }]);
        editor.focus();
      }
    } else {
      // For visual mode, insert at end (GrapesJS handles its own insertion)
      setContent(prev => prev + tag);
    }
  }

  function handleInsertSection(startTag: string, endTag: string) {
    const sectionHtml = `\n${startTag}\n<div>\n  \n</div>\n${endTag}\n`;
    if (mode === 'code' && editorRef.current) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      if (selection) {
        editor.executeEdits('section-insert', [{
          range: selection,
          text: sectionHtml,
          forceMoveMarkers: true,
        }]);
        editor.focus();
      }
    } else {
      setContent(prev => prev + sectionHtml);
    }
  }

  function handleModeChange(newMode: string) {
    setMode(newMode as 'code' | 'visual');
  }

  function handleEditorMount(editor: editor.IStandaloneCodeEditor) {
    editorRef.current = editor;
    // Add Ctrl+S shortcut
    editor.addCommand(
      // Monaco KeyMod.CtrlCmd | Monaco KeyCode.KeyS
      2048 | 49, // CtrlCmd + S
      () => handleSave()
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-card shrink-0">
        <Button variant="ghost" size="sm" onClick={() => router.push('/reports/templates')} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Templates
        </Button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium truncate">{templateName}</span>
          {hasChanges && (
            <Badge variant="outline" className="text-amber-500 border-amber-500 shrink-0">
              Unsaved
            </Badge>
          )}
        </div>

        <Tabs value={mode} onValueChange={handleModeChange}>
          <TabsList className="h-8">
            <TabsTrigger value="code" className="text-xs px-3 h-7">Code</TabsTrigger>
            <TabsTrigger value="visual" className="text-xs px-3 h-7">Visual</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1">
          {mode === 'code' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowPreview(!showPreview)}
                title={showPreview ? 'Hide preview' : 'Show preview'}
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowPlaceholders(!showPlaceholders)}
                title={showPlaceholders ? 'Hide placeholders' : 'Show placeholders'}
              >
                {showPlaceholders ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSelectedBackup(''); setRestoreOpen(true); }}
            className="gap-1"
            disabled={backups.length === 0}
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Backups ({backups.length})</span>
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="gap-1"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {mode === 'code' ? (
          <>
            {/* Monaco + Preview split */}
            <div className="flex flex-1 min-w-0">
              <div className={showPreview ? 'w-1/2 border-r' : 'flex-1'}>
                <MonacoEditor
                  height="100%"
                  language="html"
                  theme="vs-dark"
                  value={content}
                  onChange={(value) => setContent(value || '')}
                  onMount={handleEditorMount}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    renderWhitespace: 'selection',
                    bracketPairColorization: { enabled: true },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                  }}
                />
              </div>
              {showPreview && (
                <div className="w-1/2">
                  <TemplatePreview
                    content={content}
                    placeholders={placeholders}
                    className="h-full"
                  />
                </div>
              )}
            </div>

            {/* Placeholder panel */}
            {showPlaceholders && (
              <div className="w-64 shrink-0">
                <PlaceholderPanel
                  placeholders={placeholders}
                  sections={sections}
                  onInsertPlaceholder={handleInsertPlaceholder}
                  onInsertSection={handleInsertSection}
                />
              </div>
            )}
          </>
        ) : (
          /* Visual / GrapesJS mode */
          <div className="flex-1 h-full">
            <GrapesJsEditor
              content={content}
              onChange={setContent}
              placeholders={placeholders}
            />
          </div>
        )}
      </div>

      {/* Restore Backup Dialog */}
      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restore from Backup</DialogTitle>
            <DialogDescription>
              Select a backup to restore. The current template will be backed up first.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedBackup} onValueChange={setSelectedBackup}>
              <SelectTrigger>
                <SelectValue placeholder="Select a backup..." />
              </SelectTrigger>
              <SelectContent>
                {backups.map((b) => (
                  <SelectItem key={b.fileName} value={b.fileName}>
                    {b.fileName} ({new Date(b.createdAt).toLocaleString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreOpen(false)}>Cancel</Button>
            <Button onClick={handleRestore} disabled={saving || !selectedBackup}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
