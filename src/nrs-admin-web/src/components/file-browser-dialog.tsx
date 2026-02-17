'use client';

import { useState, useEffect, useCallback } from 'react';
import { connectionApi } from '@/lib/api';
import { BrowseEntry } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Folder, File, ChevronUp, Loader2, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileBrowserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (path: string) => void;
  type?: 'file' | 'directory';
  title?: string;
}

export function FileBrowserDialog({
  open,
  onOpenChange,
  onSelect,
  type = 'file',
  title = 'Browse',
}: FileBrowserDialogProps) {
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<BrowseEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadPath = useCallback(async (path?: string) => {
    setLoading(true);
    setError('');
    setSelectedPath(null);

    const result = await connectionApi.browse(path || undefined, type);

    if (result.success && result.data) {
      setCurrentPath(result.data.currentPath);
      setParentPath(result.data.parent ?? null);
      setEntries(result.data.entries);
    } else {
      setError(result.message || 'Failed to browse directory');
    }

    setLoading(false);
  }, [type]);

  useEffect(() => {
    if (open) {
      loadPath();
    }
  }, [open, loadPath]);

  const handleEntryClick = (entry: BrowseEntry) => {
    if (entry.isDirectory) {
      loadPath(entry.path);
    } else {
      setSelectedPath(entry.path);
    }
  };

  const handleEntryDoubleClick = (entry: BrowseEntry) => {
    if (entry.isDirectory && type === 'directory') {
      // Double-click a directory when browsing for directories = select it
      onSelect(entry.path);
      onOpenChange(false);
    } else if (!entry.isDirectory) {
      onSelect(entry.path);
      onOpenChange(false);
    }
  };

  const handleSelectCurrent = () => {
    if (type === 'directory' && currentPath) {
      onSelect(currentPath);
      onOpenChange(false);
    } else if (selectedPath) {
      onSelect(selectedPath);
      onOpenChange(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {currentPath && (
            <p className="text-xs text-muted-foreground font-mono truncate mt-1">
              {currentPath}
            </p>
          )}
        </DialogHeader>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPath()}
            className="gap-1.5 shrink-0"
          >
            <HardDrive className="h-3.5 w-3.5" />
            Drives
          </Button>
          {parentPath !== null && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPath(parentPath || undefined)}
              className="gap-1.5 shrink-0"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              Up
            </Button>
          )}
        </div>

        {/* Entries */}
        <ScrollArea className="h-[300px] rounded-md border">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-sm text-destructive">{error}</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Empty directory</div>
          ) : (
            <div className="p-1">
              {entries.map((entry) => (
                <button
                  key={entry.path}
                  onClick={() => handleEntryClick(entry)}
                  onDoubleClick={() => handleEntryDoubleClick(entry)}
                  className={cn(
                    'flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-sm text-left transition-colors',
                    selectedPath === entry.path
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted/50'
                  )}
                >
                  {entry.isDirectory ? (
                    <Folder className="h-4 w-4 text-primary/70 shrink-0" />
                  ) : (
                    <File className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="truncate flex-1 font-mono text-xs">{entry.name}</span>
                  {!entry.isDirectory && entry.size != null && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatSize(entry.size)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSelectCurrent}
            disabled={type === 'file' ? !selectedPath : !currentPath}
          >
            {type === 'directory' ? 'Select Folder' : 'Select File'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
