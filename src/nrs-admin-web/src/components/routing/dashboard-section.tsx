'use client';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRoutingContext } from './routing-context';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function DashboardSection() {
  const { summary, summaryLoading, navigateTo } = useRoutingContext();

  if (summaryLoading && !summary) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  const totals = summary?.totals ?? { pending: 0, errors: 0, completedToday: 0 };
  const destinations = summary?.destinations ?? [];

  return (
    <div className="space-y-4">
      {/* Total cards */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => navigateTo('queue')}
          className="text-left rounded-lg border bg-card p-4 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-2">
            <Clock className="h-3.5 w-3.5" />
            Pending
          </div>
          <div className="text-2xl font-bold tabular-nums">{totals.pending.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">items in queue</div>
        </button>

        <button
          onClick={() => navigateTo('errors', { subTab: 'errors' })}
          className="text-left rounded-lg border bg-card p-4 hover:border-destructive/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            Errors
          </div>
          <div className={`text-2xl font-bold tabular-nums ${totals.errors > 0 ? 'text-destructive' : ''}`}>
            {totals.errors.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">failed routes</div>
        </button>

        <button
          onClick={() => navigateTo('errors', { subTab: 'history' })}
          className="text-left rounded-lg border bg-card p-4 hover:border-green-500/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Sent Today
          </div>
          <div className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
            {totals.completedToday.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">completed routes</div>
        </button>
      </div>

      {/* Per-destination breakdown */}
      {destinations.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-semibold">By Destination</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destination</TableHead>
                <TableHead className="text-right w-24">Pending</TableHead>
                <TableHead className="text-right w-24">Errors</TableHead>
                <TableHead className="text-right w-24">Sent Today</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {destinations.map(d => (
                <TableRow key={d.destinationId}>
                  <TableCell>
                    <button
                      className="font-medium hover:text-primary transition-colors text-left"
                      onClick={() => navigateTo('destinations')}
                    >
                      {d.destinationName}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    {d.pendingCount > 0 ? (
                      <button onClick={() => navigateTo('queue', { destinationId: d.destinationId })}>
                        <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                          {d.pendingCount}
                        </Badge>
                      </button>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {d.errorCount > 0 ? (
                      <button onClick={() => navigateTo('errors', { destinationId: d.destinationId, subTab: 'errors' })}>
                        <Badge variant="destructive" className="cursor-pointer hover:bg-destructive/80">
                          {d.errorCount}
                        </Badge>
                      </button>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {d.completedToday > 0 ? d.completedToday : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          No active routing. All queues are empty.
        </div>
      )}
    </div>
  );
}
