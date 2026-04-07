'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SettingRow } from './setting-row';
import type { CategorizedSettings } from '@/lib/settings-categories';

interface SettingsCategoryGroupProps {
  group: CategorizedSettings;
  searchQuery?: string;
  onSettingUpdated: () => void;
}

export function SettingsCategoryGroup({ group, searchQuery, onSettingUpdated }: SettingsCategoryGroupProps) {
  const { category, settings } = group;
  const Icon = category.icon;

  return (
    <Card id={`category-${category.id}`} className="scroll-mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-muted ${category.colorClass}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{category.label}</h3>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                {settings.length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {settings.map((setting) => (
            <SettingRow
              key={`${setting.source}:${setting.name}`}
              setting={setting}
              searchQuery={searchQuery}
              onUpdated={onSettingUpdated}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
