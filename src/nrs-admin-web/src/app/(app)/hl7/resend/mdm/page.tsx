'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Send,
  Loader2,
  Check,
  ChevronsUpDown,
  Calendar as CalendarIcon,
  ListOrdered,
  UserSearch,
} from 'lucide-react';
import { toast } from 'sonner';
import { hl7ResendApi } from '@/lib/api';
import type { Hl7Physician } from '@/lib/types';
import { cn } from '@/lib/utils';

type FilterType = 'date-only' | 'physician';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function yesterdayIso() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function combineDateTime(date: string, time: string): string {
  // Combine local date+time into an ISO-like string the API expects.
  // Backend treats as local server time (matches WPF tool).
  return `${date}T${time}:00`;
}

export default function MdmResendPage() {
  // Tab state
  const [tab, setTab] = useState<'accession' | 'date'>('accession');

  // ---- By accession ----
  const [accessions, setAccessions] = useState('');
  const [accSubmitting, setAccSubmitting] = useState(false);
  const [accConfirmOpen, setAccConfirmOpen] = useState(false);

  const accessionList = useMemo(
    () =>
      accessions
        .split(/[;\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [accessions],
  );

  // ---- By date range ----
  const [startDate, setStartDate] = useState(yesterdayIso());
  const [startTime, setStartTime] = useState('00:00');
  const [endDate, setEndDate] = useState(todayIso());
  const [endTime, setEndTime] = useState('23:59');
  const [filterType, setFilterType] = useState<FilterType>('date-only');
  const [physicians, setPhysicians] = useState<Hl7Physician[]>([]);
  const [selectedPhysicianId, setSelectedPhysicianId] = useState<number | null>(null);
  const [physicianPopoverOpen, setPhysicianPopoverOpen] = useState(false);
  const [physiciansLoading, setPhysiciansLoading] = useState(false);
  const [dateSubmitting, setDateSubmitting] = useState(false);
  const [dateConfirmOpen, setDateConfirmOpen] = useState(false);

  // Activity log (combined for both modes)
  const [log, setLog] = useState<string[]>([]);
  const appendLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setLog((prev) => [...prev, `[${ts}] ${msg}`]);
  }, []);

  // Load physicians lazily on first switch to date tab
  useEffect(() => {
    if (tab !== 'date' || physicians.length > 0 || physiciansLoading) return;
    setPhysiciansLoading(true);
    hl7ResendApi
      .getPhysicians()
      .then((res) => {
        if (res.success && res.data) {
          setPhysicians(res.data);
        } else {
          toast.error(res.message || 'Failed to load physicians.');
        }
      })
      .finally(() => setPhysiciansLoading(false));
  }, [tab, physicians.length, physiciansLoading]);

  const selectedPhysician = useMemo(
    () => physicians.find((p) => p.physicianId === selectedPhysicianId) || null,
    [physicians, selectedPhysicianId],
  );

  const performAccessionResend = useCallback(async () => {
    setAccConfirmOpen(false);
    if (accessionList.length === 0) return;

    setAccSubmitting(true);
    appendLog(`Connecting to database — staging ${accessionList.length} accession(s)...`);
    try {
      const res = await hl7ResendApi.resendMdmByAccession(accessionList);
      if (res.success && res.data) {
        appendLog(res.data.message);
        if (res.data.queuedCount === 0) {
          toast.warning(res.data.message);
        } else {
          toast.success(res.data.message);
        }
      } else {
        appendLog(`ERROR: ${res.message || 'unknown error'}`);
        toast.error(res.message || 'Resend failed.');
      }
    } finally {
      setAccSubmitting(false);
    }
  }, [accessionList, appendLog]);

  const performDateResend = useCallback(async () => {
    setDateConfirmOpen(false);

    setDateSubmitting(true);
    const physicianLabel =
      filterType === 'physician' && selectedPhysician
        ? ` (filtered by ${selectedPhysician.physicianName})`
        : '';
    appendLog(
      `Resending MDM by date ${startDate} ${startTime} — ${endDate} ${endTime}${physicianLabel}...`,
    );

    try {
      const res = await hl7ResendApi.resendMdmByDate({
        startDateTime: combineDateTime(startDate, startTime),
        endDateTime: combineDateTime(endDate, endTime),
        physicianId:
          filterType === 'physician' && selectedPhysicianId !== null ? selectedPhysicianId : undefined,
      });
      if (res.success && res.data) {
        appendLog(res.data.message);
        if (res.data.queuedCount === 0) {
          toast.warning(res.data.message);
        } else {
          toast.success(res.data.message);
        }
      } else {
        appendLog(`ERROR: ${res.message || 'unknown error'}`);
        toast.error(res.message || 'Resend failed.');
      }
    } finally {
      setDateSubmitting(false);
    }
  }, [
    appendLog,
    endDate,
    endTime,
    filterType,
    selectedPhysician,
    selectedPhysicianId,
    startDate,
    startTime,
  ]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="MDM Resend"
        description="Re-queue Medical Document Management messages for signed/finalized reports."
        icon={FileText}
      />

      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          MDM resends work by resetting report workflow steps in{' '}
          <code className="text-xs">ris.reports</code> and{' '}
          <code className="text-xs">ris.order_procedure_steps</code>. Novarad detects the status
          reset and regenerates the MDM message. Only signed / finalized / distributed{' '}
          <code className="text-xs">TEXT</code> reports are eligible.
        </AlertDescription>
      </Alert>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="accession" className="gap-2">
            <ListOrdered className="h-4 w-4" />
            By accession list
          </TabsTrigger>
          <TabsTrigger value="date" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            By date range
          </TabsTrigger>
        </TabsList>

        {/* Tab: Accession list */}
        <TabsContent value="accession" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Paste accession numbers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="accessions">
                  Accessions{' '}
                  <span className="text-xs text-muted-foreground">
                    (semicolons, commas, spaces, or newlines as separator)
                  </span>
                </Label>
                <Textarea
                  id="accessions"
                  placeholder="ACC123456; ACC123457; ACC123458"
                  value={accessions}
                  onChange={(e) => setAccessions(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{accessionList.length} parsed</Badge>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => setAccConfirmOpen(true)}
                  disabled={accessionList.length === 0 || accSubmitting}
                >
                  {accSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Resend MDM
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Date range */}
        <TabsContent value="date" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Date range &amp; filter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="md-start-date">Start date</Label>
                  <Input
                    id="md-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="md-start-time">Start time</Label>
                  <Input
                    id="md-start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="md-end-date">End date</Label>
                  <Input
                    id="md-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="md-end-time">End time</Label>
                  <Input
                    id="md-end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Filter</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={filterType === 'date-only' ? 'default' : 'outline'}
                    onClick={() => setFilterType('date-only')}
                  >
                    Date range only
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={filterType === 'physician' ? 'default' : 'outline'}
                    onClick={() => setFilterType('physician')}
                  >
                    <UserSearch className="mr-2 h-4 w-4" />
                    By signing physician
                  </Button>
                </div>
              </div>

              {filterType === 'physician' && (
                <div className="space-y-1.5">
                  <Label>Signing physician</Label>
                  <Popover open={physicianPopoverOpen} onOpenChange={setPhysicianPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between md:w-[400px]"
                        disabled={physiciansLoading}
                      >
                        {physiciansLoading
                          ? 'Loading physicians...'
                          : selectedPhysician
                            ? selectedPhysician.physicianName
                            : 'Select a physician'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search physicians..." />
                        <CommandList>
                          <CommandEmpty>No physician found.</CommandEmpty>
                          <CommandGroup>
                            {physicians.map((p) => (
                              <CommandItem
                                key={p.physicianId}
                                value={p.physicianName}
                                onSelect={() => {
                                  setSelectedPhysicianId(p.physicianId);
                                  setPhysicianPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    selectedPhysicianId === p.physicianId
                                      ? 'opacity-100'
                                      : 'opacity-0',
                                  )}
                                />
                                {p.physicianName}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => setDateConfirmOpen(true)}
                  disabled={
                    dateSubmitting ||
                    (filterType === 'physician' && selectedPhysicianId === null)
                  }
                >
                  {dateSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Resend MDM
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Activity log */}
      {log.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border bg-muted/40 p-3 font-mono text-xs">
              {log.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
            <div className="mt-2 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setLog([])}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm: by accession */}
      <AlertDialog open={accConfirmOpen} onOpenChange={setAccConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend MDM for {accessionList.length} accession(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Each matching procedure&apos;s report status will be reset so Novarad regenerates
              the MDM message. Only signed/finalized/distributed reports are eligible — accessions
              without one will be skipped silently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performAccessionResend}>Resend</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm: by date */}
      <AlertDialog open={dateConfirmOpen} onOpenChange={setDateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend MDM by date range?</AlertDialogTitle>
            <AlertDialogDescription>
              All signed/finalized/distributed reports between{' '}
              <strong>
                {startDate} {startTime}
              </strong>{' '}
              and{' '}
              <strong>
                {endDate} {endTime}
              </strong>
              {filterType === 'physician' && selectedPhysician
                ? `, signed by ${selectedPhysician.physicianName},`
                : ''}{' '}
              will have their workflow reset to trigger MDM regeneration. This can be a large
              batch — proceed with care.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performDateResend}>Resend</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
