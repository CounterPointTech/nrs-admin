'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi } from '@/lib/api';
import type { UnifiedSetting } from '@/lib/types';
import { SOURCE_BADGE_CLASSES } from '@/lib/settings-categories';

interface SettingRowProps {
  setting: UnifiedSetting;
  searchQuery?: string;
  onUpdated: () => void;
}

function HighlightText({ text, query }: { text: string; query?: string }) {
  if (!query || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-300/40 dark:bg-yellow-500/30 text-inherit rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function SettingRow({ setting, searchQuery, onUpdated }: SettingRowProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setEditValue(setting.value || '');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditValue('');
  };

  const saveEdit = async () => {
    setSaving(true);
    const result = await settingsApi.updateUnified(setting.source, setting.name, editValue || undefined);
    if (result.success) {
      toast.success(`Updated "${setting.name}"`);
      setEditing(false);
      onUpdated();
    } else {
      toast.error(result.message || 'Failed to update setting');
    }
    setSaving(false);
  };

  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
      {/* Name */}
      <div className="min-w-0 flex-1">
        <span className="font-mono text-xs font-medium">
          <HighlightText text={setting.name} query={searchQuery} />
        </span>
      </div>

      {/* Source badge */}
      <Badge variant="outline" className={`shrink-0 text-[10px] font-medium px-1.5 py-0 ${SOURCE_BADGE_CLASSES[setting.source]}`}>
        {setting.sourceLabel}
      </Badge>

      {/* Default badge */}
      {setting.usingDefault && (
        <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 border-dashed">
          Default
        </Badge>
      )}

      {/* Value / Edit */}
      <div className="w-[280px] shrink-0">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-7 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={saveEdit}
              disabled={saving}
              className="h-7 w-7 p-0 shrink-0"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3 text-green-500" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelEdit}
              className="h-7 w-7 p-0 shrink-0"
            >
              <X className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground truncate block flex-1">
              <HighlightText text={setting.value || ''} query={searchQuery} />
              {!setting.value && (
                <span className="italic text-muted-foreground/40">empty</span>
              )}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={startEdit}
              className="h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
