'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { hl7ForwardingApi } from '@/lib/api';
import { Hl7MessageForwarding, CreateHl7ForwardingRequest } from '@/lib/types';
import {
  Forward,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowUpDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Hl7ForwardingPage() {
  const [rules, setRules] = useState<Hl7MessageForwarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  // Editor dialog
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Hl7MessageForwarding | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateHl7ForwardingRequest>({
    address: '',
    port: 0,
    message: '',
    event: '',
    externalKey: '',
    sendPostProcessing: true,
  });

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingRule, setDeletingRule] = useState<Hl7MessageForwarding | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await hl7ForwardingApi.getAll();
    if (res.success && res.data) setRules(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = useMemo<ColumnDef<Hl7MessageForwarding>[]>(() => [
    {
      accessorKey: 'forwardingId',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
          ID <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.forwardingId}</span>,
    },
    {
      accessorKey: 'address',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
          Address <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.address}:{row.original.port}</span>
      ),
    },
    {
      accessorKey: 'message',
      header: 'Message',
      cell: ({ row }) => {
        const r = row.original;
        if (!r.message) return <span className="text-muted-foreground italic">All</span>;
        return (
          <Badge variant="outline" className="font-mono">
            {r.message}{r.event ? `^${r.event}` : ''}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'externalKey',
      header: 'External Key',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.externalKey || '—'}</span>
      ),
    },
    {
      accessorKey: 'sendPostProcessing',
      header: 'Post-Processing',
      cell: ({ row }) => (
        <Badge variant={row.original.sendPostProcessing ? 'default' : 'secondary'}>
          {row.original.sendPostProcessing ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditor(row.original)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => { setDeletingRule(row.original); setDeleteOpen(true); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ], []);

  const table = useReactTable({
    data: rules,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function openEditor(rule?: Hl7MessageForwarding) {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        address: rule.address,
        port: rule.port,
        message: rule.message || '',
        event: rule.event || '',
        externalKey: rule.externalKey || '',
        sendPostProcessing: rule.sendPostProcessing,
      });
    } else {
      setEditingRule(null);
      setFormData({
        address: '',
        port: 0,
        message: '',
        event: '',
        externalKey: '',
        sendPostProcessing: true,
      });
    }
    setEditorOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        message: formData.message || undefined,
        event: formData.event || undefined,
        externalKey: formData.externalKey || undefined,
      };
      if (editingRule) {
        const res = await hl7ForwardingApi.update(editingRule.forwardingId, payload);
        if (res.success) {
          toast.success('Forwarding rule updated');
          setEditorOpen(false);
          await loadData();
        } else {
          toast.error(res.message || 'Failed to update rule');
        }
      } else {
        const res = await hl7ForwardingApi.create(payload);
        if (res.success) {
          toast.success('Forwarding rule created');
          setEditorOpen(false);
          await loadData();
        } else {
          toast.error(res.message || 'Failed to create rule');
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingRule) return;
    setSaving(true);
    try {
      const res = await hl7ForwardingApi.delete(deletingRule.forwardingId);
      if (res.success) {
        toast.success('Forwarding rule deleted');
        setDeleteOpen(false);
        setDeletingRule(null);
        await loadData();
      } else {
        toast.error(res.message || 'Failed to delete rule');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="HL7 Forwarding"
        description="Manage HL7 message forwarding rules"
        icon={Forward}
        actions={
          <Button onClick={() => openEditor()} className="gap-2">
            <Plus className="h-4 w-4" /> Add Rule
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search forwarding rules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} rules
        </span>
      </div>

      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No forwarding rules found</p>
            <Button variant="outline" size="sm" onClick={() => openEditor()}>
              <Plus className="h-4 w-4 mr-1" /> Add your first rule
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

      {/* Create/Edit Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Forwarding Rule' : 'Add Forwarding Rule'}</DialogTitle>
            <DialogDescription>
              {editingRule
                ? `Editing rule for ${editingRule.address}:${editingRule.port}`
                : 'Create a new HL7 message forwarding rule'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="fwd-address">Address *</Label>
                <Input id="fwd-address" value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fwd-port">Port *</Label>
                <Input id="fwd-port" type="number" min={1} max={65535} value={formData.port || ''}
                  onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Message Filter</Label>
                <Input value={formData.message || ''} placeholder="e.g. ADT (blank = all)"
                  onChange={(e) => setFormData({ ...formData, message: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-2">
                <Label>Event Filter</Label>
                <Input value={formData.event || ''} placeholder="e.g. A01 (blank = all)"
                  onChange={(e) => setFormData({ ...formData, event: e.target.value.toUpperCase() })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>External Key</Label>
              <Input value={formData.externalKey || ''}
                onChange={(e) => setFormData({ ...formData, externalKey: e.target.value })} />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={formData.sendPostProcessing}
                onCheckedChange={(c) => setFormData({ ...formData, sendPostProcessing: !!c })} />
              <span className="text-sm">Send Post-Processing</span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formData.address || !formData.port}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingRule ? 'Save Changes' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Forwarding Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the forwarding rule for <strong>{deletingRule?.address}:{deletingRule?.port}</strong>?
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
