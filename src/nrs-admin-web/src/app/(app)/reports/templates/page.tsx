'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { reportTemplateApi } from '@/lib/api';
import { ReportTemplateInfo } from '@/lib/types';
import {
  FileText,
  Plus,
  Search,
  Pencil,
  Trash2,
  Copy,
  ArrowUpDown,
  Loader2,
  AlertCircle,
  MoreHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ReportTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<ReportTemplateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [newName, setNewName] = useState('');
  const [duplicateSource, setDuplicateSource] = useState<ReportTemplateInfo | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [deletingTemplate, setDeletingTemplate] = useState<ReportTemplateInfo | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await reportTemplateApi.list();
    if (res.success && res.data) {
      setTemplates(res.data);
    } else {
      toast.error(res.message || 'Failed to load templates');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = useMemo<ColumnDef<ReportTemplateInfo>[]>(() => [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
          Name <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <button
          className="font-medium text-primary hover:underline text-left"
          onClick={() => router.push(`/reports/templates/${encodeURIComponent(row.original.name)}`)}
        >
          {row.original.name}
        </button>
      ),
    },
    {
      accessorKey: 'sizeBytes',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
          Size <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatFileSize(row.original.sizeBytes)}</span>
      ),
    },
    {
      accessorKey: 'lastModifiedUtc',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
          Last Modified <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.lastModifiedUtc).toLocaleString()}
        </span>
      ),
    },
    {
      id: 'facilities',
      header: 'Used By',
      cell: ({ row }) => {
        const facilities = row.original.usedByFacilities;
        if (facilities.length === 0) {
          return <span className="text-xs text-muted-foreground">None</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {facilities.map((f) => (
              <Badge key={f} variant="secondary" className="text-xs">
                {f}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/reports/templates/${encodeURIComponent(row.original.name)}`)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openDuplicate(row.original)}>
              <Copy className="mr-2 h-4 w-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => { setDeletingTemplate(row.original); setDeleteOpen(true); }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [router]);

  const table = useReactTable({
    data: templates,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function openDuplicate(template: ReportTemplateInfo) {
    setDuplicateSource(template);
    const baseName = template.name.replace(/\.htm$/i, '');
    setDuplicateName(`${baseName} - Copy.htm`);
    setDuplicateOpen(true);
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    const finalName = name.endsWith('.htm') ? name : `${name}.htm`;

    setSaving(true);
    try {
      const blankHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Report Template</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 10pt; margin: 0; padding: 20px; }
  </style>
</head>
<body>
<!--HeaderStart-->
<div style="text-align: center;">
  <!--SiteImage-->
  <h2><!--Facility--></h2>
</div>
<!--HeaderEnd-->

<table width="100%">
  <tr>
    <td><strong>Patient:</strong> <!--PatientName--></td>
    <td><strong>MRN:</strong> <!--PatientID--></td>
    <td><strong>DOB:</strong> <!--DOB--></td>
  </tr>
  <tr>
    <td><strong>Exam:</strong> <!--ProcedureName--></td>
    <td><strong>Date:</strong> <!--ProcedureDate--></td>
    <td><strong>Accession:</strong> <!--Accession--></td>
  </tr>
  <tr>
    <td colspan="3"><strong>Referring:</strong> <!--ReferringPhysician--></td>
  </tr>
</table>

<hr />

<!--ReportText-->

<br /><br />
<strong><!--SigningPhysicianName--></strong><br />
<!--SigningPhysicianSignatureImage--><br />
Signed: <!--DateSigned-->

<!--FooterStart-->
<div style="font-size: 8pt; text-align: center; color: #666;">
  <!--FooterProcedureName--> | <!--FooterProcedureDate-->
</div>
<!--FooterEnd-->
</body>
</html>`;

      const res = await reportTemplateApi.create({ name: finalName, content: blankHtml });
      if (res.success) {
        toast.success(`Template '${finalName}' created`);
        setCreateOpen(false);
        setNewName('');
        await loadData();
      } else {
        toast.error(res.message || 'Failed to create template');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDuplicate() {
    if (!duplicateSource) return;
    const name = duplicateName.trim();
    if (!name) return;
    const finalName = name.endsWith('.htm') ? name : `${name}.htm`;

    setSaving(true);
    try {
      const res = await reportTemplateApi.duplicate(duplicateSource.name, { newName: finalName });
      if (res.success) {
        toast.success(`Template duplicated as '${finalName}'`);
        setDuplicateOpen(false);
        await loadData();
      } else {
        toast.error(res.message || 'Failed to duplicate template');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingTemplate) return;
    setSaving(true);
    try {
      const res = await reportTemplateApi.delete(deletingTemplate.name);
      if (res.success) {
        toast.success(`Template '${deletingTemplate.name}' deleted`);
        setDeleteOpen(false);
        setDeletingTemplate(null);
        await loadData();
      } else {
        toast.error(res.message || 'Failed to delete template');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Templates"
        description="Manage Novarad .htm report templates for printing and emailing"
        icon={FileText}
        actions={
          <Button onClick={() => { setNewName(''); setCreateOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> New Template
          </Button>
        }
      />

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} template{table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No report templates found</p>
            <Button variant="outline" size="sm" onClick={() => { setNewName(''); setCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Create your first template
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center text-muted-foreground h-24">
                    No results match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Report Template</DialogTitle>
            <DialogDescription>
              Create a new report template with a starter layout.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                placeholder="e.g., Standard Report.htm"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <p className="text-xs text-muted-foreground">
                Must end with .htm — it will be added automatically if omitted.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !newName.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicate Template</DialogTitle>
            <DialogDescription>
              Create a copy of <strong>{duplicateSource?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dupName">New Template Name</Label>
              <Input
                id="dupName"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDuplicate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateOpen(false)}>Cancel</Button>
            <Button onClick={handleDuplicate} disabled={saving || !duplicateName.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingTemplate?.name}</strong>?
              {deletingTemplate && deletingTemplate.usedByFacilities.length > 0 && (
                <span className="block mt-2 text-destructive">
                  Warning: This template is in use by {deletingTemplate.usedByFacilities.join(', ')}.
                </span>
              )}
              A backup will be created automatically.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
