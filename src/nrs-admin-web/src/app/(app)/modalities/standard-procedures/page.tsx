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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Checkbox } from '@/components/ui/checkbox';
import { standardProcedureApi } from '@/lib/api';
import {
  StandardProcedure,
  AnatomicalArea,
  CreateStandardProcedureRequest,
  StandardProcedureSearchFilters,
  StandardProcedureImportPreviewResponse,
  StandardProcedureImportPreviewRow,
  PagedResponse,
  TemplateFormat,
} from '@/lib/types';
import {
  ClipboardList,
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
  ChevronDown,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

type FormState = CreateStandardProcedureRequest;

const EMPTY_FORM: FormState = {
  procedureName: '',
  modalityTypeId: '',
  requiredTime: 15,
  anatomicalAreaId: undefined,
  examPrepInstructions: '',
  instructionsRequired: undefined,
};

export default function StandardProceduresPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PagedResponse<StandardProcedure> | null>(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('procedureName');
  const [sortDesc, setSortDesc] = useState(false);

  const [modalityTypes, setModalityTypes] = useState<string[]>([]);
  const [anatomicalAreas, setAnatomicalAreas] = useState<AnatomicalArea[]>([]);

  const [searchText, setSearchText] = useState('');
  const [modalityFilter, setModalityFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');

  // Editor dialog
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<StandardProcedure | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<StandardProcedure | null>(null);

  // Import dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<StandardProcedureImportPreviewResponse | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const csvFileInput = useRef<HTMLInputElement>(null);
  const xlsxFileInput = useRef<HTMLInputElement>(null);

  const [templateLoading, setTemplateLoading] = useState<TemplateFormat | null>(null);
  const [exportLoading, setExportLoading] = useState<TemplateFormat | null>(null);

  useEffect(() => {
    standardProcedureApi.getModalityTypes().then((res) => {
      if (res.success && res.data) setModalityTypes(res.data);
    });
    standardProcedureApi.getAnatomicalAreas().then((res) => {
      if (res.success && res.data) setAnatomicalAreas(res.data);
    });
  }, []);

  const executeSearch = useCallback(async (pageNum: number, sort: string, desc: boolean) => {
    setLoading(true);
    try {
      const filters: StandardProcedureSearchFilters = { sortBy: sort, sortDesc: desc };
      if (searchText.trim()) filters.search = searchText.trim();
      if (modalityFilter) filters.modalityType = modalityFilter;
      if (areaFilter) filters.anatomicalAreaId = parseInt(areaFilter, 10);

      const res = await standardProcedureApi.search(pageNum, PAGE_SIZE, filters);
      if (res.success && res.data) setResults(res.data);
      else toast.error(res.message || 'Failed to load standard procedures');
    } catch {
      toast.error('Failed to load standard procedures');
    } finally {
      setLoading(false);
    }
  }, [searchText, modalityFilter, areaFilter]);

  useEffect(() => {
    executeSearch(page, sortBy, sortDesc);
  }, [page, sortBy, sortDesc, executeSearch]);

  const handleSort = (column: string) => {
    if (sortBy === column) setSortDesc(!sortDesc);
    else { setSortBy(column); setSortDesc(false); }
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

  const columns = useMemo<ColumnDef<StandardProcedure>[]>(() => [
    {
      accessorKey: 'procedureName',
      header: () => <SortHeader column="procedureName" label="Procedure" />,
      cell: ({ row }) => <span className="font-medium">{row.original.procedureName}</span>,
    },
    {
      accessorKey: 'modalityTypeId',
      header: () => <SortHeader column="modalityType" label="Modality" />,
      cell: ({ row }) => <Badge variant="outline">{row.original.modalityTypeId}</Badge>,
    },
    {
      accessorKey: 'requiredTime',
      header: () => <SortHeader column="requiredTime" label="Minutes" />,
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.requiredTime}</span>,
    },
    {
      accessorKey: 'anatomicalAreaName',
      header: () => <SortHeader column="anatomicalArea" label="Anatomical Area" />,
      cell: ({ row }) => row.original.anatomicalAreaName
        ? <span>{row.original.anatomicalAreaName}</span>
        : <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: 'instructionsRequired',
      header: 'Prep Required',
      cell: ({ row }) => {
        if (row.original.instructionsRequired == null)
          return <span className="text-muted-foreground">—</span>;
        return row.original.instructionsRequired
          ? <Badge variant="secondary">Yes</Badge>
          : <Badge variant="outline">No</Badge>;
      },
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
            onClick={() => { setDeleting(row.original); setDeleteOpen(true); }}
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

  const openEditor = (row?: StandardProcedure) => {
    if (row) {
      setEditing(row);
      setFormData({
        procedureName: row.procedureName,
        modalityTypeId: row.modalityTypeId,
        requiredTime: row.requiredTime,
        anatomicalAreaId: row.anatomicalAreaId,
        examPrepInstructions: row.examPrepInstructions || '',
        instructionsRequired: row.instructionsRequired,
      });
    } else {
      setEditing(null);
      setFormData(EMPTY_FORM);
    }
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!formData.procedureName.trim()) { toast.error('Procedure name is required'); return; }
    if (!formData.modalityTypeId.trim()) { toast.error('Modality type is required'); return; }

    setSaving(true);
    try {
      const payload: CreateStandardProcedureRequest = {
        ...formData,
        examPrepInstructions: formData.examPrepInstructions?.trim() || undefined,
      };
      const res = editing
        ? await standardProcedureApi.update(editing.standardProcedureId, payload)
        : await standardProcedureApi.create(payload);

      if (res.success) {
        toast.success(editing ? 'Standard procedure updated' : 'Standard procedure created');
        setEditorOpen(false);
        executeSearch(page, sortBy, sortDesc);
      } else {
        toast.error(res.message || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save standard procedure');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await standardProcedureApi.delete(deleting.standardProcedureId);
      if (res.success) {
        toast.success('Standard procedure deleted');
        setDeleteOpen(false);
        setDeleting(null);
        executeSearch(page, sortBy, sortDesc);
      } else {
        toast.error(res.message || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete standard procedure');
    }
  };

  const handleTemplate = async (format: TemplateFormat) => {
    setTemplateLoading(format);
    try {
      await standardProcedureApi.downloadTemplate(format);
      toast.success(`Template downloaded (${format.toUpperCase()})`);
    } catch {
      toast.error('Template download failed');
    } finally {
      setTemplateLoading(null);
    }
  };

  const handleExport = async (format: TemplateFormat) => {
    setExportLoading(format);
    try {
      const filters: StandardProcedureSearchFilters = {};
      if (searchText.trim()) filters.search = searchText.trim();
      if (modalityFilter) filters.modalityType = modalityFilter;
      if (areaFilter) filters.anatomicalAreaId = parseInt(areaFilter, 10);
      await standardProcedureApi.exportFile(format, filters);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExportLoading(null);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportPreview(null);
    try {
      const res = await standardProcedureApi.importPreview(file);
      if (res.success && res.data) {
        setImportPreview(res.data);
        setImportOpen(true);
      } else {
        toast.error(res.message || 'Failed to parse file');
      }
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setImportLoading(false);
      if (csvFileInput.current) csvFileInput.current.value = '';
      if (xlsxFileInput.current) xlsxFileInput.current.value = '';
    }
  };

  const handleImportExecute = async () => {
    if (!importPreview) return;
    setImportLoading(true);
    try {
      const validRows = importPreview.rows
        .filter((r: StandardProcedureImportPreviewRow) => r.isValid)
        .map((r: StandardProcedureImportPreviewRow) => r.data);

      const res = await standardProcedureApi.importExecute({
        rows: validRows,
        overwriteExisting,
      });
      if (res.success && res.data) {
        const d = res.data;
        toast.success(`Import complete: ${d.insertedCount} inserted, ${d.updatedCount} updated, ${d.skippedCount} skipped`);
        setImportOpen(false);
        setImportPreview(null);
        setOverwriteExisting(false);
        setPage(1);
        executeSearch(1, sortBy, sortDesc);
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
        title="Standard Procedures"
        description="Manage the ris.standard_procedures catalog — per-modality procedure templates used by scheduling, billing, eForms, and reports."
        icon={ClipboardList}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search procedure names or prep text..."
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

        <Select
          value={modalityFilter || '__all__'}
          onValueChange={(v) => { setModalityFilter(v === '__all__' ? '' : v); setPage(1); }}
        >
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

        <Select
          value={areaFilter || '__all__'}
          onValueChange={(v) => { setAreaFilter(v === '__all__' ? '' : v); setPage(1); }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Anatomical Areas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Anatomical Areas</SelectItem>
            {anatomicalAreas.map((a) => (
              <SelectItem key={a.anatomicalAreaId} value={String(a.anatomicalAreaId)}>
                {a.anatomicalAreaName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          {/* Template dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={templateLoading !== null}>
                {templateLoading
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Download className="mr-2 h-4 w-4" />}
                Template
                <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleTemplate('xlsx')}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel (.xlsx) — with dropdowns
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTemplate('csv')}>
                <FileText className="mr-2 h-4 w-4" />
                CSV — with inline instructions
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Import dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={importLoading}>
                {importLoading
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Upload className="mr-2 h-4 w-4" />}
                Import
                <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => xlsxFileInput.current?.click()}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => csvFileInput.current?.click()}>
                <FileText className="mr-2 h-4 w-4" />
                CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={csvFileInput}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={xlsxFileInput}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={exportLoading !== null}>
                {exportLoading
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Download className="mr-2 h-4 w-4" />}
                Export
                <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileText className="mr-2 h-4 w-4" />
                CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" onClick={() => openEditor()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Procedure
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
                    <p>No standard procedures found</p>
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

        {results && results.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, results.totalCount)} of {results.totalCount}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={!results.hasPrevious} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">Page {results.page} of {results.totalPages}</span>
              <Button variant="outline" size="sm" disabled={!results.hasNext} onClick={() => setPage(page + 1)}>
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
            <DialogTitle>{editing ? 'Edit Standard Procedure' : 'Add Standard Procedure'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update catalog details.' : 'Create a new entry in the Standard Procedures catalog.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="procedureName">Procedure Name *</Label>
              <Input
                id="procedureName"
                value={formData.procedureName}
                onChange={(e) => setFormData({ ...formData, procedureName: e.target.value })}
                placeholder="e.g., MRI Brain w/o Contrast"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Modality Type *</Label>
                <Select
                  value={formData.modalityTypeId}
                  onValueChange={(v) => setFormData({ ...formData, modalityTypeId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select modality" />
                  </SelectTrigger>
                  <SelectContent>
                    {modalityTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="requiredTime">Required Time (min) *</Label>
                <Input
                  id="requiredTime"
                  type="number"
                  min={0}
                  value={formData.requiredTime}
                  onChange={(e) => setFormData({ ...formData, requiredTime: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Anatomical Area</Label>
              <Select
                value={formData.anatomicalAreaId ? String(formData.anatomicalAreaId) : '__none__'}
                onValueChange={(v) => setFormData({
                  ...formData,
                  anatomicalAreaId: v === '__none__' ? undefined : parseInt(v, 10),
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="(none)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">(none)</SelectItem>
                  {anatomicalAreas.map((a) => (
                    <SelectItem key={a.anatomicalAreaId} value={String(a.anatomicalAreaId)}>
                      {a.anatomicalAreaName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="examPrepInstructions">Exam Prep Instructions</Label>
              <Textarea
                id="examPrepInstructions"
                rows={3}
                value={formData.examPrepInstructions || ''}
                onChange={(e) => setFormData({ ...formData, examPrepInstructions: e.target.value })}
                placeholder="e.g., NPO 2 hours before arrival"
              />
            </div>

            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Switch
                id="instructionsRequired"
                checked={formData.instructionsRequired === true}
                onCheckedChange={(v) => setFormData({ ...formData, instructionsRequired: v })}
              />
              <Label htmlFor="instructionsRequired" className="flex-1 cursor-pointer">
                Prep instructions must be acknowledged
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Standard Procedure</DialogTitle>
            <DialogDescription>
              Delete <strong>{deleting?.procedureName}</strong> ({deleting?.modalityTypeId})? This cannot be undone.
              If the row is referenced by billing mappings, eForms, treatment protocols, template procedures, or order procedures, deletion will be blocked.
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
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Standard Procedures — Preview</DialogTitle>
            <DialogDescription>
              Review the parsed rows before committing. Only valid rows will be imported.
              Duplicate detection uses (ModalityType, ProcedureName).
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
                    Overwrite existing rows ({importPreview.duplicateRows} duplicate{importPreview.duplicateRows === 1 ? '' : 's'} found — match on ModalityType + ProcedureName)
                  </Label>
                </div>
              )}

              <div className="max-h-[340px] overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Procedure</TableHead>
                      <TableHead>Modality</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.rows.slice(0, 150).map((row) => (
                      <TableRow key={row.rowNumber}>
                        <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                        <TableCell className="max-w-[260px] truncate text-sm">{row.data.procedureName || '—'}</TableCell>
                        <TableCell className="text-sm">{row.data.modalityTypeId || '—'}</TableCell>
                        <TableCell className="text-sm">{row.data.anatomicalAreaName || '—'}</TableCell>
                        <TableCell>
                          {!row.isValid ? (
                            <Badge variant="destructive" className="text-xs" title={row.errors.join('; ')}>
                              {row.errors[0]}
                            </Badge>
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
              {importPreview.rows.length > 150 && (
                <p className="text-xs text-muted-foreground text-center">
                  Showing first 150 of {importPreview.rows.length} rows
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportOpen(false); setImportPreview(null); setOverwriteExisting(false); }}>
              Cancel
            </Button>
            <Button
              onClick={handleImportExecute}
              disabled={importLoading || !importPreview || importPreview.validRows === 0}
            >
              {importLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import {importPreview?.validRows ?? 0} Procedure{importPreview?.validRows === 1 ? '' : 's'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
