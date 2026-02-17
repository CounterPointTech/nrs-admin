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
import { hl7FieldMappingApi } from '@/lib/api';
import { Hl7FieldMapping, CreateHl7FieldMappingRequest } from '@/lib/types';
import {
  GitBranch,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowUpDown,
  Loader2,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

const ALL_VALUE = '__all__';

export default function Hl7FieldMappingPage() {
  const [mappings, setMappings] = useState<Hl7FieldMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  // Filters
  const [messageTypes, setMessageTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<(string | null)[]>([]);
  const [filterMsgType, setFilterMsgType] = useState<string>(ALL_VALUE);
  const [filterLocation, setFilterLocation] = useState<string>(ALL_VALUE);

  // Editor dialog
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<Hl7FieldMapping | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateHl7FieldMappingRequest>({
    messageType: '',
    eventType: '',
    parameterName: '',
    segmentName: '',
    field: undefined,
    component: undefined,
    subComponent: undefined,
    locationId: '',
    inboundTransform: '',
    outboundTransform: '',
    inboundTransformParameter: '',
    outboundTransformParameter: '',
  });

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingMapping, setDeletingMapping] = useState<Hl7FieldMapping | null>(null);

  const loadFilters = useCallback(async () => {
    const [mtRes, locRes] = await Promise.all([
      hl7FieldMappingApi.getMessageTypes(),
      hl7FieldMappingApi.getLocations(),
    ]);
    if (mtRes.success && mtRes.data) setMessageTypes(mtRes.data);
    if (locRes.success && locRes.data) setLocations(locRes.data);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const msgType = filterMsgType !== ALL_VALUE ? filterMsgType : undefined;
    const locId = filterLocation !== ALL_VALUE ? filterLocation : undefined;
    const res = await hl7FieldMappingApi.getAll(msgType, locId);
    if (res.success && res.data) setMappings(res.data);
    setLoading(false);
  }, [filterMsgType, filterLocation]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = useMemo<ColumnDef<Hl7FieldMapping>[]>(() => [
    {
      accessorKey: 'mappingId',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
          ID <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.mappingId}</span>,
    },
    {
      accessorKey: 'messageType',
      header: 'Msg Type',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {row.original.messageType}
          {row.original.eventType ? `^${row.original.eventType}` : ''}
        </Badge>
      ),
    },
    {
      accessorKey: 'parameterName',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
          Parameter <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.parameterName}</span>,
    },
    {
      accessorKey: 'segmentName',
      header: 'Segment',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.segmentName}</span>,
    },
    {
      id: 'position',
      header: 'Position',
      cell: ({ row }) => {
        const m = row.original;
        const parts = [m.field, m.component, m.subComponent].filter(v => v != null);
        return <span className="font-mono text-xs">{parts.join('.') || '—'}</span>;
      },
    },
    {
      accessorKey: 'locationId',
      header: 'Location',
      cell: ({ row }) => row.original.locationId || <span className="text-muted-foreground italic">Global</span>,
    },
    {
      id: 'transforms',
      header: 'Transforms',
      cell: ({ row }) => {
        const m = row.original;
        const has = m.inboundTransform || m.outboundTransform;
        if (!has) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex gap-1">
            {m.inboundTransform && <Badge variant="secondary" className="text-[10px]">In: {m.inboundTransform}</Badge>}
            {m.outboundTransform && <Badge variant="secondary" className="text-[10px]">Out: {m.outboundTransform}</Badge>}
          </div>
        );
      },
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
            onClick={() => { setDeletingMapping(row.original); setDeleteOpen(true); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ], []);

  const table = useReactTable({
    data: mappings,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function openEditor(mapping?: Hl7FieldMapping) {
    if (mapping) {
      setEditingMapping(mapping);
      setFormData({
        messageType: mapping.messageType,
        eventType: mapping.eventType || '',
        parameterName: mapping.parameterName,
        segmentName: mapping.segmentName,
        field: mapping.field ?? undefined,
        component: mapping.component ?? undefined,
        subComponent: mapping.subComponent ?? undefined,
        locationId: mapping.locationId || '',
        inboundTransform: mapping.inboundTransform || '',
        outboundTransform: mapping.outboundTransform || '',
        inboundTransformParameter: mapping.inboundTransformParameter || '',
        outboundTransformParameter: mapping.outboundTransformParameter || '',
      });
    } else {
      setEditingMapping(null);
      setFormData({
        messageType: filterMsgType !== ALL_VALUE ? filterMsgType : '',
        eventType: '',
        parameterName: '',
        segmentName: '',
        field: undefined,
        component: undefined,
        subComponent: undefined,
        locationId: filterLocation !== ALL_VALUE ? filterLocation : '',
        inboundTransform: '',
        outboundTransform: '',
        inboundTransformParameter: '',
        outboundTransformParameter: '',
      });
    }
    setEditorOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        eventType: formData.eventType || undefined,
        locationId: formData.locationId || undefined,
        inboundTransform: formData.inboundTransform || undefined,
        outboundTransform: formData.outboundTransform || undefined,
        inboundTransformParameter: formData.inboundTransformParameter || undefined,
        outboundTransformParameter: formData.outboundTransformParameter || undefined,
      };
      if (editingMapping) {
        const res = await hl7FieldMappingApi.update(editingMapping.mappingId, payload);
        if (res.success) {
          toast.success('Mapping updated');
          setEditorOpen(false);
          await loadData();
          await loadFilters();
        } else {
          toast.error(res.message || 'Failed to update mapping');
        }
      } else {
        const res = await hl7FieldMappingApi.create(payload);
        if (res.success) {
          toast.success('Mapping created');
          setEditorOpen(false);
          await loadData();
          await loadFilters();
        } else {
          toast.error(res.message || 'Failed to create mapping');
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingMapping) return;
    setSaving(true);
    try {
      const res = await hl7FieldMappingApi.delete(deletingMapping.mappingId);
      if (res.success) {
        toast.success('Mapping deleted');
        setDeleteOpen(false);
        setDeletingMapping(null);
        await loadData();
      } else {
        toast.error(res.message || 'Failed to delete mapping');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="HL7 Field Mapping"
        description="Configure HL7 message segment field mappings and transforms"
        icon={GitBranch}
        actions={
          <Button onClick={() => openEditor()} className="gap-2">
            <Plus className="h-4 w-4" /> Add Mapping
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterMsgType} onValueChange={setFilterMsgType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Message Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All Types</SelectItem>
              {messageTypes.map((mt) => (
                <SelectItem key={mt} value={mt}>{mt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterLocation} onValueChange={setFilterLocation}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All Locations</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc ?? '__null__'} value={loc ?? ''}>{loc || '(Global)'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search mappings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} mappings
        </span>
      </div>

      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : mappings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No field mappings found</p>
            <Button variant="outline" size="sm" onClick={() => openEditor()}>
              <Plus className="h-4 w-4 mr-1" /> Add your first mapping
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingMapping ? 'Edit Field Mapping' : 'Add Field Mapping'}</DialogTitle>
            <DialogDescription>
              {editingMapping
                ? `Editing mapping ${editingMapping.parameterName} (${editingMapping.messageType})`
                : 'Create a new HL7 field mapping'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Message Type *</Label>
                <Input value={formData.messageType} placeholder="ADT"
                  onChange={(e) => setFormData({ ...formData, messageType: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Input value={formData.eventType || ''} placeholder="A01"
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={formData.locationId || ''} placeholder="(Global)"
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Parameter Name *</Label>
                <Input value={formData.parameterName}
                  onChange={(e) => setFormData({ ...formData, parameterName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Segment Name *</Label>
                <Input value={formData.segmentName} placeholder="PID, OBR, MSH..."
                  onChange={(e) => setFormData({ ...formData, segmentName: e.target.value.toUpperCase() })} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Field</Label>
                <Input type="number" min={0} value={formData.field ?? ''}
                  onChange={(e) => setFormData({ ...formData, field: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
              <div className="space-y-2">
                <Label>Component</Label>
                <Input type="number" min={0} value={formData.component ?? ''}
                  onChange={(e) => setFormData({ ...formData, component: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
              <div className="space-y-2">
                <Label>Sub-Component</Label>
                <Input type="number" min={0} value={formData.subComponent ?? ''}
                  onChange={(e) => setFormData({ ...formData, subComponent: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inbound Transform</Label>
                <Input value={formData.inboundTransform || ''}
                  onChange={(e) => setFormData({ ...formData, inboundTransform: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Outbound Transform</Label>
                <Input value={formData.outboundTransform || ''}
                  onChange={(e) => setFormData({ ...formData, outboundTransform: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inbound Transform Param</Label>
                <Input value={formData.inboundTransformParameter || ''}
                  onChange={(e) => setFormData({ ...formData, inboundTransformParameter: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Outbound Transform Param</Label>
                <Input value={formData.outboundTransformParameter || ''}
                  onChange={(e) => setFormData({ ...formData, outboundTransformParameter: e.target.value })} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}
              disabled={saving || !formData.messageType || !formData.parameterName || !formData.segmentName}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingMapping ? 'Save Changes' : 'Create Mapping'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Field Mapping</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete mapping <strong>{deletingMapping?.parameterName}</strong> ({deletingMapping?.messageType})?
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
