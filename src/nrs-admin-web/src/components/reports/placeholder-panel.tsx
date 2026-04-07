'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TemplatePlaceholder, TemplateSection } from '@/lib/types';
import { Search, ChevronDown, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PlaceholderPanelProps {
  placeholders: TemplatePlaceholder[];
  sections: TemplateSection[];
  onInsertPlaceholder: (tag: string) => void;
  onInsertSection: (startTag: string, endTag: string) => void;
}

export function PlaceholderPanel({
  placeholders,
  sections,
  onInsertPlaceholder,
  onInsertSection,
}: PlaceholderPanelProps) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Patient', 'Procedure', 'Report']));

  const grouped = useMemo(() => {
    const groups: Record<string, TemplatePlaceholder[]> = {};
    const filtered = placeholders.filter(
      (p) =>
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase())
    );
    for (const p of filtered) {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    }
    return groups;
  }, [placeholders, search]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full border-l bg-card">
      <div className="p-3 border-b">
        <h3 className="text-sm font-semibold mb-2">Placeholders</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Section markers */}
          {!search && sections.length > 0 && (
            <div className="mb-2">
              <button
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground rounded"
                onClick={() => toggleCategory('__sections__')}
              >
                <ChevronDown className={cn('h-3 w-3 transition-transform', expandedCategories.has('__sections__') && 'rotate-180')} />
                Sections
                <Badge variant="outline" className="ml-auto text-[10px] h-4">
                  {sections.length}
                </Badge>
              </button>
              {expandedCategories.has('__sections__') && (
                <div className="ml-3 space-y-0.5 mt-0.5">
                  {sections.map((s) => (
                    <button
                      key={s.name}
                      className="w-full text-left px-2 py-1 text-xs rounded hover:bg-accent group"
                      onClick={() => onInsertSection(s.startTag, s.endTag)}
                      title={s.description}
                    >
                      <span className="font-mono text-[11px] text-primary">{s.name}</span>
                      <span className="block text-[10px] text-muted-foreground truncate">{s.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Placeholders grouped by category */}
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <button
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground rounded"
                onClick={() => toggleCategory(category)}
              >
                <ChevronDown className={cn('h-3 w-3 transition-transform', expandedCategories.has(category) && 'rotate-180')} />
                {category}
                <Badge variant="outline" className="ml-auto text-[10px] h-4">
                  {items.length}
                </Badge>
              </button>
              {expandedCategories.has(category) && (
                <div className="ml-3 space-y-0.5 mt-0.5">
                  {items.map((p) => (
                    <button
                      key={p.name}
                      className="w-full text-left px-2 py-1 text-xs rounded hover:bg-accent group flex items-center"
                      onClick={() => onInsertPlaceholder(p.tag)}
                      title={`${p.description}\nSample: ${p.sampleValue}`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-[11px] text-primary">{p.name}</span>
                        <span className="block text-[10px] text-muted-foreground truncate">{p.description}</span>
                      </div>
                      <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0 ml-1" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {Object.keys(grouped).length === 0 && search && (
            <p className="text-xs text-muted-foreground text-center py-4">No placeholders match "{search}"</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
