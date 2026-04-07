'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { settingsApi } from '@/lib/api';
import type { UnifiedSetting } from '@/lib/types';
import { categorizeAll, type CategorizedSettings } from '@/lib/settings-categories';
import { SettingsSearchBar } from '@/components/settings/settings-search-bar';
import { SettingsCategorySidebar } from '@/components/settings/settings-category-sidebar';
import { SettingsCategoryGroup } from '@/components/settings/settings-category-group';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Settings } from 'lucide-react';

function SettingsSkeleton() {
  return (
    <div className="flex gap-6">
      {/* Sidebar skeleton */}
      <div className="hidden lg:block w-56 shrink-0 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
      {/* Content skeleton */}
      <div className="flex-1 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-64 bg-muted/60 rounded animate-pulse" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {Array.from({ length: 3 + i }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 px-4 py-2.5 border-t border-border/30">
                  <div className="h-3.5 w-40 bg-muted/60 rounded animate-pulse" />
                  <div className="h-4 w-14 bg-muted/40 rounded-full animate-pulse" />
                  <div className="flex-1" />
                  <div className="h-3.5 w-24 bg-muted/40 rounded animate-pulse" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [allSettings, setAllSettings] = useState<UnifiedSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    const result = await settingsApi.getAll();
    if (result.success && result.data) {
      setAllSettings(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Filter by search
  const filteredSettings = useMemo(() => {
    if (!search.trim()) return allSettings;
    const q = search.toLowerCase();
    return allSettings.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.value && s.value.toLowerCase().includes(q))
    );
  }, [allSettings, search]);

  // Categorize
  const groups: CategorizedSettings[] = useMemo(() => {
    return categorizeAll(filteredSettings);
  }, [filteredSettings]);

  // Filter by active category
  const visibleGroups = useMemo(() => {
    if (activeCategory === null) return groups;
    return groups.filter((g) => g.category.id === activeCategory);
  }, [groups, activeCategory]);

  const handleCategoryClick = (categoryId: string | null) => {
    setActiveCategory(categoryId);
    if (categoryId) {
      const el = document.getElementById(`category-${categoryId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const totalDbSettings = allSettings.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Novarad system settings from shared, site, PACS, RIS, and object store tables"
        icon={Settings}
      />

      {/* Search bar */}
      <SettingsSearchBar
        value={search}
        onChange={(v) => { setSearch(v); setActiveCategory(null); }}
        matchCount={filteredSettings.length}
        totalCount={totalDbSettings}
      />

      {loading ? (
        <SettingsSkeleton />
      ) : (
        <div className="flex gap-6">
          {/* Sidebar — desktop */}
          <div className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-6">
              <SettingsCategorySidebar
                groups={groups}
                activeCategory={activeCategory}
                totalCount={filteredSettings.length}
                onCategoryClick={handleCategoryClick}
              />
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 min-w-0">
            {/* Mobile category pills */}
            <div className="lg:hidden flex gap-2 flex-wrap mb-4">
              <button
                onClick={() => setActiveCategory(null)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  activeCategory === null
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                All ({filteredSettings.length})
              </button>
              {groups.map((g) => (
                <button
                  key={g.category.id}
                  onClick={() => setActiveCategory(g.category.id)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                    activeCategory === g.category.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {g.category.label} ({g.settings.length})
                </button>
              ))}
            </div>

            {/* Setting groups */}
            <div className="space-y-4">
              {visibleGroups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {search ? 'No settings match your search' : 'No database settings found'}
                </div>
              ) : (
                visibleGroups.map((group) => (
                  <SettingsCategoryGroup
                    key={group.category.id}
                    group={group}
                    searchQuery={search || undefined}
                    onSettingUpdated={loadSettings}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
