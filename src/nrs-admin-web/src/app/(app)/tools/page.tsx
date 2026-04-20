'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ToolCard } from '@/components/tools/tool-card';
import { ToolEditor } from '@/components/tools/tool-editor';
import { externalToolsApi } from '@/lib/api';
import { ExternalTool, CreateExternalToolRequest } from '@/lib/types';
import { Wrench, Plus, Search, Rocket, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ExternalToolsPage() {
  const [tools, setTools] = useState<ExternalTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<ExternalTool | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExternalTool | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem('external-tools-collapsed-categories');
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      if (typeof window !== 'undefined') {
        localStorage.setItem('external-tools-collapsed-categories', JSON.stringify([...next]));
      }
      return next;
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await externalToolsApi.list();
      if (res.success && res.data) {
        setTools(res.data);
      } else {
        toast.error(res.message ?? 'Failed to load tools.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load tools.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.target.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
    );
  }, [tools, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, ExternalTool[]>();
    for (const t of filtered) {
      const key = t.category?.trim() || 'Uncategorized';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });
  }, [filtered]);

  const existingCategories = useMemo(
    () =>
      Array.from(
        new Set(tools.map((t) => t.category?.trim()).filter((c): c is string => !!c))
      ).sort(),
    [tools]
  );

  const hasAnyNonUrl = tools.some((t) => t.type !== 'Url');

  const handleLaunch = async (tool: ExternalTool) => {
    if (tool.type === 'Url') {
      window.open(tool.target, '_blank', 'noopener,noreferrer');
      return;
    }

    // First-run warning for host-side launches
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('external-tools-launch-warned');
      if (!dismissed) {
        const ok = confirm(
          'Desktop, command, and file launches execute on the machine running the NRS Admin API — not on your local browser machine.\n\nContinue?'
        );
        if (!ok) return;
        localStorage.setItem('external-tools-launch-warned', '1');
      }
    }

    setLaunchingId(tool.id);
    try {
      const res = await externalToolsApi.launch(tool.id);
      if (res.success) {
        toast.success(res.message ?? `Launched '${tool.name}'.`);
      } else {
        toast.error(res.message ?? 'Failed to launch tool.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to launch tool.');
    } finally {
      setLaunchingId(null);
    }
  };

  const handleSave = async (data: CreateExternalToolRequest, id?: string) => {
    const res = id
      ? await externalToolsApi.update(id, data)
      : await externalToolsApi.create(data);

    if (!res.success) {
      throw new Error(res.message ?? 'Save failed.');
    }

    toast.success(id ? 'Tool updated.' : 'Tool created.');
    await load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await externalToolsApi.delete(deleteTarget.id);
      if (res.success) {
        toast.success(`Deleted '${deleteTarget.name}'.`);
        setTools((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      } else {
        toast.error(res.message ?? 'Failed to delete.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete.');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="External Tools"
        description="Your personal launchpad for desktop apps, web tools, and scripts."
        icon={Wrench}
        actions={
          <Button
            onClick={() => {
              setEditingTool(null);
              setEditorOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Tool
          </Button>
        }
      />

      {hasAnyNonUrl && (
        <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
          <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            Desktop, command, and file launches execute on the machine running the NRS Admin API.
            Web URLs always open in your browser.
          </span>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tools..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : tools.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
            <Wrench className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Your launchpad is empty</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Add your favorite web tools, desktop apps, scripts, and file shortcuts for one-click access.
          </p>
          <Button
            className="mt-4 gap-2"
            onClick={() => {
              setEditingTool(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add your first tool
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No tools match &ldquo;{query}&rdquo;.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([category, items]) => {
            const multipleCategories = grouped.length > 1;
            const collapsed = multipleCategories && collapsedCategories.has(category);
            return (
              <section key={category} className="space-y-3">
                {multipleCategories && (
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="group flex w-full items-center gap-2 text-left"
                  >
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-muted-foreground transition-transform duration-200',
                        collapsed && '-rotate-90'
                      )}
                    />
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground group-hover:text-foreground">
                      {category}
                    </h2>
                    <span className="text-xs text-muted-foreground/60">({items.length})</span>
                  </button>
                )}
                {!collapsed && (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {items.map((tool) => (
                      <ToolCard
                        key={tool.id}
                        tool={tool}
                        launching={launchingId === tool.id}
                        onLaunch={handleLaunch}
                        onEdit={(t) => {
                          setEditingTool(t);
                          setEditorOpen(true);
                        }}
                        onDelete={(t) => setDeleteTarget(t)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <ToolEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        tool={editingTool}
        existingCategories={existingCategories}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tool?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{deleteTarget?.name}</strong> from your launchpad? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
