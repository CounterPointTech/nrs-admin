'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ExternalTool, ExternalToolType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { MoreVertical, Pencil, Trash2, Play, ExternalLink, Loader2 } from 'lucide-react';
import { ToolIcon } from './icon-picker';

interface ToolCardProps {
  tool: ExternalTool;
  onLaunch: (tool: ExternalTool) => void;
  onEdit: (tool: ExternalTool) => void;
  onDelete: (tool: ExternalTool) => void;
  launching?: boolean;
}

const TYPE_LABEL: Record<ExternalToolType, string> = {
  Url: 'Web',
  Executable: 'App',
  Command: 'Command',
  FileOrFolder: 'File',
};

const TYPE_VARIANT: Record<ExternalToolType, 'default' | 'secondary' | 'outline'> = {
  Url: 'default',
  Executable: 'secondary',
  Command: 'outline',
  FileOrFolder: 'outline',
};

export function ToolCard({ tool, onLaunch, onEdit, onDelete, launching }: ToolCardProps) {
  const isUrl = tool.type === 'Url';

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4',
        'transition-all hover:border-primary/40 hover:shadow-md'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
          <ToolIcon iconName={tool.iconName} type={tool.type} className="h-5 w-5 text-primary" />
        </div>
        <div className="flex items-center gap-1">
          <Badge variant={TYPE_VARIANT[tool.type]} className="text-[10px] uppercase tracking-wide">
            {TYPE_LABEL[tool.type]}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(tool)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(tool)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="min-h-[3rem] space-y-1">
        <h3 className="font-semibold leading-tight">{tool.name}</h3>
        {tool.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{tool.description}</p>
        )}
      </div>

      <div className="truncate font-mono text-[11px] text-muted-foreground" title={tool.target}>
        {tool.target}
      </div>

      <Button
        onClick={() => onLaunch(tool)}
        disabled={launching}
        size="sm"
        className="w-full gap-2"
      >
        {launching ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isUrl ? (
          <ExternalLink className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        {isUrl ? 'Open' : 'Launch'}
      </Button>
    </div>
  );
}
