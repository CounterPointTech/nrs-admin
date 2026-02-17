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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { modalityApi, modalityTypeApi, facilityApi } from '@/lib/api';
import { Modality, ModalityType, Facility, CreateModalityRequest, UpdateModalityRequest } from '@/lib/types';
import {
  Monitor,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowUpDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ModalitiesPage() {
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [modalityTypes, setModalityTypes] = useState<ModalityType[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  // Dialog state
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingModality, setEditingModality] = useState<Modality | null>(null);
  const [deletingModality, setDeletingModality] = useState<Modality | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateModalityRequest & { status?: string; isRetired?: boolean }>({
    name: '',
    room: '',
    modalityTypeId: '',
    aeTitle: '',
    supportsWorklist: true,
    supportsMpps: false,
    facilityId: 0,
    status: 'Active',
    isRetired: false,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [modRes, typesRes, facRes] = await Promise.all([
      modalityApi.getAll(),
      modalityTypeApi.getAll(),
      facilityApi.getAll(),
    ]);

    if (modRes.success && modRes.data) setModalities(modRes.data);
    if (typesRes.success && typesRes.data) setModalityTypes(typesRes.data);
    if (facRes.success && facRes.data) setFacilities(facRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = useMemo<ColumnDef<Modality>[]>(() => [
    {
      accessorKey: 'modalityId',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
          ID <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.modalityId}</span>,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
          Name <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'modalityTypeId',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {row.original.modalityTypeId}
        </Badge>
      ),
    },
    {
      accessorKey: 'aeTitle',
      header: 'AE Title',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.aeTitle || '—'}</span>
      ),
    },
    {
      accessorKey: 'room',
      header: 'Room',
      cell: ({ row }) => row.original.room || '—',
    },
    {
      accessorKey: 'facilityName',
      header: 'Facility',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const mod = row.original;
        if (mod.isRetired) return <Badge variant="secondary">Retired</Badge>;
        return (
          <Badge variant={mod.status === 'Active' ? 'default' : 'secondary'}>
            {mod.status || 'Active'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'supportsWorklist',
      header: 'WL',
      cell: ({ row }) => (
        <span className={row.original.supportsWorklist ? 'text-emerald-500' : 'text-muted-foreground'}>
          {row.original.supportsWorklist ? 'Yes' : 'No'}
        </span>
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
            onClick={() => { setDeletingModality(row.original); setDeleteOpen(true); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ], []);

  const table = useReactTable({
    data: modalities,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function openEditor(modality?: Modality) {
    if (modality) {
      setEditingModality(modality);
      setFormData({
        name: modality.name,
        room: modality.room || '',
        modalityTypeId: modality.modalityTypeId,
        aeTitle: modality.aeTitle || '',
        supportsWorklist: modality.supportsWorklist,
        supportsMpps: modality.supportsMpps,
        facilityId: modality.facilityId || 0,
        status: modality.status || 'Active',
        isRetired: modality.isRetired,
      });
    } else {
      setEditingModality(null);
      setFormData({
        name: '',
        room: '',
        modalityTypeId: modalityTypes[0]?.modalityTypeId || '',
        aeTitle: '',
        supportsWorklist: true,
        supportsMpps: false,
        facilityId: facilities[0]?.facilityId || 0,
        status: 'Active',
        isRetired: false,
      });
    }
    setEditorOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingModality) {
        const req: UpdateModalityRequest = {
          name: formData.name,
          room: formData.room || undefined,
          modalityTypeId: formData.modalityTypeId,
          aeTitle: formData.aeTitle || undefined,
          supportsWorklist: formData.supportsWorklist,
          supportsMpps: formData.supportsMpps,
          facilityId: formData.facilityId,
          status: formData.status,
          isRetired: formData.isRetired || false,
        };
        const res = await modalityApi.update(editingModality.modalityId, req);
        if (res.success) {
          toast.success('Modality updated');
          setEditorOpen(false);
          await loadData();
        } else {
          toast.error(res.message || 'Failed to update modality');
        }
      } else {
        const res = await modalityApi.create(formData);
        if (res.success) {
          toast.success('Modality created');
          setEditorOpen(false);
          await loadData();
        } else {
          toast.error(res.message || 'Failed to create modality');
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingModality) return;
    setSaving(true);
    try {
      const res = await modalityApi.delete(deletingModality.modalityId);
      if (res.success) {
        toast.success('Modality deleted');
        setDeleteOpen(false);
        setDeletingModality(null);
        await loadData();
      } else {
        toast.error(res.message || 'Failed to delete modality');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modalities"
        description="Manage RIS modality configurations"
        icon={Monitor}
        actions={
          <Button onClick={() => openEditor()} className="gap-2">
            <Plus className="h-4 w-4" /> Add Modality
          </Button>
        }
      />

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search modalities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} modalities
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : modalities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No modalities found</p>
            <Button variant="outline" size="sm" onClick={() => openEditor()}>
              <Plus className="h-4 w-4 mr-1" /> Add your first modality
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingModality ? 'Edit Modality' : 'Add Modality'}</DialogTitle>
            <DialogDescription>
              {editingModality ? `Editing modality ${editingModality.name}` : 'Create a new modality configuration'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room">Room</Label>
                <Input id="room" value={formData.room || ''}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modality Type *</Label>
                <Select value={formData.modalityTypeId}
                  onValueChange={(v) => setFormData({ ...formData, modalityTypeId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {modalityTypes.map((t) => (
                      <SelectItem key={t.modalityTypeId} value={t.modalityTypeId}>
                        {t.modalityTypeId}{t.description ? ` — ${t.description}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="aeTitle">AE Title</Label>
                <Input id="aeTitle" value={formData.aeTitle || ''} maxLength={16}
                  className="font-mono" placeholder="Max 16 chars"
                  onChange={(e) => setFormData({ ...formData, aeTitle: e.target.value.toUpperCase() })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Facility *</Label>
              <Select value={String(formData.facilityId)}
                onValueChange={(v) => setFormData({ ...formData, facilityId: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="Select facility" /></SelectTrigger>
                <SelectContent>
                  {facilities.map((f) => (
                    <SelectItem key={f.facilityId} value={String(f.facilityId)}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={formData.supportsWorklist}
                  onCheckedChange={(c) => setFormData({ ...formData, supportsWorklist: !!c })} />
                <span className="text-sm">Supports Worklist</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={formData.supportsMpps}
                  onCheckedChange={(c) => setFormData({ ...formData, supportsMpps: !!c })} />
                <span className="text-sm">Supports MPPS</span>
              </label>
              {editingModality && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={formData.isRetired}
                    onCheckedChange={(c) => setFormData({ ...formData, isRetired: !!c })} />
                  <span className="text-sm">Retired</span>
                </label>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formData.name || !formData.modalityTypeId || !formData.facilityId}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingModality ? 'Save Changes' : 'Create Modality'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Modality</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingModality?.name}</strong>?
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
