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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { routeQueueApi } from '@/lib/api';
import type { RouteQueueItem, PagedResponse } from '@/lib/types';
import { Trash2, ArrowUpDown, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useRoutingContext } from './routing-context';
import { RoutingFilterBar } from './routing-filter-bar';
import { RouteStudyDialog } from './route-study-dialog';
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

function queueStatusLabel(status: number): string {
  switch (status) {
    case 0: return 'Ready';
    case 1: return 'Sending';
    case 2: return 'Waiting';
    default: return `Status ${status}`;
  }
}

function priorityLabel(priority: number): string {
  switch (priority) {
    case 0: return 'Normal';
    case 1: return 'High';
    case 2: return 'Urgent';
    default: return `P${priority}`;
  }
}

export function QueueSection() {
  const { destinations, pendingFilter, consumeFilter, navigateTo, reloadSummary } = useRoutingContext();
  const [data, setData] = useState<PagedResponse<RouteQueueItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [destinationId, setDestinationId] = useState<number | undefined>();
  const [patientSearch, setPatientSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const pageSize = 50;

  // Apply pending filter from cross-section navigation
  useEffect(() => {
    if (pendingFilter?.destinationId !== undefined) {
      setDestinationId(pendingFilter.destinationId);
      setPage(1);
      consumeFilter();
    }
  }, [pendingFilter, consumeFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await routeQueueApi.getQueue({
        page, pageSize, destinationId,
        patientName: patientSearch || undefined,
        sortBy: sorting[0]?.id || 'TimeQueued',
        sortDesc: sorting[0]?.desc ?? true,
      });
      if (res.success && res.data) setData(res.data);
    } catch {
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, destinationId, patientSearch, sorting]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    try {
      const res = await routeQueueApi.deleteQueueItem(id);
      if (res.success) {
        toast.success('Item removed from queue');
        load();
        reloadSummary();
      } else {
        toast.error(res.message || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete queue item');
    }
    setConfirmDelete(null);
  };

  const columns: ColumnDef<RouteQueueItem>[] = [
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
        <Badge variant="outline" className="text-[10px] font-mono">
          {row.original.modality || '—'}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 1 ? 'default' : 'secondary'} className="text-[10px]">
          {queueStatusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => <span className="text-xs">{priorityLabel(row.original.priority)}</span>,
    },
    {
      accessorKey: 'remainingTries',
      header: 'Tries',
      cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.remainingTries}</span>,
    },
    {
      accessorKey: 'timeQueued',
      header: 'Queued',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatTimeAgo(row.original.timeQueued)}</span>
      ),
    },
    {
      accessorKey: 'nextTryTime',
      header: 'Next Try',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(row.original.nextTryTime)}</span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={() => setConfirmDelete(row.original.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
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
          destinations={destinations}
          destinationId={destinationId}
          patientSearch={patientSearch}
          onDestinationChange={(id) => { setDestinationId(id); setPage(1); }}
          onPatientSearchChange={(val) => { setPatientSearch(val); setPage(1); }}
          onClear={() => { setDestinationId(undefined); setPatientSearch(''); setPage(1); }}
        />
        <Button size="sm" onClick={() => setAddDialogOpen(true)} className="gap-1.5 h-8 text-xs">
          <Plus className="h-3.5 w-3.5" /> Queue Study
        </Button>
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
            No pending routes in the queue.
          </div>
        )}
      </div>

      <AlertDialog open={confirmDelete !== null} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Queue Item</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this item from the routing queue. The image will not be sent to the destination.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && handleDelete(confirmDelete)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RouteStudyDialog
        mode="picker"
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => { load(); reloadSummary(); }}
      />
    </div>
  );
}
