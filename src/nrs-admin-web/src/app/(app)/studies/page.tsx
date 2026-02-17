'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { studyApi, facilityApi } from '@/lib/api';
import {
  Study,
  StudySearchFilters,
  Facility,
  PagedResponse,
  getStudyStatusLabel,
} from '@/lib/types';
import {
  FileSearch,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  SlidersHorizontal,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

const MODALITY_OPTIONS = [
  'CR', 'CT', 'DX', 'MG', 'MR', 'NM', 'OT', 'PT', 'RF', 'US', 'XA',
];

const STATUS_OPTIONS = [
  { value: 0, label: 'New' },
  { value: 1, label: 'In Progress' },
  { value: 2, label: 'Read' },
  { value: 3, label: 'Final' },
  { value: 4, label: 'Addendum' },
  { value: 5, label: 'Cancelled' },
  { value: 6, label: 'On Hold' },
  { value: 7, label: 'Stat' },
];

function statusBadgeVariant(status: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 0: return 'outline';
    case 1: return 'secondary';
    case 2: case 3: return 'default';
    case 5: return 'destructive';
    default: return 'secondary';
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const PAGE_SIZE = 50;

export default function StudiesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [results, setResults] = useState<PagedResponse<Study> | null>(null);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [sortBy, setSortBy] = useState<string>('studyDate');
  const [sortDesc, setSortDesc] = useState(true);

  // Filter form state
  const [filters, setFilters] = useState<StudySearchFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<StudySearchFilters>({});

  // Load facilities for filter dropdown
  useEffect(() => {
    facilityApi.getAll().then((res) => {
      if (res.success && res.data) setFacilities(res.data);
    });
  }, []);

  const executeSearch = useCallback(async (pageNum: number, currentFilters: StudySearchFilters, sort: string, desc: boolean) => {
    setLoading(true);
    try {
      const res = await studyApi.search(pageNum, PAGE_SIZE, {
        ...currentFilters,
        sortBy: sort,
        sortDesc: desc,
      });
      if (res.success && res.data) {
        setResults(res.data);
      } else {
        toast.error(res.message || 'Search failed');
      }
    } catch {
      toast.error('Failed to search studies');
    } finally {
      setLoading(false);
    }
  }, []);

  function handleSearch() {
    setAppliedFilters({ ...filters });
    setPage(1);
    executeSearch(1, filters, sortBy, sortDesc);
  }

  function handleClearFilters() {
    setFilters({});
    setAppliedFilters({});
    setResults(null);
    setPage(1);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    executeSearch(newPage, appliedFilters, sortBy, sortDesc);
  }

  function handleSort(column: string) {
    const newDesc = sortBy === column ? !sortDesc : true;
    setSortBy(column);
    setSortDesc(newDesc);
    if (results) {
      setPage(1);
      executeSearch(1, appliedFilters, column, newDesc);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }

  const activeFilterCount = Object.values(appliedFilters).filter(
    (v) => v !== undefined && v !== null && v !== ''
  ).length;

  function SortableHeader({ column, label }: { column: string; label: string }) {
    const isActive = sortBy === column;
    return (
      <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort(column)}>
        {label}
        {isActive ? (
          sortDesc ? <ArrowDown className="ml-1 h-3.5 w-3.5" /> : <ArrowUp className="ml-1 h-3.5 w-3.5" />
        ) : (
          <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />
        )}
      </Button>
    );
  }

  const columns = useMemo<ColumnDef<Study>[]>(() => [
    {
      id: 'patientName',
      header: () => <SortableHeader column="patientName" label="Patient" />,
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.original.lastName}, {row.original.firstName}</span>
          {row.original.gender && (
            <span className="ml-1.5 text-xs text-muted-foreground">({row.original.gender})</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'patientId',
      header: () => <SortableHeader column="patientId" label="MRN" />,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.patientId}</span>,
    },
    {
      accessorKey: 'studyDate',
      header: () => <SortableHeader column="studyDate" label="Study Date" />,
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.studyDate)}</span>,
    },
    {
      accessorKey: 'accession',
      header: () => <SortableHeader column="accession" label="Accession" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.accession || '—'}</span>
      ),
    },
    {
      accessorKey: 'modality',
      header: () => <SortableHeader column="modality" label="Modality" />,
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {row.original.modality}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: () => <SortableHeader column="status" label="Status" />,
      cell: ({ row }) => (
        <Badge variant={statusBadgeVariant(row.original.status)}>
          {getStudyStatusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      accessorKey: 'facilityName',
      header: () => <SortableHeader column="facilityName" label="Facility" />,
      cell: ({ row }) => (
        <span className="text-sm">{row.original.facilityName || '—'}</span>
      ),
    },
    {
      id: 'counts',
      header: 'Series / Images',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {row.original.seriesCount} / {row.original.imageCount}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/studies/${row.original.id}`);
          }}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [sortBy, sortDesc]);

  const table = useReactTable({
    data: results?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: results?.totalPages ?? 0,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Studies"
        description="Search and manage PACS studies"
        icon={FileSearch}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        }
      />

      {/* Search Filters */}
      {filtersOpen && (
        <Card className="animate-fade-in">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" onKeyDown={handleKeyDown}>
              <div className="space-y-2">
                <Label htmlFor="patientName">Patient Name</Label>
                <Input
                  id="patientName"
                  placeholder="Last or first name..."
                  value={filters.patientName ?? ''}
                  onChange={(e) => setFilters({ ...filters, patientName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patientId">MRN / Patient ID</Label>
                <Input
                  id="patientId"
                  placeholder="Patient ID..."
                  className="font-mono"
                  value={filters.patientId ?? ''}
                  onChange={(e) => setFilters({ ...filters, patientId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accession">Accession Number</Label>
                <Input
                  id="accession"
                  placeholder="Accession..."
                  className="font-mono"
                  value={filters.accession ?? ''}
                  onChange={(e) => setFilters({ ...filters, accession: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Modality</Label>
                <Select
                  value={filters.modality ?? '__all__'}
                  onValueChange={(v) => setFilters({ ...filters, modality: v === '__all__' ? undefined : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All modalities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All modalities</SelectItem>
                    {MODALITY_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Date From</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom ?? ''}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">Date To</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo ?? ''}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Facility</Label>
                <Select
                  value={filters.facilityId != null ? String(filters.facilityId) : '__all__'}
                  onValueChange={(v) => setFilters({ ...filters, facilityId: v === '__all__' ? undefined : Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All facilities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All facilities</SelectItem>
                    {facilities.map((f) => (
                      <SelectItem key={f.facilityId} value={String(f.facilityId)}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status != null ? String(filters.status) : '__all__'}
                  onValueChange={(v) => setFilters({ ...filters, status: v === '__all__' ? undefined : Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All statuses</SelectItem>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={String(s.value)}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4 pt-4 border-t">
              <Button onClick={handleSearch} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search Studies
              </Button>
              <Button variant="outline" onClick={handleClearFilters} className="gap-2">
                <X className="h-4 w-4" /> Clear
              </Button>
              {results && (
                <span className="ml-auto text-sm text-muted-foreground">
                  {results.totalCount.toLocaleString()} {results.totalCount === 1 ? 'study' : 'studies'} found
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      {results ? (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : results.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">No studies match your search criteria</p>
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
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/studies/${row.original.id}`)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          {results.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, results.totalCount)} of {results.totalCount.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => handlePageChange(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <span className="text-sm tabular-nums px-2">
                  Page {page} of {results.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= results.totalPages || loading}
                  onClick={() => handlePageChange(page + 1)}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : !loading ? (
        <div className="flex flex-col items-center justify-center h-64 rounded-lg border border-dashed border-border gap-3">
          <FileSearch className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Enter search criteria above to find studies</p>
          <p className="text-xs text-muted-foreground">Search by patient name, MRN, accession number, date range, or modality</p>
        </div>
      ) : null}
    </div>
  );
}
