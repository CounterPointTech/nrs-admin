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
import { hl7LocationApi } from '@/lib/api';
import { Hl7Location, Hl7LocationOption, CreateHl7LocationRequest } from '@/lib/types';
import {
  MapPin,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowUpDown,
  Loader2,
  AlertCircle,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Hl7LocationsPage() {
  const [locations, setLocations] = useState<Hl7Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  // Editor dialog
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Hl7Location | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateHl7LocationRequest>({
    address: '',
    port: undefined,
    enabled: true,
    cultureCode: '',
  });

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState<Hl7Location | null>(null);

  // Options dialog
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [optionsLocation, setOptionsLocation] = useState<Hl7Location | null>(null);
  const [options, setOptions] = useState<Hl7LocationOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await hl7LocationApi.getAll();
    if (res.success && res.data) setLocations(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = useMemo<ColumnDef<Hl7Location>[]>(() => [
    {
      accessorKey: 'locationId',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
          ID <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.locationId}</span>,
    },
    {
      accessorKey: 'address',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
          Address <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.address}</span>,
    },
    {
      accessorKey: 'port',
      header: 'Port',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.port ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'enabled',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.enabled ? 'default' : 'secondary'}>
          {row.original.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      ),
    },
    {
      accessorKey: 'cultureCode',
      header: 'Culture',
      cell: ({ row }) => row.original.cultureCode || '—',
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => openOptions(row.original)}>
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => openEditor(row.original)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => { setDeletingLocation(row.original); setDeleteOpen(true); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ], []);

  const table = useReactTable({
    data: locations,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function openEditor(location?: Hl7Location) {
    if (location) {
      setEditingLocation(location);
      setFormData({
        address: location.address,
        port: location.port,
        enabled: location.enabled,
        cultureCode: location.cultureCode || '',
      });
    } else {
      setEditingLocation(null);
      setFormData({ address: '', port: undefined, enabled: true, cultureCode: '' });
    }
    setEditorOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingLocation) {
        const res = await hl7LocationApi.update(editingLocation.locationId, formData);
        if (res.success) {
          toast.success('Location updated');
          setEditorOpen(false);
          await loadData();
        } else {
          toast.error(res.message || 'Failed to update location');
        }
      } else {
        const res = await hl7LocationApi.create(formData);
        if (res.success) {
          toast.success('Location created');
          setEditorOpen(false);
          await loadData();
        } else {
          toast.error(res.message || 'Failed to create location');
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingLocation) return;
    setSaving(true);
    try {
      const res = await hl7LocationApi.delete(deletingLocation.locationId);
      if (res.success) {
        toast.success('Location deleted');
        setDeleteOpen(false);
        setDeletingLocation(null);
        await loadData();
      } else {
        toast.error(res.message || 'Failed to delete location');
      }
    } finally {
      setSaving(false);
    }
  }

  async function openOptions(location: Hl7Location) {
    setOptionsLocation(location);
    setOptionsOpen(true);
    setOptionsLoading(true);
    const res = await hl7LocationApi.getOptions(location.locationId);
    if (res.success && res.data) setOptions(res.data);
    setOptionsLoading(false);
  }

  async function handleAddOption() {
    if (!optionsLocation || !newOptionName) return;
    const res = await hl7LocationApi.upsertOption(optionsLocation.locationId, {
      name: newOptionName,
      value: newOptionValue || undefined,
    });
    if (res.success) {
      toast.success('Option saved');
      setNewOptionName('');
      setNewOptionValue('');
      const refreshRes = await hl7LocationApi.getOptions(optionsLocation.locationId);
      if (refreshRes.success && refreshRes.data) setOptions(refreshRes.data);
    } else {
      toast.error(res.message || 'Failed to save option');
    }
  }

  async function handleDeleteOption(name: string) {
    if (!optionsLocation) return;
    const res = await hl7LocationApi.deleteOption(optionsLocation.locationId, name);
    if (res.success) {
      toast.success('Option deleted');
      const refreshRes = await hl7LocationApi.getOptions(optionsLocation.locationId);
      if (refreshRes.success && refreshRes.data) setOptions(refreshRes.data);
    } else {
      toast.error(res.message || 'Failed to delete option');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="HL7 Locations"
        description="Manage HL7 listener locations and their options"
        icon={MapPin}
        actions={
          <Button onClick={() => openEditor()} className="gap-2">
            <Plus className="h-4 w-4" /> Add Location
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} locations
        </span>
      </div>

      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No HL7 locations found</p>
            <Button variant="outline" size="sm" onClick={() => openEditor()}>
              <Plus className="h-4 w-4 mr-1" /> Add your first location
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
            <DialogTitle>{editingLocation ? 'Edit Location' : 'Add Location'}</DialogTitle>
            <DialogDescription>
              {editingLocation ? `Editing location ${editingLocation.address}` : 'Create a new HL7 listener location'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input id="address" value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input id="port" type="number" min={1} max={65535}
                  value={formData.port ?? ''}
                  onChange={(e) => setFormData({ ...formData, port: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cultureCode">Culture Code</Label>
                <Input id="cultureCode" value={formData.cultureCode || ''} placeholder="e.g. en-US"
                  onChange={(e) => setFormData({ ...formData, cultureCode: e.target.value || undefined })} />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={formData.enabled}
                onCheckedChange={(c) => setFormData({ ...formData, enabled: !!c })} />
              <span className="text-sm">Enabled</span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formData.address}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingLocation ? 'Save Changes' : 'Create Location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingLocation?.address}</strong>?
              This will also remove associated options.
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

      {/* Options Dialog */}
      <Dialog open={optionsOpen} onOpenChange={setOptionsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Location Options</DialogTitle>
            <DialogDescription>
              Options for {optionsLocation?.address} (ID: {optionsLocation?.locationId})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {optionsLoading ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : options.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No options configured</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {options.map((opt) => (
                      <TableRow key={opt.name}>
                        <TableCell className="font-mono text-xs">{opt.name}</TableCell>
                        <TableCell className="text-sm">{opt.value || '—'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteOption(opt.name)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Name</Label>
                <Input value={newOptionName} onChange={(e) => setNewOptionName(e.target.value)}
                  placeholder="Option name" className="h-8 text-sm" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Value</Label>
                <Input value={newOptionValue} onChange={(e) => setNewOptionValue(e.target.value)}
                  placeholder="Option value" className="h-8 text-sm" />
              </div>
              <Button size="sm" onClick={handleAddOption} disabled={!newOptionName} className="h-8">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
