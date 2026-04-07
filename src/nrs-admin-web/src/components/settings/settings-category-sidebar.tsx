'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CATEGORIES, type CategorizedSettings } from '@/lib/settings-categories';
import { LayoutGrid } from 'lucide-react';

interface SettingsCategorySidebarProps {
  groups: CategorizedSettings[];
  activeCategory: string | null;
  totalCount: number;
  onCategoryClick: (categoryId: string | null) => void;
}

export function SettingsCategorySidebar({
  groups,
  activeCategory,
  totalCount,
  onCategoryClick,
}: SettingsCategorySidebarProps) {
  const countMap = new Map(groups.map((g) => [g.category.id, g.settings.length]));

  return (
    <nav className="space-y-1">
      {/* All Settings */}
      <button
        onClick={() => onCategoryClick(null)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          activeCategory === null
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <LayoutGrid className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">All Settings</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
          {totalCount}
        </Badge>
      </button>

      <div className="my-2 border-t border-border/50" />

      {/* Category items */}
      {CATEGORIES.map((cat) => {
        const count = countMap.get(cat.id) || 0;
        if (count === 0) return null;
        const Icon = cat.icon;
        const isActive = activeCategory === cat.id;

        return (
          <button
            key={cat.id}
            onClick={() => onCategoryClick(cat.id)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className={cn('h-4 w-4 shrink-0', isActive ? '' : cat.colorClass)} />
            <span className="flex-1 text-left truncate">{cat.label}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
              {count}
            </Badge>
          </button>
        );
      })}
    </nav>
  );
}
