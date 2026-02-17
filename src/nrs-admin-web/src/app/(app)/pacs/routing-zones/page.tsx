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
import { routingZoneApi } from '@/lib/api';
import { RoutingZone, CreateRoutingZoneRequest } from '@/lib/types';
import {
  Waypoints,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowUpDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function RoutingZonesPage() {
  const [zones, setZones] = useState<RoutingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  // Dialog state
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<RoutingZone | null>(null);
  const [deletingZone, setDeletingZone] = useState<RoutingZone | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateRoutingZoneRequest>({
    zoneName: '',
    isDefault: false,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await routingZoneApi.getAll();
    if (res.success && res.data) setZones(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = useMemo<ColumnDef<RoutingZone>[]>(() => [
    {
      accessorKey: 'id',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
          ID <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.id}</span>,
    },
    {
      accessorKey: 'zoneName',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
          Zone Name <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.zoneName}</span>,
    },
    {
      accessorKey: 'isDefault',
      header: 'Default',
      cell: ({ row }) => (
        row.original.isDefault
          ? <Badge variant="default">Default</Badge>
          : <span className="text-muted-foreground">—</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => openEditor(row.original)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => { setDeletingZone(row.original); setDeleteOpen(true); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ], []);

  const table = useReactTable({
    data: zones,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function openEditor(zone?: RoutingZone) {
    if (zone) {
      setEditingZone(zone);
      setFormData({
        zoneName: zone.zoneName,
        isDefault: zone.isDefault,
      });
    } else {
      setEditingZone(null);
      setFormData({
        zoneName: '',
        isDefault: false,
      });
    }
    setEditorOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingZone) {
        const res = await routingZoneApi.update(editingZone.id, formData);
        if (res.success) {
          toast.success('Routing zone updated');
          setEditorOpen(false);
          await loadData();
        } else {
          toast.error(res.message || 'Failed to update routing zone');
        }
      } else {
        const res = await routingZoneApi.create(formData);
        if (res.success) {
          toast.success('Routing zone created');
          setEditorOpen(false);
          await loadData();
        } else {
          toast.error(res.message || 'Failed to create routing zone');
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingZone) return;
    setSaving(true);
    try {
      const res = await routingZoneApi.delete(deletingZone.id);
      if (res.success) {
        toast.success('Routing zone deleted');
        setDeleteOpen(false);
        setDeletingZone(null);
        await loadData();
      } else {
        toast.error(res.message || 'Failed to delete routing zone');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Routing Zones"
        description="Manage PACS destination routing zones"
        icon={Waypoints}
        actions={
          <Button onClick={() => openEditor()} className="gap-2">
            <Plus className="h-4 w-4" /> Add Zone
          </Button>
        }
      />

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search zones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} zones
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : zones.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No routing zones configured</p>
            <Button variant="outline" size="sm" onClick={() => openEditor()}>
              <Plus className="h-4 w-4 mr-1" /> Add your first zone
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
            <DialogTitle>{editingZone ? 'Edit Routing Zone' : 'Add Routing Zone'}</DialogTitle>
            <DialogDescription>
              {editingZone ? `Editing zone ${editingZone.zoneName}` : 'Create a new routing zone'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="zoneName">Zone Name *</Label>
              <Input id="zoneName" value={formData.zoneName}
                onChange={(e) => setFormData({ ...formData, zoneName: e.target.value })} />
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={formData.isDefault}
                  onCheckedChange={(c) => setFormData({ ...formData, isDefault: !!c })} />
                <span className="text-sm">Set as default zone</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formData.zoneName}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingZone ? 'Save Changes' : 'Create Zone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Routing Zone</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingZone?.zoneName}</strong>?
              This action cannot be undone.
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
