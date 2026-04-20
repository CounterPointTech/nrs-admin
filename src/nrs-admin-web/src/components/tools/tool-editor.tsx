'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ExternalTool, ExternalToolType, ExternalToolShell, CreateExternalToolRequest } from '@/lib/types';
import { IconPicker } from './icon-picker';
import { FileBrowserDialog } from '@/components/file-browser-dialog';
import { Loader2, AlertCircle, FolderOpen, ShieldCheck } from 'lucide-react';

interface ToolEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: ExternalTool | null; // null = create
  existingCategories: string[];
  onSave: (data: CreateExternalToolRequest, id?: string) => Promise<void>;
}

const TYPE_OPTIONS: { value: ExternalToolType; label: string; hint: string }[] = [
  { value: 'Url', label: 'Web URL', hint: 'Opens a website in a new browser tab' },
  { value: 'Executable', label: 'Desktop App', hint: 'Launches a .exe on the API host machine' },
  {
    value: 'Command',
    label: 'CLI Command or Script',
    hint: 'Runs a shell command, batch file, or PowerShell script in a console window on the API host',
  },
  { value: 'FileOrFolder', label: 'File or Folder', hint: 'Opens a file or folder using the OS default handler' },
];

const TARGET_LABEL: Record<ExternalToolType, string> = {
  Url: 'URL',
  Executable: 'Executable Path',
  Command: 'Command or Script',
  FileOrFolder: 'File or Folder Path',
};

const TARGET_PLACEHOLDER: Record<ExternalToolType, string> = {
  Url: 'https://example.com',
  Executable: 'C:\\Program Files\\Tool\\tool.exe',
  Command: 'ipconfig /all   —or—   C:\\Scripts\\daily-backup.bat',
  FileOrFolder: 'C:\\Logs',
};

