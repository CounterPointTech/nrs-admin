'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { physicianApi } from '@/lib/api';
import { Physician } from '@/lib/types';
import { ChevronsUpDown, Check, Loader2, User } from 'lucide-react';

interface PhysicianPickerProps {
  value: number | null | undefined;
  valueDisplayName?: string | null;
  onChange: (physicianId: number | null, displayName: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function PhysicianPicker({
  value,
  valueDisplayName,
  onChange,
  placeholder = 'Select physician...',
  disabled,
  className,
}: PhysicianPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Physician[]>([]);
  const [loading, setLoading] = useState(false);
  const [hydratedName, setHydratedName] = useState<string | null>(null);
  // Keep the last-query token so out-of-order responses don't overwrite newer ones.
  const requestIdRef = useRef(0);

  const selectedName = valueDisplayName ?? hydratedName;

  // Hydrate selected physician's displayName when we only have an id (e.g. initial load).
  useEffect(() => {
    if (!value || valueDisplayName) {
      // Clearing stale hydrated name on value change is a synchronization effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHydratedName(null);
      return;
    }
    let cancelled = false;
    physicianApi.getById(value).then((res) => {
      if (!cancelled && res.success && res.data) setHydratedName(res.data.displayName);
    });
    return () => {
      cancelled = true;
    };
  }, [value, valueDisplayName]);

  // Debounced search whenever popover is open or the query changes.
  useEffect(() => {
    if (!open) return;
    const id = ++requestIdRef.current;
    // Showing the spinner immediately is the intended UX; setState is the right tool.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const timer = setTimeout(async () => {
      const res = await physicianApi.search(query || undefined, 20);
      if (id !== requestIdRef.current) return;
      if (res.success && res.data) setResults(res.data);
      else setResults([]);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [open, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal h-9 text-sm',
            !selectedName && 'text-muted-foreground',
            className
          )}
        >
          <span className="flex items-center gap-2 min-w-0">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{selectedName || placeholder}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search physicians..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Searching...
              </div>
            )}
            {!loading && results.length === 0 && (
              <CommandEmpty>No physicians found.</CommandEmpty>
            )}
            {!loading && value != null && (
              <CommandItem
                value="__clear__"
                onSelect={() => {
                  onChange(null, null);
                  setOpen(false);
                }}
                className="text-muted-foreground italic"
              >
                Clear selection
              </CommandItem>
            )}
            {!loading &&
              results.map((p) => (
                <CommandItem
                  key={p.id}
                  value={String(p.id)}
                  onSelect={() => {
                    onChange(p.id, p.displayName);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-3.5 w-3.5',
                      value === p.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate text-sm">{p.displayName}</span>
                    {(p.specialty || p.npi) && (
                      <span className="truncate text-[11px] text-muted-foreground">
                        {[p.specialty, p.npi && `NPI ${p.npi}`].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
