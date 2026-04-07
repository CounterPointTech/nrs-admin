import {
  Share2,
  Building2,
  HardDrive,
  Monitor,
  Database,
  SlidersHorizontal,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { UnifiedSetting, SettingSource } from './types';

export interface SettingsCategory {
  id: SettingSource;
  label: string;
  icon: LucideIcon;
  colorClass: string;
  description: string;
}

export const CATEGORIES: SettingsCategory[] = [
  {
    id: 'shared',
    label: 'Shared',
    icon: Share2,
    colorClass: 'text-blue-500',
    description: 'Cross-system settings — facilities, users, HL7, and shared configuration.',
  },
  {
    id: 'site',
    label: 'Site',
    icon: Building2,
    colorClass: 'text-emerald-500',
    description: 'Site administration — backups, locks, maintenance, and site-level settings.',
  },
  {
    id: 'pacs',
    label: 'PACS',
    icon: HardDrive,
    colorClass: 'text-cyan-500',
    description: 'PACS settings — routing, destinations, DICOM labels, and archive operations.',
  },
  {
    id: 'pacs_options',
    label: 'PACS Options',
    icon: SlidersHorizontal,
    colorClass: 'text-teal-500',
    description: 'PACS option flags and feature toggles.',
  },
  {
    id: 'ris',
    label: 'RIS',
    icon: Monitor,
    colorClass: 'text-violet-500',
    description: 'RIS settings — modalities, orders, patients, physicians, and reports.',
  },
  {
    id: 'ris_options',
    label: 'RIS Options',
    icon: Settings,
    colorClass: 'text-pink-500',
    description: 'RIS option flags and feature toggles.',
  },
  {
    id: 'object_store',
    label: 'Object Store',
    icon: Database,
    colorClass: 'text-amber-500',
    description: 'Object store — archive stats, replication, transactions, and storage scopes.',
  },
];

export function getCategoryById(id: string): SettingsCategory | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export interface CategorizedSettings {
  category: SettingsCategory;
  settings: UnifiedSetting[];
}

export function categorizeAll(settings: UnifiedSetting[]): CategorizedSettings[] {
  const map = new Map<SettingSource, UnifiedSetting[]>();

  for (const setting of settings) {
    if (!map.has(setting.source)) map.set(setting.source, []);
    map.get(setting.source)!.push(setting);
  }

  return CATEGORIES
    .map((cat) => ({
      category: cat,
      settings: map.get(cat.id) || [],
    }))
    .filter((group) => group.settings.length > 0);
}

// Source badge colors for the setting rows
export const SOURCE_BADGE_CLASSES: Record<SettingSource, string> = {
  shared: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  site: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  pacs: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  ris: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  object_store: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  pacs_options: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  ris_options: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
};
