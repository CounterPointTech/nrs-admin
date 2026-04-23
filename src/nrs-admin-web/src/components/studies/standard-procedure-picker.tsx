'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { standardProcedureApi } from '@/lib/api';
import { StandardProcedure } from '@/lib/types';
import { BookMarked, Loader2, ListFilter } from 'lucide-react';

interface Props {
  /** Current procedure's modality type — used as the default filter. */
  modalityType?: string | null;
  /** Called with the selected catalog row. Consumer decides what field(s) to update. */
  onSelect: (procedure: StandardProcedure) => void;
  /** Optional — shown as the disabled state of the trigger (e.g. when no modality is set). */
  disabled?: boolean;
  /** Label on the trigger button. Defaults to "Use Standard Procedure". */
  triggerLabel?: string;
  /**
   * When true, renders the trigger as an icon-only 20px button suitable for tight rows
   * (e.g. the PACS↔RIS sync-field controls). The full label appears as a tooltip.
   */
  compact?: boolean;
}

const PAGE_SIZE = 25;

/**
 * Searchable dropdown of ris.standard_procedures catalog rows. Defaults to filtering by
 * the current procedure's modality (since a CT study is almost never filled from an MR
 * procedure template), with an explicit toggle to widen the search. Narrows as you type.
 */
export function StandardProcedurePicker({ modalityType, onSelect, disabled, triggerLabel, compact }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filterByModality, setFilterByModality] = useState(Boolean(modalityType));
  const [results, setResults] = useState<StandardProcedure[]>([]);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  // Reset toggle whenever the parent-side modality changes (e.g. after a save refresh).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilterByModality(Boolean(modalityType));
  }, [modalityType]);

  // Debounced search — runs while the popover is open.
  useEffect(() => {
    if (!open) return;
    const id = ++requestIdRef.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const timer = setTimeout(async () => {
      const res = await standardProcedureApi.search(1, PAGE_SIZE, {
        search: query.trim() || undefined,
        modalityType: filterByModality && modalityType ? modalityType : undefined,
        sortBy: 'procedureName',
        sortDesc: false,
      });
      if (id !== requestIdRef.current) return;
      if (res.success && res.data) setResults(res.data.items);
      else setResults([]);
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [open, query, filterByModality, modalityType]);

  const canFilterByModality = Boolean(modalityType);
  const label = triggerLabel ?? 'Use Standard Procedure';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {compact ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            className="h-5 w-5 p-0"
            title={label}
          >
            <BookMarked className="h-3 w-3" />
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            className="h-7 gap-1.5 text-xs"
            title={label}
          >
            <BookMarked className="h-3.5 w-3.5" />
            {label}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[380px]" align="end">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search procedure name..."
            value={query}
            onValueChange={setQuery}
          />
          {canFilterByModality && (
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
              <Label
                htmlFor="sp-picker-modality-filter"
                className="flex items-center gap-1.5 text-[11px] font-medium cursor-pointer"
              >
                <ListFilter className="h-3 w-3" />
                Match modality
                <Badge variant="outline" className="font-mono text-[10px] px-1 py-0 h-4">
                  {modalityType}
                </Badge>
              </Label>
              <Switch
                id="sp-picker-modality-filter"
                checked={filterByModality}
                onCheckedChange={setFilterByModality}
              />
            </div>
          )}
          <CommandList className="max-h-[320px]">
            {loading && (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Searching catalog...
              </div>
            )}
            {!loading && results.length === 0 && (
              <CommandEmpty>
                {filterByModality && modalityType
                  ? `No ${modalityType} procedures match.`
                  : 'No standard procedures match.'}
              </CommandEmpty>
            )}
            {!loading &&
              results.map((p) => (
                <CommandItem
                  key={p.standardProcedureId}
                  value={String(p.standardProcedureId)}
                  onSelect={() => {
                    onSelect(p);
                    setOpen(false);
                  }}
                  className="flex items-start gap-2 py-2"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate text-sm font-medium">{p.procedureName}</span>
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                      <Badge variant="outline" className="font-mono text-[10px] px-1 py-0 h-4">
                        {p.modalityTypeId}
                      </Badge>
                      {p.anatomicalAreaName && <span>{p.anatomicalAreaName}</span>}
                      {p.requiredTime > 0 && <span>· {p.requiredTime} min</span>}
                    </span>
                  </div>
                </CommandItem>
              ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
