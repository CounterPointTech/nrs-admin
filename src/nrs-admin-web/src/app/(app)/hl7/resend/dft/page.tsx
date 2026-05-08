'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DollarSign,
  Search,
  Send,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Inbox,
} from 'lucide-react';
import { toast } from 'sonner';
import { hl7ResendApi } from '@/lib/api';
import type { Hl7ProcedureSearchResult } from '@/lib/types';

const STATUS_OPTIONS = [
  { value: '__all__', label: 'Any status' },
  { value: 'Order Placed', label: 'Order Placed' },
  { value: 'Performed', label: 'Performed' },
  { value: 'Report Signed', label: 'Report Signed' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const POLL_INTERVAL_MS = 5000;
const TERMINAL_STATUSES = new Set(['Sent', 'Delivered', 'Error', 'Failed']);

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function ResendStatusBadge({ status }: { status: string }) {
  const lower = status.toLowerCase();
  if (lower === 'not sent') {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Not sent
      </Badge>
    );
  }
  if (lower === 'pending' || lower === 'processing...') {
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3 animate-pulse" />
        {status}
      </Badge>
    );
  }
  if (lower === 'sent' || lower === 'delivered') {
    return (
      <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        {status}
      </Badge>
    );
  }
  if (lower.includes('error') || lower.includes('fail')) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        {status}
      </Badge>
    );
  }
  return <Badge variant="secondary">{status}</Badge>;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function DftResendPage() {
  // Search filters
  const [startDate, setStartDate] = useState(daysAgoIso(7));
  const [endDate, setEndDate] = useState(todayIso());
  const [accession, setAccession] = useState('');
  const [patientId, setPatientId] = useState('');
  const [status, setStatus] = useState('__all__');

  // Results
  const [results, setResults] = useState<Hl7ProcedureSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Resend
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resending, setResending] = useState(false);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const pendingIds = useMemo(
    () =>
      results
        .filter((r) => !TERMINAL_STATUSES.has(r.resendStatus) && r.resendStatus !== 'Not Sent')
        .map((r) => r.procedureId),
    [results],
  );

  // Polling: while any procedure is pending, refresh status every 5s
  useEffect(() => {
    if (pendingIds.length === 0) {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
      return;
    }

    if (pollTimer.current) return; // already polling

    pollTimer.current = setInterval(async () => {
      const res = await hl7ResendApi.getDftStatus(pendingIds);
      if (res.success && res.data) {
        setResults((prev) => {
          const map = new Map(res.data!.map((s) => [s.procedureId, s.status]));
          return prev.map((r) =>
            map.has(r.procedureId) ? { ...r, resendStatus: map.get(r.procedureId)! } : r,
          );
        });
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [pendingIds]);

  const runSearch = useCallback(async () => {
    if (!startDate || !endDate) {
      toast.error('Start and end dates are required.');
      return;
    }
    if (endDate < startDate) {
      toast.error('End date must be on or after start date.');
      return;
    }

    setLoading(true);
    setSelected(new Set());
    try {
      const res = await hl7ResendApi.searchProcedures({
        startDate,
        endDate,
        accessionNumber: accession.trim() || undefined,
        patientId: patientId.trim() || undefined,
        status: status === '__all__' ? undefined : status,
      });
      if (res.success && res.data) {
        setResults(res.data);
        setSearched(true);
        if (res.data.length === 0) toast.info('No procedures matched those filters.');
      } else {
        toast.error(res.message || 'Search failed.');
      }
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, accession, patientId, status]);

  const allSelected = results.length > 0 && results.every((r) => selected.has(r.procedureId));
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map((r) => r.procedureId)));
    }
  };
  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const refreshStatus = useCallback(async () => {
    if (results.length === 0) return;
    const res = await hl7ResendApi.getDftStatus(results.map((r) => r.procedureId));
    if (res.success && res.data) {
      setResults((prev) => {
        const map = new Map(res.data!.map((s) => [s.procedureId, s.status]));
        return prev.map((r) =>
          map.has(r.procedureId) ? { ...r, resendStatus: map.get(r.procedureId)! } : r,
        );
      });
      toast.success('Status refreshed.');
    } else {
      toast.error(res.message || 'Refresh failed.');
    }
  }, [results]);

  const performResend = useCallback(async () => {
    setConfirmOpen(false);
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    // Optimistic: flip selected rows to Processing...
    setResults((prev) =>
      prev.map((r) => (selected.has(r.procedureId) ? { ...r, resendStatus: 'Processing...' } : r)),
    );

    setResending(true);
    try {
      const res = await hl7ResendApi.resendDft(ids);
      if (res.success && res.data) {
        const resultMap = new Map(res.data.results.map((r) => [r.procedureId, r]));
        setResults((prev) =>
          prev.map((r) => {
            const item = resultMap.get(r.procedureId);
            if (!item) return r;
            return { ...r, resendStatus: item.success ? 'Pending' : item.errorMessage || 'Error' };
          }),
        );
        if (res.data.failureCount === 0) {
          toast.success(`Staged ${res.data.successCount} procedure(s) for resend.`);
        } else {
          toast.warning(
            `Staged ${res.data.successCount} of ${res.data.requestedCount} — ${res.data.failureCount} failed.`,
          );
        }
        setSelected(new Set());
      } else {
        toast.error(res.message || 'Resend failed.');
        // Revert optimistic update
        setResults((prev) =>
          prev.map((r) => (selected.has(r.procedureId) ? { ...r, resendStatus: 'Error' } : r)),
        );
      }
    } finally {
      setResending(false);
    }
  }, [selected]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="DFT Resend"
        description="Stage procedures for HL7 DFT^P03 (Detailed Financial Transaction) resend."
        icon={DollarSign}
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <div className="space-y-1.5">
              <Label htmlFor="start-date">Start date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-date">End date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accession">Accession #</Label>
              <Input
                id="accession"
                placeholder="optional"
                value={accession}
                onChange={(e) => setAccession(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="patient-id">Patient ID</Label>
              <Input
                id="patient-id"
                placeholder="optional"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={runSearch} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toolbar */}
      {searched && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {results.length} procedure{results.length === 1 ? '' : 's'} found · {selected.size}{' '}
              selected
            </span>
            {pendingIds.length > 0 && (
              <Badge variant="outline" className="gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Polling {pendingIds.length} pending
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshStatus} disabled={results.length === 0}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh status
            </Button>
            <Button
              size="sm"
              disabled={selected.size === 0 || resending}
              onClick={() => setConfirmOpen(true)}
            >
              {resending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Resend selected ({selected.size})
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Results table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !searched ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Inbox className="h-10 w-10 opacity-40" />
              <p className="text-sm">Enter search criteria above and click Search.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Inbox className="h-10 w-10 opacity-40" />
              <p className="text-sm">No procedures matched the filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Accession</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Procedure</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Modality</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resend status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow
                    key={r.procedureId}
                    data-state={selected.has(r.procedureId) ? 'selected' : undefined}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selected.has(r.procedureId)}
                        onCheckedChange={() => toggleOne(r.procedureId)}
                        aria-label={`Select ${r.accessionNumber}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.accessionNumber || '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{r.patientName || '—'}</span>
                        <span className="text-xs text-muted-foreground">{r.patientId}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate text-sm">
                      {r.procedureName || '—'}
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(r.procedureDate)}</TableCell>
                    <TableCell className="text-xs">{r.modality || '—'}</TableCell>
                    <TableCell className="text-xs">{r.facility || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {r.status || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ResendStatusBadge status={r.resendStatus} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend {selected.size} DFT message(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Each selected procedure will be staged in <code>public.dft_stage</code>. Mirth will
              pick them up and transmit DFT^P03 messages to configured destinations. This action
              is logged with your username.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performResend}>Resend</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
