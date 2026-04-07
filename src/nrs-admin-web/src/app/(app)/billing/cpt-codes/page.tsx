'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Checkbox } from '@/components/ui/checkbox';
import { cptCodeApi } from '@/lib/api';
import {
  BillingServiceCode,
  CreateCptCodeRequest,
  CptCodeSearchFilters,
  CptImportPreviewResponse,
  CptImportPreviewRow,
  PagedResponse,
} from '@/lib/types';
import {
  DollarSign,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

export default function CptCodesPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PagedResponse<BillingServiceCode> | null>(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('serviceCode');
  const [sortDesc, setSortDesc] = useState(false);
  const [modalityTypes, setModalityTypes] = useState<string[]>([]);

  // Filter state
  const [searchText, setSearchText] = useState('');
  const [modalityFilter, setModalityFilter] = useState('');

  // Editor dialog
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<BillingServiceCode | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateCptCodeRequest>({
    serviceCode: '',
    description: '',
    modalityType: '',
    rvuWork: undefined,
    customField1: '',
    customField2: '',
    customField3: '',
  });

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingCode, setDeletingCode] = useState<BillingServiceCode | null>(null);

  // Import dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<CptImportPreviewResponse | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export
  const [exportLoading, setExportLoading] = useState(false);

  // Load modality types for filter
  useEffect(() => {
    cptCodeApi.getModalityTypes().then((res) => {
      if (res.success && res.data) setModalityTypes(res.data);
    });
  }, []);

  const executeSearch = useCallback(async (pageNum: number, sort: string, desc: boolean) => {
    setLoading(true);
    try {
      const filters: CptCodeSearchFilters = {
        sortBy: sort,
        sortDesc: desc,
      };
      if (searchText.trim()) filters.search = searchText.trim();
      if (modalityFilter) filters.modalityType = modalityFilter;

      const res = await cptCodeApi.search(pageNum, PAGE_SIZE, filters);
      if (res.success && res.data) {
        setResults(res.data);
      } else {
        toast.error(res.message || 'Failed to load CPT codes');
      }
    } catch {
      toast.error('Failed to load CPT codes');
    } finally {
      setLoading(false);
    }
  }, [searchText, modalityFilter]);

  useEffect(() => {
    executeSearch(page, sortBy, sortDesc);
  }, [page, sortBy, sortDesc, executeSearch]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(column);
      setSortDesc(false);
    }
    setPage(1);
  };

  const SortHeader = ({ column, label }: { column: string; label: string }) => (
    <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort(column)}>
      {label}
      {sortBy === column ? (
        sortDesc ? <ArrowDown className="ml-1 h-3.5 w-3.5" /> : <ArrowUp className="ml-1 h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />
      )}
    </Button>
  );

  const columns = useMemo<ColumnDef<BillingServiceCode>[]>(() => [
    {
      accessorKey: 'serviceCode',
      header: () => <SortHeader column="serviceCode" label="Code" />,
      cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.serviceCode}</span>,
    },
    {
      accessorKey: 'description',
      header: () => <SortHeader column="description" label="Description" />,
      cell: ({ row }) => (
        <span className="max-w-[300px] truncate block">{row.original.description || '—'}</span>
      ),
    },
    {
      accessorKey: 'modalityType',
      header: () => <SortHeader column="modalityType" label="Modality" />,
      cell: ({ row }) => row.original.modalityType ? (
        <Badge variant="outline">{row.original.modalityType}</Badge>
      ) : <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: 'rvuWork',
      header: () => <SortHeader column="rvuWork" label="RVU" />,
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.rvuWork?.toFixed(2) ?? '—'}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => openEditor(row.original)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => { setDeletingCode(row.original); setDeleteOpen(true); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ], [sortBy, sortDesc]);

  const table = useReactTable({
    data: results?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
  });

  // Editor
  const openEditor = (code?: BillingServiceCode) => {
    if (code) {
      setEditingCode(code);
      setFormData({
        serviceCode: code.serviceCode,
        description: code.description || '',
        modalityType: code.modalityType || '',
        rvuWork: code.rvuWork,
        customField1: code.customField1 || '',
        customField2: code.customField2 || '',
        customField3: code.customField3 || '',
      });
    } else {
      setEditingCode(null);
      setFormData({
        serviceCode: '',
        description: '',
        modalityType: '',
        rvuWork: undefined,
        customField1: '',
        customField2: '',
        customField3: '',
      });
    }
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!formData.serviceCode.trim()) {
      toast.error('Service code is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        description: formData.description || undefined,
        modalityType: formData.modalityType || undefined,
        customField1: formData.customField1 || undefined,
        customField2: formData.customField2 || undefined,
        customField3: formData.customField3 || undefined,
      };

      const res = editingCode
        ? await cptCodeApi.update(editingCode.serviceCodeId, payload)
        : await cptCodeApi.create(payload);

      if (res.success) {
        toast.success(editingCode ? 'CPT code updated' : 'CPT code created');
        setEditorOpen(false);
        executeSearch(page, sortBy, sortDesc);
      } else {
        toast.error(res.message || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save CPT code');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCode) return;
    try {
      const res = await cptCodeApi.delete(deletingCode.serviceCodeId);
      if (res.success) {
        toast.success('CPT code deleted');
        setDeleteOpen(false);
        setDeletingCode(null);
        executeSearch(page, sortBy, sortDesc);
      } else {
        toast.error(res.message || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete CPT code');
    }
  };

  // Export
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const filters: CptCodeSearchFilters = {};
      if (searchText.trim()) filters.search = searchText.trim();
      if (modalityFilter) filters.modalityType = modalityFilter;
      await cptCodeApi.exportCsv(filters);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExportLoading(false);
    }
  };

  // Import
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportPreview(null);
    try {
      const res = await cptCodeApi.importPreview(file);
      if (res.success && res.data) {
        setImportPreview(res.data);
        setImportOpen(true);
      } else {
        toast.error(res.message || 'Failed to parse CSV');
      }
    } catch {
      toast.error('Failed to upload CSV');
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImportExecute = async () => {
    if (!importPreview) return;
    setImportLoading(true);
    try {
      const validRows = importPreview.rows
        .filter((r: CptImportPreviewRow) => r.isValid)
        .map((r: CptImportPreviewRow) => r.data);

      const res = await cptCodeApi.importExecute({
        rows: validRows,
        overwriteExisting,
      });

      if (res.success && res.data) {
        const d = res.data;
        toast.success(`Import complete: ${d.insertedCount} inserted, ${d.updatedCount} updated, ${d.skippedCount} skipped`);
        setImportOpen(false);
        setImportPreview(null);
        executeSearch(1, sortBy, sortDesc);
        setPage(1);
      } else {
        toast.error(res.message || 'Import failed');
      }
    } catch {
      toast.error('Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    executeSearch(1, sortBy, sortDesc);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="CPT Codes"
        description="Manage billing service codes (CPT/HCPCS)"
        icon={DollarSign}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search codes or descriptions..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <Select value={modalityFilter} onValueChange={(v) => { setModalityFilter(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Modalities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Modalities</SelectItem>
            {modalityTypes.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exportLoading}>
            {exportLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export CSV
          </Button>
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Button variant="outline" size="sm" disabled={importLoading}>
              {importLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Import CSV
            </Button>
          </div>
          <Button size="sm" onClick={() => openEditor()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Code
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
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
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-8 w-8" />
                    <p>No CPT codes found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {results && results.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, results.totalCount)} of {results.totalCount}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!results.hasPrevious}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {results.page} of {results.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!results.hasNext}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCode ? 'Edit CPT Code' : 'Add CPT Code'}</DialogTitle>
            <DialogDescription>
              {editingCode ? 'Update the billing service code details.' : 'Create a new billing service code.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="serviceCode">Service Code *</Label>
              <Input
                id="serviceCode"
                value={formData.serviceCode}
                onChange={(e) => setFormData({ ...formData, serviceCode: e.target.value })}
                placeholder="e.g., 70553"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., MRI Brain w/ and w/o Contrast"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="modalityType">Modality Type</Label>
                <Input
                  id="modalityType"
                  value={formData.modalityType || ''}
                  onChange={(e) => setFormData({ ...formData, modalityType: e.target.value })}
                  placeholder="e.g., MR"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rvuWork">RVU Work</Label>
                <Input
                  id="rvuWork"
                  type="number"
                  step="0.01"
                  value={formData.rvuWork ?? ''}
                  onChange={(e) => setFormData({ ...formData, rvuWork: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="e.g., 2.50"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customField1">Custom Field 1</Label>
              <Input
                id="customField1"
                value={formData.customField1 || ''}
                onChange={(e) => setFormData({ ...formData, customField1: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customField2">Custom Field 2</Label>
              <Input
                id="customField2"
                value={formData.customField2 || ''}
                onChange={(e) => setFormData({ ...formData, customField2: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customField3">Custom Field 3</Label>
              <Input
                id="customField3"
                value={formData.customField3 || ''}
                onChange={(e) => setFormData({ ...formData, customField3: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete CPT Code</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingCode?.serviceCode}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Preview Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import CPT Codes — Preview</DialogTitle>
            <DialogDescription>
              Review the parsed CSV data before importing.
            </DialogDescription>
          </DialogHeader>
          {importPreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{importPreview.totalRows}</p>
                  <p className="text-xs text-muted-foreground">Total Rows</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{importPreview.validRows}</p>
                  <p className="text-xs text-muted-foreground">Valid</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{importPreview.duplicateRows}</p>
                  <p className="text-xs text-muted-foreground">Duplicates</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{importPreview.errorRows}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              </div>

              {importPreview.duplicateRows > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                  <Checkbox
                    id="overwrite"
                    checked={overwriteExisting}
                    onCheckedChange={(v) => setOverwriteExisting(v === true)}
                  />
                  <Label htmlFor="overwrite" className="text-sm">
                    Overwrite existing codes ({importPreview.duplicateRows} duplicates found)
                  </Label>
                </div>
              )}

              <div className="max-h-[300px] overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.rows.slice(0, 100).map((row) => (
                      <TableRow key={row.rowNumber}>
                        <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                        <TableCell className="font-mono text-sm">{row.data.serviceCode}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{row.data.description || '—'}</TableCell>
                        <TableCell>
                          {!row.isValid ? (
                            <Badge variant="destructive" className="text-xs">{row.errors[0]}</Badge>
                          ) : row.isDuplicate ? (
                            <Badge variant="secondary" className="text-xs">Duplicate</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">New</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {importPreview.rows.length > 100 && (
                <p className="text-xs text-muted-foreground text-center">
                  Showing first 100 of {importPreview.rows.length} rows
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportOpen(false); setImportPreview(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleImportExecute}
              disabled={importLoading || !importPreview || importPreview.validRows === 0}
            >
              {importLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import {importPreview?.validRows ?? 0} Codes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
