'use client';

import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { pacsDestinationApi, routeQueueApi, studyApi } from '@/lib/api';
import type { PacsDestination, Study } from '@/lib/types';
import { Loader2, Search, Radio } from 'lucide-react';
import { toast } from 'sonner';

type RouteMode = 'study' | 'series' | 'picker';

interface RouteStudyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: RouteMode;
  studyUid?: string;
  seriesUid?: string;
  context?: string;
  onSuccess?: () => void;
}

export function RouteStudyDialog({
  open, onOpenChange, mode, studyUid, seriesUid, context, onSuccess,
}: RouteStudyDialogProps) {
  // Destination/priority/overwrite state
  const [destinations, setDestinations] = useState<PacsDestination[]>([]);
  const [destId, setDestId] = useState<string>('');
  const [priority, setPriority] = useState<string>('0');
  const [overwrite, setOverwrite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingDestinations, setLoadingDestinations] = useState(false);

  // Picker mode state
  const [searchAccession, setSearchAccession] = useState('');
  const [searchPatientName, setSearchPatientName] = useState('');
  const [searchPatientId, setSearchPatientId] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Study[]>([]);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);

  // Load destinations on open
  useEffect(() => {
    if (!open) return;
    setLoadingDestinations(true);
    pacsDestinationApi.getAll()
      .then(res => {
        if (res.success && res.data) {
          // Only active destinations, sorted by name
          const active = res.data.filter(d => d.status === 0).sort((a, b) => a.name.localeCompare(b.name));
          setDestinations(active);
        }
      })
      .catch(() => toast.error('Failed to load destinations'))
      .finally(() => setLoadingDestinations(false));
  }, [open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setDestId('');
      setPriority('0');
      setOverwrite(false);
      setSearchAccession('');
      setSearchPatientName('');
      setSearchPatientId('');
      setResults([]);
      setSelectedStudy(null);
    }
  }, [open]);

  async function handleSearch() {
    if (!searchAccession && !searchPatientName && !searchPatientId) {
      toast.error('Enter at least one search field');
      return;
    }
    setSearching(true);
    setResults([]);
    setSelectedStudy(null);
    try {
      const res = await studyApi.search(1, 25, {
        accession: searchAccession || undefined,
        patientName: searchPatientName || undefined,
        patientId: searchPatientId || undefined,
      });
      if (res.success && res.data) {
        setResults(res.data.items);
        if (res.data.items.length === 0) {
          toast.info('No matching studies');
        }
      } else {
        toast.error(res.message || 'Search failed');
      }
    } catch {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit() {
    if (!destId) {
      toast.error('Select a destination');
      return;
    }

    // Resolve which UID to send
    let targetStudyUid = studyUid;
    if (mode === 'picker') {
      if (!selectedStudy) {
        toast.error('Select a study to route');
        return;
      }
      targetStudyUid = selectedStudy.studyUid;
    }

    const destination = destinations.find(d => d.destinationId.toString() === destId);
    const destName = destination?.name ?? 'destination';

    setSaving(true);
    try {
      const req = {
        destinationId: parseInt(destId),
        priority: parseInt(priority),
        overwriteExisting: overwrite,
      };

      const res = mode === 'series' && seriesUid
        ? await routeQueueApi.queueSeries({ ...req, seriesUid })
        : await routeQueueApi.queueStudy({ ...req, studyUid: targetStudyUid! });

      if (res.success) {
        toast.success(`Queued to ${destName}`);
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error(res.message || 'Failed to queue');
      }
    } catch {
      toast.error('Failed to queue');
    } finally {
      setSaving(false);
    }
  }

  const title = mode === 'series' ? 'Route Series' : mode === 'picker' ? 'Queue Study for Routing' : 'Route Study';
  const description = mode === 'picker'
    ? 'Search for a study, then select a destination to add it to the routing queue.'
    : context || 'Add this to the routing queue to send to a PACS destination.';

  const canSubmit = !saving && destId && (mode !== 'picker' || selectedStudy !== null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={mode === 'picker' ? 'sm:max-w-3xl max-h-[85vh] overflow-y-auto' : 'sm:max-w-md'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-4 w-4" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Study picker (mode === 'picker' only) */}
          {mode === 'picker' && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="s-accession" className="text-xs">Accession</Label>
                  <Input id="s-accession" value={searchAccession} className="h-8 text-xs"
                    onChange={(e) => setSearchAccession(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="s-pname" className="text-xs">Patient Name</Label>
                  <Input id="s-pname" value={searchPatientName} className="h-8 text-xs"
                    onChange={(e) => setSearchPatientName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="s-pid" className="text-xs">Patient ID (MRN)</Label>
                  <Input id="s-pid" value={searchPatientId} className="h-8 text-xs"
                    onChange={(e) => setSearchPatientId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                </div>
              </div>
              <Button size="sm" onClick={handleSearch} disabled={searching} className="h-7 text-xs">
                {searching ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Search className="h-3 w-3 mr-1" />}
                Search
              </Button>

              {results.length > 0 && (
                <div className="rounded border bg-card max-h-56 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead className="text-xs">Patient</TableHead>
                        <TableHead className="text-xs">Accession</TableHead>
                        <TableHead className="text-xs">Modality</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map(s => (
                        <TableRow key={s.id}
                          className={`cursor-pointer ${selectedStudy?.id === s.id ? 'bg-primary/10' : ''}`}
                          onClick={() => setSelectedStudy(s)}>
                          <TableCell className="py-2">
                            <input type="radio" checked={selectedStudy?.id === s.id} readOnly
                              className="cursor-pointer" />
                          </TableCell>
                          <TableCell className="py-2 text-xs">
                            <div className="font-medium">{s.lastName}, {s.firstName}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{s.patientId}</div>
                          </TableCell>
                          <TableCell className="py-2 text-xs font-mono">{s.accession || '—'}</TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-[10px] font-mono">{s.modality}</Badge>
                          </TableCell>
                          <TableCell className="py-2 text-xs text-muted-foreground">
                            {new Date(s.studyDate).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* Destination */}
          <div className="space-y-2">
            <Label>Destination *</Label>
            <Select value={destId} onValueChange={setDestId} disabled={loadingDestinations}>
              <SelectTrigger>
                <SelectValue placeholder={loadingDestinations ? 'Loading…' : 'Select destination'} />
              </SelectTrigger>
              <SelectContent>
                {destinations.map(d => (
                  <SelectItem key={d.destinationId} value={d.destinationId.toString()}>
                    {d.name} <span className="text-muted-foreground">({d.aeTitle})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loadingDestinations && destinations.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No active destinations. Add one in the Destinations section first.
              </p>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Normal</SelectItem>
                <SelectItem value="1">High</SelectItem>
                <SelectItem value="2">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Overwrite */}
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={overwrite} onCheckedChange={(c) => setOverwrite(!!c)} />
            <span className="text-sm">Overwrite existing on destination</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'series' ? 'Queue Series' : 'Queue Study'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
