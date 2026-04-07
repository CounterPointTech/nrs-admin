'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
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
import { icdCodeApi } from '@/lib/api';
import {
  IcdCode,
  IcdCategory,
  CreateIcdCodeRequest,
  UpdateIcdCodeRequest,
  IcdCodeSearchFilters,
  PagedResponse,
} from '@/lib/types';
import {
  Stethoscope,
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
  Ban,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function IcdCodesPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PagedResponse<IcdCode> | null>(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('icdCodeId');
  const [sortDesc, setSortDesc] = useState(false);
  const [categories, setCategories] = useState<IcdCategory[]>([]);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [versionFilter, setVersionFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [includeObsolete, setIncludeObsolete] = useState(false);

  // Editor dialog
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<IcdCode | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateIcdCodeRequest>({
    icdCodeId: '',
    description: '',
    subCategoryId: undefined,
    icdCodeVersion: 10,
    icdCodeDisplay: '',
  });

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingCode, setDeletingCode] = useState<IcdCode | null>(null);

  // Load categories
  useEffect(() => {
    icdCodeApi.getCategories().then((res) => {
      if (res.success && res.data) setCategories(res.data);
    });
  }, []);

  const executeSearch = useCallback(async (pageNum: number, sort: string, desc: boolean) => {
    setLoading(true);
    try {
      const filters: IcdCodeSearchFilters = {
        sortBy: sort,
        sortDesc: desc,
        includeObsolete,
      };
      if (searchText.trim()) filters.search = searchText.trim();
      if (versionFilter) filters.version = parseInt(versionFilter);
      if (categoryFilter) filters.categoryId = parseInt(categoryFilter);

      const res = await icdCodeApi.search(pageNum, PAGE_SIZE, filters);
      if (res.success && res.data) {
        setResults(res.data);
      } else {
        toast.error(res.message || 'Failed to load ICD codes');
      }
    } catch {
      toast.error('Failed to load ICD codes');
    } finally {
      setLoading(false);
    }
  }, [searchText, versionFilter, categoryFilter, includeObsolete]);

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

  const handleObsolete = async (code: IcdCode) => {
    const res = await icdCodeApi.markObsolete(code.icdCodeId);
    if (res.success) {
      toast.success(`${code.icdCodeId} marked as obsolete`);
      executeSearch(page, sortBy, sortDesc);
    } else {
      toast.error(res.message || 'Failed to mark as obsolete');
    }
  };

  const handleRestore = async (code: IcdCode) => {
    const res = await icdCodeApi.restore(code.icdCodeId);
    if (res.success) {
      toast.success(`${code.icdCodeId} restored`);
      executeSearch(page, sortBy, sortDesc);
    } else {
      toast.error(res.message || 'Failed to restore');
    }
  };

  const columns = useMemo<ColumnDef<IcdCode>[]>(() => [
    {
      accessorKey: 'icdCodeDisplay',
      header: () => <SortHeader column="icdCodeDisplay" label="Code" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium">{row.original.icdCodeDisplay}</span>
          {row.original.obsoleteDate && (
            <Badge variant="destructive" className="text-[10px]">Obsolete</Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: () => <SortHeader column="description" label="Description" />,
      cell: ({ row }) => (
        <span className={`max-w-[300px] truncate block ${row.original.obsoleteDate ? 'text-muted-foreground line-through' : ''}`}>
          {row.original.description || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'icdCodeVersion',
      header: () => <SortHeader column="icdCodeVersion" label="Version" />,
      cell: ({ row }) => (
        <Badge variant="outline">ICD-{row.original.icdCodeVersion}</Badge>
      ),
    },
    {
      accessorKey: 'categoryName',
      header: 'Category',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.categoryName || '—'}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const code = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => openEditor(code)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {code.obsoleteDate ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-600 hover:text-green-600"
                onClick={() => handleRestore(code)}
                title="Restore"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-yellow-600 hover:text-yellow-600"
                onClick={() => handleObsolete(code)}
                title="Mark Obsolete"
              >
                <Ban className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => { setDeletingCode(code); setDeleteOpen(true); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
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
  const openEditor = (code?: IcdCode) => {
    if (code) {
      setEditingCode(code);
      setFormData({
        icdCodeId: code.icdCodeId,
        description: code.description || '',
        subCategoryId: code.subCategoryId ?? undefined,
        icdCodeVersion: code.icdCodeVersion,
        icdCodeDisplay: code.icdCodeDisplay,
      });
    } else {
      setEditingCode(null);
      setFormData({
        icdCodeId: '',
        description: '',
        subCategoryId: undefined,
        icdCodeVersion: 10,
        icdCodeDisplay: '',
      });
    }
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!editingCode && !formData.icdCodeId.trim()) {
      toast.error('ICD code ID is required');
      return;
    }
    if (!formData.icdCodeDisplay.trim()) {
      toast.error('Display code is required');
      return;
    }

    setSaving(true);
    try {
      if (editingCode) {
        const updatePayload: UpdateIcdCodeRequest = {
          description: formData.description || undefined,
          subCategoryId: formData.subCategoryId,
          icdCodeVersion: formData.icdCodeVersion,
          icdCodeDisplay: formData.icdCodeDisplay,
        };
        const res = await icdCodeApi.update(editingCode.icdCodeId, updatePayload);
        if (res.success) {
          toast.success('ICD code updated');
          setEditorOpen(false);
          executeSearch(page, sortBy, sortDesc);
        } else {
          toast.error(res.message || 'Failed to update');
        }
      } else {
        const res = await icdCodeApi.create(formData);
        if (res.success) {
          toast.success('ICD code created');
          setEditorOpen(false);
          executeSearch(page, sortBy, sortDesc);
        } else {
          toast.error(res.message || 'Failed to create');
        }
      }
    } catch {
      toast.error('Failed to save ICD code');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCode) return;
    try {
      const res = await icdCodeApi.delete(deletingCode.icdCodeId);
      if (res.success) {
        toast.success('ICD code deleted');
        setDeleteOpen(false);
        setDeletingCode(null);
        executeSearch(page, sortBy, sortDesc);
      } else {
        // If conflict (FK references), offer to mark obsolete
        if (res.message?.includes('obsolete')) {
          toast.error(res.message, {
            action: {
              label: 'Mark Obsolete',
              onClick: () => handleObsolete(deletingCode),
            },
          });
        } else {
          toast.error(res.message || 'Failed to delete');
        }
      }
    } catch {
      toast.error('Failed to delete ICD code');
    }
  };

  const handleSearch = () => {
    setPage(1);
    executeSearch(1, sortBy, sortDesc);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="ICD Codes"
        description="Manage diagnosis codes (ICD-9, ICD-10, ICD-11)"
        icon={Stethoscope}
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

        <Select value={versionFilter} onValueChange={(v) => { setVersionFilter(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="All Versions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Versions</SelectItem>
            <SelectItem value="9">ICD-9</SelectItem>
            <SelectItem value="10">ICD-10</SelectItem>
            <SelectItem value="11">ICD-11</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.icdCategoryId} value={String(c.icdCategoryId)}>
                {c.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Checkbox
            id="includeObsolete"
            checked={includeObsolete}
            onCheckedChange={(v) => { setIncludeObsolete(v === true); setPage(1); }}
          />
          <Label htmlFor="includeObsolete" className="text-sm">Show obsolete</Label>
        </div>

        <Button size="sm" className="ml-auto" onClick={() => openEditor()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Code
        </Button>
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
                    <p>No ICD codes found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className={row.original.obsoleteDate ? 'opacity-60' : ''}>
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
            <DialogTitle>{editingCode ? 'Edit ICD Code' : 'Add ICD Code'}</DialogTitle>
            <DialogDescription>
              {editingCode ? 'Update the diagnosis code details.' : 'Create a new diagnosis code.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="icdCodeId">Code ID *</Label>
                <Input
                  id="icdCodeId"
                  value={formData.icdCodeId}
                  onChange={(e) => setFormData({ ...formData, icdCodeId: e.target.value })}
                  placeholder="e.g., M54.5"
                  disabled={!!editingCode}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="icdCodeDisplay">Display Code *</Label>
                <Input
                  id="icdCodeDisplay"
                  value={formData.icdCodeDisplay}
                  onChange={(e) => setFormData({ ...formData, icdCodeDisplay: e.target.value })}
                  placeholder="e.g., M54.5"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="icdDescription">Description</Label>
              <Input
                id="icdDescription"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Low back pain"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="icdVersion">Version *</Label>
                <Select
                  value={String(formData.icdCodeVersion)}
                  onValueChange={(v) => setFormData({ ...formData, icdCodeVersion: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9">ICD-9</SelectItem>
                    <SelectItem value="10">ICD-10</SelectItem>
                    <SelectItem value="11">ICD-11</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subCategory">Category</Label>
                <Select
                  value={formData.subCategoryId ? String(formData.subCategoryId) : '__none__'}
                  onValueChange={(v) => setFormData({ ...formData, subCategoryId: v === '__none__' ? undefined : parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.icdCategoryId} value={String(c.icdCategoryId)}>
                        {c.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            <DialogTitle>Delete ICD Code</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingCode?.icdCodeDisplay}</strong>?
              If the code is referenced by billing orders, you will need to mark it as obsolete instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
