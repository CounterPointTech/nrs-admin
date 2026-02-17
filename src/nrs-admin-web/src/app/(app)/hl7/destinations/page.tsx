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
import { hl7DestinationApi } from '@/lib/api';
import {
  Hl7MessageDestination,
  Hl7DistributionRule,
  CreateHl7DestinationRequest,
} from '@/lib/types';
import {
  Send,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowUpDown,
  Loader2,
  AlertCircle,
  ListFilter,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Hl7DestinationsPage() {
  const [destinations, setDestinations] = useState<Hl7MessageDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  // Editor dialog
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDest, setEditingDest] = useState<Hl7MessageDestination | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateHl7DestinationRequest>({
    address: '',
    port: 0,
    application: '',
    facility: '',
    messageType: '',
    eventType: '',
    enabled: true,
    synchronous: false,
    cultureCode: '',
  });

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingDest, setDeletingDest] = useState<Hl7MessageDestination | null>(null);

  // Rules dialog
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesDest, setRulesDest] = useState<Hl7MessageDestination | null>(null);
  const [rules, setRules] = useState<Hl7DistributionRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [newRuleField, setNewRuleField] = useState('');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [newRuleMsgType, setNewRuleMsgType] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await hl7DestinationApi.getAll();
    if (res.success && res.data) setDestinations(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = useMemo<ColumnDef<Hl7MessageDestination>[]>(() => [
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
      accessorKey: 'application',
      header: 'Application',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.application}</span>,
    },
    {
      accessorKey: 'facility',
      header: 'Facility',
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
      accessorKey: 'enabled',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.enabled ? 'default' : 'secondary'}>
          {row.original.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      ),
    },
    {
      accessorKey: 'synchronous',
      header: 'Sync',
      cell: ({ row }) => (
        <span className={row.original.synchronous ? 'text-emerald-500' : 'text-muted-foreground'}>
          {row.original.synchronous ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => openRules(row.original)}>
            <ListFilter className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => openEditor(row.original)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => { setDeletingDest(row.original); setDeleteOpen(true); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ], []);

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

  function openEditor(dest?: Hl7MessageDestination) {
    if (dest) {
      setEditingDest(dest);
      setFormData({
        address: dest.address,
        port: dest.port,
        application: dest.application,
        facility: dest.facility,
        messageType: dest.messageType,
        eventType: dest.eventType || '',
        enabled: dest.enabled,
        synchronous: dest.synchronous ?? false,
        cultureCode: dest.cultureCode || '',
      });
    } else {
      setEditingDest(null);
      setFormData({
        address: '',
        port: 0,
        application: '',
        facility: '',
        messageType: '',
        eventType: '',
        enabled: true,
        synchronous: false,
        cultureCode: '',
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
        cultureCode: formData.cultureCode || undefined,
      };
      if (editingDest) {
        const res = await hl7DestinationApi.update(editingDest.destinationId, payload);
        if (res.success) {
          toast.success('Destination updated');
          setEditorOpen(false);
          await loadData();
        } else {
          toast.error(res.message || 'Failed to update destination');
        }
      } else {
        const res = await hl7DestinationApi.create(payload);
        if (res.success) {
          toast.success('Destination created');
          setEditorOpen(false);
          await loadData();
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
      const res = await hl7DestinationApi.delete(deletingDest.destinationId);
      if (res.success) {
        toast.success('Destination deleted');
        setDeleteOpen(false);
        setDeletingDest(null);
        await loadData();
      } else {
        toast.error(res.message || 'Failed to delete destination');
      }
    } finally {
      setSaving(false);
    }
  }

  async function openRules(dest: Hl7MessageDestination) {
    setRulesDest(dest);
    setRulesOpen(true);
    setRulesLoading(true);
    const res = await hl7DestinationApi.getRules(dest.destinationId);
    if (res.success && res.data) setRules(res.data);
    setRulesLoading(false);
  }

  async function handleAddRule() {
    if (!rulesDest || !newRuleField || !newRuleValue) return;
    const res = await hl7DestinationApi.createRule({
      destinationId: rulesDest.destinationId,
      field: newRuleField,
      fieldValue: newRuleValue,
      messageType: newRuleMsgType || undefined,
    });
    if (res.success) {
      toast.success('Rule created');
      setNewRuleField('');
      setNewRuleValue('');
      setNewRuleMsgType('');
      const refreshRes = await hl7DestinationApi.getRules(rulesDest.destinationId);
      if (refreshRes.success && refreshRes.data) setRules(refreshRes.data);
    } else {
      toast.error(res.message || 'Failed to create rule');
    }
  }

  async function handleDeleteRule(ruleId: number) {
    if (!rulesDest) return;
    const res = await hl7DestinationApi.deleteRule(ruleId);
    if (res.success) {
      toast.success('Rule deleted');
      const refreshRes = await hl7DestinationApi.getRules(rulesDest.destinationId);
      if (refreshRes.success && refreshRes.data) setRules(refreshRes.data);
    } else {
      toast.error(res.message || 'Failed to delete rule');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="HL7 Destinations"
        description="Manage HL7 message destination endpoints and distribution rules"
        icon={Send}
        actions={
          <Button onClick={() => openEditor()} className="gap-2">
            <Plus className="h-4 w-4" /> Add Destination
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search destinations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} destinations
        </span>
      </div>

      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : destinations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No HL7 destinations found</p>
            <Button variant="outline" size="sm" onClick={() => openEditor()}>
              <Plus className="h-4 w-4 mr-1" /> Add your first destination
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
            <DialogTitle>{editingDest ? 'Edit Destination' : 'Add Destination'}</DialogTitle>
            <DialogDescription>
              {editingDest ? `Editing destination ${editingDest.address}:${editingDest.port}` : 'Create a new HL7 message destination'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input id="address" value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port *</Label>
                <Input id="port" type="number" min={1} max={65535} value={formData.port || ''}
                  onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="application">Application *</Label>
                <Input id="application" value={formData.application}
                  onChange={(e) => setFormData({ ...formData, application: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facility">Facility *</Label>
                <Input id="facility" value={formData.facility}
                  onChange={(e) => setFormData({ ...formData, facility: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="messageType">Message Type *</Label>
                <Input id="messageType" value={formData.messageType} placeholder="e.g. ADT"
                  onChange={(e) => setFormData({ ...formData, messageType: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventType">Event Type</Label>
                <Input id="eventType" value={formData.eventType || ''} placeholder="e.g. A01"
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cultureCode">Culture</Label>
                <Input id="cultureCode" value={formData.cultureCode || ''} placeholder="en-US"
                  onChange={(e) => setFormData({ ...formData, cultureCode: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={formData.enabled}
                  onCheckedChange={(c) => setFormData({ ...formData, enabled: !!c })} />
                <span className="text-sm">Enabled</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={formData.synchronous ?? false}
                  onCheckedChange={(c) => setFormData({ ...formData, synchronous: !!c })} />
                <span className="text-sm">Synchronous</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}
              disabled={saving || !formData.address || !formData.port || !formData.application || !formData.facility || !formData.messageType}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingDest ? 'Save Changes' : 'Create Destination'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Destination</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingDest?.address}:{deletingDest?.port}</strong>?
              This will also remove associated distribution rules.
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

      {/* Distribution Rules Dialog */}
      <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Distribution Rules</DialogTitle>
            <DialogDescription>
              Rules for {rulesDest?.address}:{rulesDest?.port} (ID: {rulesDest?.destinationId})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {rulesLoading ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : rules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No distribution rules configured</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Msg Type</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => (
                      <TableRow key={rule.hl7DistributionRuleId}>
                        <TableCell className="font-mono text-xs">{rule.field}</TableCell>
                        <TableCell className="text-sm">{rule.fieldValue}</TableCell>
                        <TableCell className="font-mono text-xs">{rule.messageType || '—'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteRule(rule.hl7DistributionRuleId)}>
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
                <Label className="text-xs">Field *</Label>
                <Input value={newRuleField} onChange={(e) => setNewRuleField(e.target.value)}
                  placeholder="Field name" className="h-8 text-sm" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Value *</Label>
                <Input value={newRuleValue} onChange={(e) => setNewRuleValue(e.target.value)}
                  placeholder="Field value" className="h-8 text-sm" />
              </div>
              <div className="w-20 space-y-1">
                <Label className="text-xs">Msg Type</Label>
                <Input value={newRuleMsgType} onChange={(e) => setNewRuleMsgType(e.target.value.toUpperCase())}
                  placeholder="ADT" className="h-8 text-sm font-mono" />
              </div>
              <Button size="sm" onClick={handleAddRule} disabled={!newRuleField || !newRuleValue} className="h-8">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
