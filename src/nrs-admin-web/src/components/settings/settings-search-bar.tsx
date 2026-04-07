'use client';

import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SettingsSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  matchCount: number;
  totalCount: number;
}

export function SettingsSearchBar({ value, onChange, matchCount, totalCount }: SettingsSearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search all settings by name or value..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-24 h-10"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange('')}
            className="h-6 w-6 p-0"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {value ? `${matchCount} of ${totalCount}` : `${totalCount} settings`}
        </span>
      </div>
    </div>
  );
}
