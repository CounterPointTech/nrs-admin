'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { routeQueueApi } from '@/lib/api';
import type { RouteError, RouteHistoryItem, PagedResponse } from '@/lib/types';
import { Trash2, RotateCcw, ArrowUpDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRoutingContext } from './routing-context';
import { RoutingFilterBar } from './routing-filter-bar';
import { RoutingPagination } from './routing-pagination';

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  if (diffMs < 60000) return 'just now';
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
  return `${Math.floor(diffMs / 86400000)}d ago`;
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function priorityLabel(p: number): string {
  switch (p) { case 0: return 'Normal'; case 1: return 'High'; case 2: return 'Urgent'; default: return `P${p}`; }
}

// ==================== Errors Tab ====================

function ErrorsTab() {
  const { destinations, pendingFilter, consumeFilter, navigateTo, reloadSummary } = useRoutingContext();
  const [data, setData] = useState<PagedResponse<RouteError> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [destinationId, setDestinationId] = useState<number | undefined>();
  const [patientSearch, setPatientSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [confirmBulk, setConfirmBulk] = useState<{ action: 'retry' | 'clear'; destId: number; destName: string } | null>(null);
  const pageSize = 50;

  useEffect(() => {
    if (pendingFilter?.destinationId !== undefined && pendingFilter.subTab === 'errors') {
      setDestinationId(pendingFilter.destinationId);
      setPage(1);
      consumeFilter();
    }
  }, [pendingFilter, consumeFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await routeQueueApi.getErrors({
        page, pageSize, destinationId,
        patientName: patientSearch || undefined,
        sortBy: sorting[0]?.id || 'LastTryTime',
        sortDesc: sorting[0]?.desc ?? true,
      });
      if (res.success && res.data) setData(res.data);
    } catch {
      toast.error('Failed to load errors');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, destinationId, patientSearch, sorting]);

  useEffect(() => { load(); }, [load]);

  const handleRetry = async (id: number) => {
    setRetrying(id);
    try {
      const res = await routeQueueApi.retryError(id);
      if (res.success) { toast.success('Re-queued for retry'); load(); reloadSummary(); }
      else toast.error(res.message || 'Failed to retry');
    } catch { toast.error('Failed to retry'); }
    finally { setRetrying(null); }
  };

  const handleBulkAction = async () => {
    if (!confirmBulk) return;
    try {
      const res = confirmBulk.action === 'retry'
        ? await routeQueueApi.retryAllErrors(confirmBulk.destId)
        : await routeQueueApi.clearErrors(confirmBulk.destId);
      if (res.success) { toast.success(res.message || 'Done'); load(); reloadSummary(); }
      else toast.error(res.message || 'Failed');
    } catch { toast.error('Operation failed'); }
    setConfirmBulk(null);
  };

  const errorDestinations = data?.items
    ? [...new Map(data.items.map(e => [e.destinationId, { id: e.destinationId, name: e.destinationName || `ID ${e.destinationId}` }])).values()]
    : [];

  const columns: ColumnDef<RouteError>[] = [
    {
      accessorKey: 'destinationName',
      header: 'Destination',
      cell: ({ row }) => (
        <button className="font-medium text-xs hover:text-primary transition-colors"
          onClick={() => navigateTo('destinations')}>
          {row.original.destinationName || '—'}
        </button>
      ),
    },
    {
      accessorKey: 'patientName',
      header: 'Patient',
      cell: ({ row }) => (
        <div className="text-xs">
          <div>{row.original.patientName || '—'}</div>
          {row.original.patientId && (
            <div className="text-[10px] text-muted-foreground">{row.original.patientId}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'modality',
      header: 'Modality',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] font-mono">{row.original.modality || '—'}</Badge>
      ),
    },
    {
      accessorKey: 'error',
      header: 'Error',
      cell: ({ row }) => (
        <span className="text-xs text-destructive max-w-xs truncate block" title={row.original.error}>
          {row.original.error}
        </span>
      ),
    },
    {
      accessorKey: 'lastTryTime',
      header: 'Last Attempt',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatTimeAgo(row.original.lastTryTime)}</span>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => <span className="text-xs">{priorityLabel(row.original.priority)}</span>,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary"
          disabled={retrying === row.original.id} onClick={() => handleRetry(row.original.id)}>
          {retrying === row.original.id
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <RotateCcw className="h-3 w-3" />}
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data: data?.items ?? [], columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    manualSorting: true,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <RoutingFilterBar
          destinations={destinations} destinationId={destinationId} patientSearch={patientSearch}
          onDestinationChange={(id) => { setDestinationId(id); setPage(1); }}
          onPatientSearchChange={(val) => { setPatientSearch(val); setPage(1); }}
          onClear={() => { setDestinationId(undefined); setPatientSearch(''); setPage(1); }}
        />
        {errorDestinations.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {errorDestinations.map(d => (
              <div key={d.id} className="flex gap-1">
                <Button variant="outline" size="sm" className="h-7 text-[10px]"
                  onClick={() => setConfirmBulk({ action: 'retry', destId: d.id, destName: d.name })}>
                  <RotateCcw className="h-3 w-3 mr-1" />Retry All ({d.name})
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-[10px] text-destructive"
                  onClick={() => setConfirmBulk({ action: 'clear', destId: d.id, destName: d.name })}>
                  <Trash2 className="h-3 w-3 mr-1" />Clear
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map(hg => (
                  <TableRow key={hg.id}>
                    {hg.headers.map(header => (
                      <TableHead key={header.id} className="text-xs">
                        {header.isPlaceholder ? null : (
                          <button className="flex items-center gap-1"
                            onClick={header.column.getToggleSortingHandler()}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                          </button>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map(row => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id} className="py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 pb-3">
              <RoutingPagination
                page={data.page} totalPages={data.totalPages}
                totalCount={data.totalCount} pageSize={data.pageSize}
                onPageChange={setPage}
              />
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No routing errors. All routes are succeeding.
          </div>
        )}
      </div>

      <AlertDialog open={confirmBulk !== null} onOpenChange={() => setConfirmBulk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmBulk?.action === 'retry' ? 'Retry All Errors' : 'Clear All Errors'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmBulk?.action === 'retry'
                ? `All failed routes for "${confirmBulk.destName}" will be moved back to the pending queue.`
                : `All failed routes for "${confirmBulk?.destName}" will be permanently discarded.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkAction}>
              {confirmBulk?.action === 'retry' ? 'Retry All' : 'Clear All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== History Tab ====================

function HistoryTab() {
  const { destinations, navigateTo } = useRoutingContext();
  const [data, setData] = useState<PagedResponse<RouteHistoryItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [destinationId, setDestinationId] = useState<number | undefined>();
  const [patientSearch, setPatientSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const pageSize = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await routeQueueApi.getHistory({
        page, pageSize, destinationId,
        patientName: patientSearch || undefined,
        sortBy: sorting[0]?.id || 'TimeSent',
        sortDesc: sorting[0]?.desc ?? true,
      });
      if (res.success && res.data) setData(res.data);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, destinationId, patientSearch, sorting]);

  useEffect(() => { load(); }, [load]);

  const columns: ColumnDef<RouteHistoryItem>[] = [
    {
      accessorKey: 'destinationName',
      header: 'Destination',
      cell: ({ row }) => (
        <button className="font-medium text-xs hover:text-primary transition-colors"
          onClick={() => navigateTo('destinations')}>
          {row.original.destinationName || '—'}
        </button>
      ),
    },
    {
      accessorKey: 'patientName',
      header: 'Patient',
      cell: ({ row }) => (
        <div className="text-xs">
          <div>{row.original.patientName || '—'}</div>
          {row.original.patientId && (
            <div className="text-[10px] text-muted-foreground">{row.original.patientId}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'modality',
      header: 'Modality',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] font-mono">{row.original.modality || '—'}</Badge>
      ),
    },
    {
      accessorKey: 'studyUid',
      header: 'Study UID',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono max-w-[200px] truncate block"
          title={row.original.studyUid || ''}>
          {row.original.studyUid || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'timeSent',
      header: 'Sent',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(row.original.timeSent)}</span>
      ),
    },
    {
      accessorKey: 'overwriteExisting',
      header: 'Overwrite',
      cell: ({ row }) => <span className="text-xs">{row.original.overwriteExisting ? 'Yes' : 'No'}</span>,
    },
  ];

  const table = useReactTable({
    data: data?.items ?? [], columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    manualSorting: true,
  });

  return (
    <div className="space-y-3">
      <RoutingFilterBar
        destinations={destinations} destinationId={destinationId} patientSearch={patientSearch}
        onDestinationChange={(id) => { setDestinationId(id); setPage(1); }}
        onPatientSearchChange={(val) => { setPatientSearch(val); setPage(1); }}
        onClear={() => { setDestinationId(undefined); setPatientSearch(''); setPage(1); }}
      />

      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map(hg => (
                  <TableRow key={hg.id}>
                    {hg.headers.map(header => (
                      <TableHead key={header.id} className="text-xs">
                        {header.isPlaceholder ? null : (
                          <button className="flex items-center gap-1"
                            onClick={header.column.getToggleSortingHandler()}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                          </button>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map(row => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id} className="py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 pb-3">
              <RoutingPagination
                page={data.page} totalPages={data.totalPages}
                totalCount={data.totalCount} pageSize={data.pageSize}
                onPageChange={setPage}
              />
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No routing history found.
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== Combined Section ====================

export function ErrorsHistorySection() {
  const { pendingFilter, summary } = useRoutingContext();
  const defaultTab = pendingFilter?.subTab === 'history' ? 'history' : 'errors';
  const errorCount = summary?.totals.errors ?? 0;

  return (
    <Tabs defaultValue={defaultTab} className="space-y-3">
      <TabsList>
        <TabsTrigger value="errors" className="gap-1.5">
          Errors
          {errorCount > 0 && (
            <Badge variant="destructive" className="text-[9px] h-4 px-1">{errorCount}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      <TabsContent value="errors">
        <ErrorsTab />
      </TabsContent>
      <TabsContent value="history">
        <HistoryTab />
      </TabsContent>
    </Tabs>
  );
}
