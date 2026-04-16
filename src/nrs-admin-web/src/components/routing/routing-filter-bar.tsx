'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PacsDestination } from '@/lib/types';
import { Search, X } from 'lucide-react';

interface RoutingFilterBarProps {
  destinations: PacsDestination[];
  destinationId: number | undefined;
  patientSearch: string;
  onDestinationChange: (id: number | undefined) => void;
  onPatientSearchChange: (val: string) => void;
  onClear: () => void;
}

export function RoutingFilterBar({
  destinations,
  destinationId,
  patientSearch,
  onDestinationChange,
  onPatientSearchChange,
  onClear,
}: RoutingFilterBarProps) {
  const hasFilters = destinationId !== undefined || patientSearch !== '';

  return (
    <div className="flex items-center gap-2">
      <Select
        value={destinationId?.toString() ?? 'all'}
        onValueChange={(val) => onDestinationChange(val === 'all' ? undefined : parseInt(val))}
      >
        <SelectTrigger className="w-48 h-8 text-xs">
          <SelectValue placeholder="All Destinations" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Destinations</SelectItem>
          {destinations.map(d => (
            <SelectItem key={d.destinationId} value={d.destinationId.toString()}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Patient name..."
          value={patientSearch}
          onChange={(e) => onPatientSearchChange(e.target.value)}
          className="pl-7 h-8 w-44 text-xs"
        />
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onClear}>
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
