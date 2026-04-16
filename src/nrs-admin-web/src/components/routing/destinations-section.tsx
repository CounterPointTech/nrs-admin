'use client';

import { useState, useMemo } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { pacsDestinationApi } from '@/lib/api';
import {
  PacsDestination,
  CreatePacsDestinationRequest,
  RouteHistoryEntry,
  getDestinationTypeLabel,
  getDestinationStatusLabel,
  DESTINATION_TYPE_LABELS,
} from '@/lib/types';
import {
  Plus, Search, Pencil, Trash2, ArrowUpDown, Loader2, AlertCircle, History, ListOrdered,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRoutingContext } from './routing-context';

const TRANSFER_SYNTAX_OPTIONS = [
  'NegotiateTransferContext',
  'ImplicitVRLittleEndian',
  'ExplicitVRLittleEndian',
  'ExplicitVRBigEndian',
  'JPEGBaseline',
  'JPEGExtended',
  'JPEGLossless',
  'JPEG2000Lossless',
  'JPEG2000',
  'RLELossless',
];

export function DestinationsSection() {
  const { destinations, zones, initialLoading, reloadDestinations, navigateTo } = useRoutingContext();
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  // Dialog state
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingDest, setEditingDest] = useState<PacsDestination | null>(null);
  const [deletingDest, setDeletingDest] = useState<PacsDestination | null>(null);
  const [historyDest, setHistoryDest] = useState<PacsDestination | null>(null);
  const [historyEntries, setHistoryEntries] = useState<RouteHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<CreatePacsDestinationRequest>({
    name: '', address: '', aeTitle: '', port: 104, type: 0,
    numTries: 3, frequency: 0, compression: 1, status: 0,
    routeRelated: false, transferSyntax: 'NegotiateTransferContext',
  });

  const columns = useMemo<ColumnDef<PacsDestination>[]>(() => [
    {
      accessorKey: 'destinationId',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
          ID <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.destinationId}</span>,
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
      accessorKey: 'aeTitle',
      header: 'AE Title',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.aeTitle}</span>,
    },
    {
      accessorKey: 'address',
      header: 'Address',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.address}:{row.original.port}</span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline">{getDestinationTypeLabel(row.original.type)}</Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <Badge variant={s === 0 ? 'default' : s === 1 ? 'secondary' : 'destructive'}>
            {getDestinationStatusLabel(s)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'routingZoneName',
      header: 'Zone',
      cell: ({ row }) => row.original.routingZoneName || '—',
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" title="View Queue"
            onClick={() => navigateTo('queue', { destinationId: row.original.destinationId })}>
            <ListOrdered className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Route History"
            onClick={() => openHistory(row.original)}>
            <History className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit"
            onClick={() => openEditor(row.original)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete"
            onClick={() => { setDeletingDest(row.original); setDeleteOpen(true); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ], [navigateTo]);

  const table = useReactTable({
    data: destinations,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function openEditor(dest?: PacsDestination) {
    if (dest) {
      setEditingDest(dest);
      setFormData({
        name: dest.name, address: dest.address, aeTitle: dest.aeTitle,
        port: dest.port, type: dest.type, password: dest.password,
        numTries: dest.numTries, frequency: dest.frequency, compression: dest.compression,
        status: dest.status, routeRelated: dest.routeRelated,
        transferSyntax: dest.transferSyntax, routingZone: dest.routingZone,
      });
    } else {
      setEditingDest(null);
      setFormData({
        name: '', address: '', aeTitle: '', port: 104, type: 0,
        numTries: 3, frequency: 0, compression: 1, status: 0,
        routeRelated: false, transferSyntax: 'NegotiateTransferContext',
      });
    }
    setEditorOpen(true);
  }

  async function openHistory(dest: PacsDestination) {
    setHistoryDest(dest);
    setHistoryOpen(true);
    setHistoryLoading(true);
    const res = await pacsDestinationApi.getHistory(dest.destinationId);
    if (res.success && res.data) {
      setHistoryEntries(res.data);
    } else {
      setHistoryEntries([]);
      toast.error(res.message || 'Failed to load route history');
    }
    setHistoryLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingDest) {
        const res = await pacsDestinationApi.update(editingDest.destinationId, formData);
        if (res.success) {
          toast.success('Destination updated');
          setEditorOpen(false);
          await reloadDestinations();
        } else {
          toast.error(res.message || 'Failed to update destination');
        }
      } else {
        const res = await pacsDestinationApi.create(formData);
        if (res.success) {
          toast.success('Destination created');
          setEditorOpen(false);
          await reloadDestinations();
        } else {
          toast.error(res.message || 'Failed to create destination');
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingDest) return;
    setSaving(true);
    try {
      const res = await pacsDestinationApi.delete(deletingDest.destinationId);
      if (res.success) {
        toast.success('Destination deleted');
        setDeleteOpen(false);
        setDeletingDest(null);
        await reloadDestinations();
      } else {
        toast.error(res.message || 'Failed to delete destination');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search destinations..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs w-56" />
          </div>
          <span className="text-xs text-muted-foreground">
            {table.getFilteredRowModel().rows.length} destinations
          </span>
        </div>
        <Button size="sm" onClick={() => openEditor()} className="gap-1.5 h-8 text-xs">
          <Plus className="h-3.5 w-3.5" /> Add Destination
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        {initialLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : destinations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No destinations configured</p>
            <Button variant="outline" size="sm" onClick={() => openEditor()}>
              <Plus className="h-4 w-4 mr-1" /> Add your first destination
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
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
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDest ? 'Edit Destination' : 'Add Destination'}</DialogTitle>
            <DialogDescription>
              {editingDest ? `Editing destination ${editingDest.name}` : 'Configure a new PACS routing destination'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dest-name">Name *</Label>
                <Input id="dest-name" value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dest-ae">AE Title *</Label>
                <Input id="dest-ae" value={formData.aeTitle} maxLength={16}
                  className="font-mono" placeholder="Max 16 chars"
                  onChange={(e) => setFormData({ ...formData, aeTitle: e.target.value.toUpperCase() })} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="dest-addr">Address *</Label>
                <Input id="dest-addr" value={formData.address} placeholder="hostname or IP"
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dest-port">Port *</Label>
                <Input id="dest-port" type="number" min={1} max={65535} value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={String(formData.type)}
                  onValueChange={(v) => setFormData({ ...formData, type: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DESTINATION_TYPE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={String(formData.status)}
                  onValueChange={(v) => setFormData({ ...formData, status: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Active</SelectItem>
                    <SelectItem value="1">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Routing Zone</Label>
                <Select value={formData.routingZone !== undefined && formData.routingZone !== null ? String(formData.routingZone) : 'none'}
                  onValueChange={(v) => setFormData({ ...formData, routingZone: v === 'none' ? undefined : Number(v) })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {zones.map((z) => (
                      <SelectItem key={z.id} value={String(z.id)}>
                        {z.zoneName}{z.isDefault ? ' (default)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dest-tries">Retries</Label>
                <Input id="dest-tries" type="number" min={0} value={formData.numTries}
                  onChange={(e) => setFormData({ ...formData, numTries: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dest-freq">Frequency</Label>
                <Input id="dest-freq" type="number" min={0} value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dest-comp">Compression</Label>
                <Input id="dest-comp" type="number" min={0} value={formData.compression}
                  onChange={(e) => setFormData({ ...formData, compression: Number(e.target.value) })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Transfer Syntax</Label>
              <Select value={formData.transferSyntax}
                onValueChange={(v) => setFormData({ ...formData, transferSyntax: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANSFER_SYNTAX_OPTIONS.map((ts) => (
                    <SelectItem key={ts} value={ts}>{ts}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dest-pass">Password</Label>
              <Input id="dest-pass" type="password" value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value || undefined })} />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={formData.routeRelated}
                  onCheckedChange={(c) => setFormData({ ...formData, routeRelated: !!c })} />
                <span className="text-sm">Route Related</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formData.name || !formData.address || !formData.aeTitle}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingDest ? 'Save Changes' : 'Create Destination'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Destination</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingDest?.name}</strong>? This action cannot be undone.
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

      {/* Route History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Route History</DialogTitle>
            <DialogDescription>
              Recent routing history for <strong>{historyDest?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          {historyLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : historyEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <History className="h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">No routing history found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Dataset</TableHead>
                  <TableHead>Time Sent</TableHead>
                  <TableHead>Overwrite</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs">{entry.id}</TableCell>
                    <TableCell className="font-mono text-xs">{entry.dataset}</TableCell>
                    <TableCell className="text-xs">{new Date(entry.timeSent).toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={entry.overwriteExisting ? 'text-amber-500' : 'text-muted-foreground'}>
                        {entry.overwriteExisting ? 'Yes' : 'No'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
