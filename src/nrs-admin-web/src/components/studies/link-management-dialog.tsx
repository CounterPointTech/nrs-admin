'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, Search, Link2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { RisOrder, UnifiedStudyDetail } from '@/lib/types';
import { studyApi } from '@/lib/api';

interface LinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: number;
  onDataChange: (data: UnifiedStudyDetail) => void;
}

export function LinkManagementDialog({ open, onOpenChange, studyId, onDataChange }: LinkDialogProps) {
  const [searchAccession, setSearchAccession] = useState('');
  const [searchPatientId, setSearchPatientId] = useState('');
  const [searchPatientName, setSearchPatientName] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<RisOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [linking, setLinking] = useState(false);

  async function handleSearch() {
    if (!searchAccession && !searchPatientId && !searchPatientName) {
      toast.error('Enter at least one search criteria');
      return;
    }

    setSearching(true);
    setResults([]);
    setSelectedOrderId(null);

    try {
      const res = await studyApi.searchRisOrders(studyId, {
        accessionNumber: searchAccession || undefined,
        patientId: searchPatientId || undefined,
        patientName: searchPatientName || undefined,
      });
      if (res.success && res.data) {
        setResults(res.data.items);
        if (res.data.items.length === 0) {
          toast.info('No matching orders found');
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

  async function handleLink() {
    if (!selectedOrderId) return;
    setLinking(true);

    try {
      const res = await studyApi.linkToOrder(studyId, { orderId: selectedOrderId });
      if (res.success && res.data) {
        onDataChange(res.data);
        toast.success('Study linked to order');
        onOpenChange(false);
      } else {
        toast.error(res.message || 'Link failed');
      }
    } catch {
      toast.error('Link failed');
    } finally {
      setLinking(false);
    }
  }

  function handleClose() {
    setResults([]);
    setSelectedOrderId(null);
    setSearchAccession('');
    setSearchPatientId('');
    setSearchPatientName('');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Link Study to RIS Order
          </DialogTitle>
          <DialogDescription>
            Search for a RIS order to link to this PACS study. This will sync the accession number and study UID.
          </DialogDescription>
        </DialogHeader>

        {/* Search Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Accession #</Label>
            <Input
              value={searchAccession}
              onChange={(e) => setSearchAccession(e.target.value)}
              placeholder="Search accession..."
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Patient ID</Label>
            <Input
              value={searchPatientId}
              onChange={(e) => setSearchPatientId(e.target.value)}
              placeholder="Patient ID..."
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Patient Name</Label>
            <Input
              value={searchPatientName}
              onChange={(e) => setSearchPatientName(e.target.value)}
              placeholder="Last or first name..."
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>

        <Button onClick={handleSearch} disabled={searching} className="gap-2">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search Orders
        </Button>

        {/* Results Table */}
        {results.length > 0 && (
          <div className="rounded border max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Accession</TableHead>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((order) => (
                  <TableRow
                    key={order.orderId}
                    className={`cursor-pointer transition-colors ${
                      selectedOrderId === order.orderId
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedOrderId(order.orderId)}
                  >
                    <TableCell>
                      <input
                        type="radio"
                        checked={selectedOrderId === order.orderId}
                        onChange={() => setSelectedOrderId(order.orderId)}
                        className="accent-primary"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{order.orderId}</TableCell>
                    <TableCell className="font-mono text-xs">{order.accessionNumber || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{order.patientId}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{order.status || '—'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-xs truncate">{order.description || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleLink}
            disabled={!selectedOrderId || linking}
            className="gap-2"
          >
            {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Link to Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============== Unlink Confirmation Dialog ==============

interface UnlinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: number;
  onDataChange: (data: UnifiedStudyDetail) => void;
}

export function UnlinkConfirmDialog({ open, onOpenChange, studyId, onDataChange }: UnlinkDialogProps) {
  const [unlinking, setUnlinking] = useState(false);

  async function handleUnlink() {
    setUnlinking(true);
    try {
      const res = await studyApi.unlinkOrder(studyId);
      if (res.success && res.data) {
        onDataChange(res.data);
        toast.success('Study unlinked from RIS');
        onOpenChange(false);
      } else {
        toast.error(res.message || 'Unlink failed');
      }
    } catch {
      toast.error('Unlink failed');
    } finally {
      setUnlinking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> Unlink Study
          </DialogTitle>
          <DialogDescription>
            This will clear the accession number from the PACS study and remove the study UID
            reference from any linked RIS procedures. The RIS order data will not be deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleUnlink} disabled={unlinking} className="gap-2">
            {unlinking && <Loader2 className="h-4 w-4 animate-spin" />}
            Unlink
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