export function ToolEditor({ open, onOpenChange, tool, existingCategories, onSave }: ToolEditorProps) {
  const [form, setForm] = useState<CreateExternalToolRequest>({
    name: '',
    description: '',
    type: 'Url',
    target: '',
    arguments: '',
    workingDirectory: '',
    iconName: undefined,
    category: '',
    sortOrder: 0,
    shell: 'Default',
    runAsAdmin: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browser, setBrowser] = useState<{ open: boolean; field: 'target' | 'workingDirectory'; type: 'file' | 'directory' }>({
    open: false,
    field: 'target',
    type: 'file',
  });

  useEffect(() => {
    if (open) {
      setError(null);
      if (tool) {
        setForm({
          name: tool.name,
          description: tool.description ?? '',
          type: tool.type,
          target: tool.target,
          arguments: tool.arguments ?? '',
          workingDirectory: tool.workingDirectory ?? '',
          iconName: tool.iconName ?? undefined,
          category: tool.category ?? '',
          sortOrder: tool.sortOrder,
          shell: tool.shell ?? 'Default',
          runAsAdmin: tool.runAsAdmin ?? false,
        });
      } else {
        setForm({
          name: '',
          description: '',
          type: 'Url',
          target: '',
          arguments: '',
          workingDirectory: '',
          iconName: undefined,
          category: '',
          sortOrder: 0,
          shell: 'Default',
          runAsAdmin: false,
        });
      }
    }
  }, [open, tool]);

  const update = <K extends keyof CreateExternalToolRequest>(key: K, value: CreateExternalToolRequest[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!form.target.trim()) {
      setError('Target is required.');
      return;
    }
    if (form.type === 'Url') {
      try {
        const u = new URL(form.target);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          setError('URL must start with http:// or https://');
          return;
        }
      } catch {
        setError('Target must be a valid absolute URL.');
        return;
      }
    }

    setSaving(true);
    try {
      await onSave(
        {
          ...form,
          name: form.name.trim(),
          target: form.target.trim(),
          description: form.description?.trim() || undefined,
          arguments: form.arguments?.trim() || undefined,
          workingDirectory: form.workingDirectory?.trim() || undefined,
          category: form.category?.trim() || undefined,
        },
        tool?.id
      );
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tool.');
    } finally {
      setSaving(false);
    }
  };

  const isUrl = form.type === 'Url';
  const showArgs = form.type === 'Executable' || form.type === 'Command';
  const showWorkDir = form.type !== 'Url';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{tool ? 'Edit Tool' : 'Add Tool'}</DialogTitle>
            <DialogDescription>
              {tool ? 'Update this tool\u2019s details.' : 'Add a web URL, desktop app, CLI command, or file shortcut to your launchpad.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => update('type', v as ExternalToolType)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex flex-col">
                        <span>{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.hint}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="tool-name">Name</Label>
                <Input
                  id="tool-name"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="My Favorite Tool"
                  maxLength={100}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <IconPicker
                  value={form.iconName}
                  onChange={(name) => update('iconName', name)}
                  type={form.type}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tool-target">{TARGET_LABEL[form.type]}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="tool-target"
                  value={form.target}
                  onChange={(e) => update('target', e.target.value)}
                  placeholder={TARGET_PLACEHOLDER[form.type]}
                  className="font-mono text-sm"
                  required
                />
                {form.type === 'Executable' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => setBrowser({ open: true, field: 'target', type: 'file' })}
                    title="Browse for file"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Browse
                  </Button>
                )}
                {form.type === 'FileOrFolder' && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1.5"
                      onClick={() => setBrowser({ open: true, field: 'target', type: 'file' })}
                      title="Browse for file"
                    >
                      <FolderOpen className="h-4 w-4" />
                      File
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1.5"
                      onClick={() => setBrowser({ open: true, field: 'target', type: 'directory' })}
                      title="Browse for folder"
                    >
                      <FolderOpen className="h-4 w-4" />
                      Folder
                    </Button>
                  </>
                )}
              </div>
              {form.type === 'Executable' && (
                <p className="text-xs text-muted-foreground">
                  Works for <code className="font-mono">.exe</code>, <code className="font-mono">.msi</code>,
                  <code className="font-mono">.bat</code>, <code className="font-mono">.cmd</code>, and any file
                  whose extension has a Windows association (e.g. <code className="font-mono">.py</code> if Python is installed).
                  For <code className="font-mono">.ps1</code> scripts, use <strong>CLI Command or Script</strong> with the PowerShell shell instead.
                </p>
              )}
              {form.type === 'FileOrFolder' && (
                <p className="text-xs text-muted-foreground">
                  Browse opens the file picker on the machine running the NRS Admin API.
                </p>
              )}
              {form.type === 'Command' && (
                <p className="text-xs text-muted-foreground">
                  Enter a shell command (<code className="font-mono">ipconfig /all</code>), a batch file path
                  (<code className="font-mono">C:\Scripts\backup.bat</code>), or any script the selected shell
                  can run. A console window will open on the API host so you can see the output — close it when done.
                </p>
              )}
            </div>

            {showArgs && (
              <div className="space-y-2">
                <Label htmlFor="tool-args">Arguments (optional)</Label>
                <Input
                  id="tool-args"
                  value={form.arguments ?? ''}
                  onChange={(e) => update('arguments', e.target.value)}
                  placeholder={form.type === 'Command' ? 'additional args' : '--flag value'}
                  className="font-mono text-sm"
                />
              </div>
            )}

            {showWorkDir && (
              <div className="space-y-2">
                <Label htmlFor="tool-wd">Working Directory (optional)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="tool-wd"
                    value={form.workingDirectory ?? ''}
                    onChange={(e) => update('workingDirectory', e.target.value)}
                    placeholder="C:\\Working\\Dir"
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => setBrowser({ open: true, field: 'workingDirectory', type: 'directory' })}
                    title="Browse for folder"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Browse
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  The folder the process starts in — affects how relative paths resolve.
                </p>
              </div>
            )}

            {form.type !== 'Url' && (
              <div className="grid grid-cols-1 gap-4 rounded-md border border-border/60 bg-muted/20 p-4 sm:grid-cols-2">
                {form.type === 'Command' && (
                  <div className="space-y-2">
                    <Label>Shell</Label>
                    <Select
                      value={form.shell}
                      onValueChange={(v) => update('shell', v as ExternalToolShell)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Default">
                          <div className="flex flex-col">
                            <span>Default (from server config)</span>
                            <span className="text-xs text-muted-foreground">Uses whatever the server admin set</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Cmd">
                          <div className="flex flex-col">
                            <span>Command Prompt (cmd.exe)</span>
                            <span className="text-xs text-muted-foreground">Best for .bat / .cmd scripts and classic commands</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="PowerShell">
                          <div className="flex flex-col">
                            <span>Windows PowerShell (powershell.exe)</span>
                            <span className="text-xs text-muted-foreground">Best for .ps1 scripts on Windows 10/11</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="PwshCore">
                          <div className="flex flex-col">
                            <span>PowerShell Core (pwsh.exe)</span>
                            <span className="text-xs text-muted-foreground">PowerShell 7+; must be installed on the API host</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className={form.type === 'Command' ? '' : 'sm:col-span-2'}>
                  <Label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={form.runAsAdmin}
                      onCheckedChange={(v) => update('runAsAdmin', v === true)}
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <span className="flex items-center gap-1.5 font-medium">
                        <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        Run as Administrator
                      </span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        Triggers a UAC prompt on the API host each time this tool launches.
                        Required for tools that write to Program Files, change system settings, or need elevated access.
                        {form.type === 'FileOrFolder' && (
                          <>
                            {' '}Note: Windows may ignore elevation for folders (Explorer is a security-protected process)
                            — works best for files whose handler honors the admin verb (e.g. Notepad editing
                            <code className="mx-1 font-mono">hosts</code>, regedit).
                          </>
                        )}
                      </span>
                    </div>
                  </Label>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tool-desc">Description (optional)</Label>
              <Textarea
                id="tool-desc"
                value={form.description ?? ''}
                onChange={(e) => update('description', e.target.value)}
                placeholder="What this tool does"
                maxLength={500}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tool-category">Category (optional)</Label>
                <Input
                  id="tool-category"
                  list="tool-categories"
                  value={form.category ?? ''}
                  onChange={(e) => update('category', e.target.value)}
                  placeholder="DICOM, Logs, Monitoring..."
                />
                <datalist id="tool-categories">
                  {existingCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tool-order">Sort Order</Label>
                <Input
                  id="tool-order"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => update('sortOrder', Number(e.target.value) || 0)}
                />
              </div>
            </div>

            {!isUrl && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                <strong>Note:</strong> Desktop, command, and file launches execute on the machine running the NRS Admin API.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tool ? 'Save Changes' : 'Add Tool'}
            </Button>
          </DialogFooter>
        </form>

        <FileBrowserDialog
          open={browser.open}
          onOpenChange={(o) => setBrowser((b) => ({ ...b, open: o }))}
          type={browser.type}
          title={
            browser.field === 'workingDirectory'
              ? 'Select Working Directory'
              : browser.type === 'directory'
                ? 'Select Folder'
                : 'Select File'
          }
          onSelect={(path) => update(browser.field, path)}
        />
      </DialogContent>
    </Dialog>
  );
}
