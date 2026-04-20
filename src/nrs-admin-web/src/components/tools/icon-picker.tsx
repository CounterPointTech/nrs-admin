'use client';

import { createElement, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ExternalToolType } from '@/lib/types';
import {
  Activity,
  AppWindow,
  Archive,
  Beaker,
  Bell,
  BookOpen,
  Briefcase,
  Bug,
  Calculator,
  Calendar,
  Camera,
  ChartBar,
  ChartLine,
  Clipboard,
  Cloud,
  Code,
  Cog,
  Database,
  FileCode,
  FileText,
  Files,
  Film,
  Flame,
  Folder,
  Gauge,
  Globe,
  HardDrive,
  Hash,
  Headphones,
  Heart,
  ImageIcon,
  Key,
  Laptop,
  LayoutDashboard,
  Link as LinkIcon,
  Lock,
  Mail,
  Map,
  Maximize,
  MessageSquare,
  Monitor,
  Network,
  Newspaper,
  Package,
  PaintBucket,
  Pencil,
  Phone,
  PieChart,
  Power,
  Printer,
  Radio,
  Save,
  Search,
  Send,
  Server,
  Settings,
  Shield,
  ShoppingCart,
  Sparkles,
  Star,
  Stethoscope,
  Terminal,
  TestTube,
  Ticket,
  Trash,
  Upload,
  User,
  Users,
  Video,
  Wallet,
  Wand,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';

// Curated icon set — name -> component. Names match Lucide identifiers.
export const ICON_MAP: Record<string, LucideIcon> = {
  Activity, AppWindow, Archive, Beaker, Bell, BookOpen, Briefcase, Bug,
  Calculator, Calendar, Camera, ChartBar, ChartLine, Clipboard, Cloud, Code, Cog,
  Database, FileCode, FileText, Files, Film, Flame, Folder,
  Gauge, Globe, HardDrive, Hash, Headphones, Heart,
  Image: ImageIcon, Key, Laptop, LayoutDashboard, Link: LinkIcon, Lock,
  Mail, Map, Maximize, MessageSquare, Monitor, Network, Newspaper,
  Package, PaintBucket, Pencil, Phone, PieChart, Power, Printer,
  Radio, Save, Search, Send, Server, Settings, Shield, ShoppingCart, Sparkles, Star, Stethoscope,
  Terminal, TestTube, Ticket, Trash,
  Upload, User, Users, Video, Wallet, Wand, Wifi, Wrench, Zap,
};

const TYPE_DEFAULT_ICON: Record<ExternalToolType, LucideIcon> = {
  Url: Globe,
  Executable: AppWindow,
  Command: Terminal,
  FileOrFolder: Folder,
};

function resolveToolIcon(iconName: string | undefined | null, type: ExternalToolType): LucideIcon {
  if (iconName && ICON_MAP[iconName]) return ICON_MAP[iconName];
  return TYPE_DEFAULT_ICON[type];
}

/**
 * Renders the icon associated with a tool. Looks up by `iconName`, falling
 * back to a type-specific default. Encapsulating the lookup in a component
 * keeps the icon reference out of render-scope (avoids react-hooks/static-components).
 */
export function ToolIcon({
  iconName,
  type,
  className,
}: {
  iconName?: string | null;
  type: ExternalToolType;
  className?: string;
}) {
  return createElement(resolveToolIcon(iconName, type), { className });
}

interface IconPickerProps {
  value?: string | null;
  onChange: (iconName: string | undefined) => void;
  type: ExternalToolType;
}

export function IconPicker({ value, onChange, type }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const entries = Object.entries(ICON_MAP);
  const filtered = filter
    ? entries.filter(([name]) => name.toLowerCase().includes(filter.toLowerCase()))
    : entries;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          title="Pick an icon"
        >
          <ToolIcon iconName={value} type={type} className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search icons..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-8"
            />
            {value && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                Reset
              </Button>
            )}
          </div>
          <ScrollArea className="h-64">
            <div className="grid grid-cols-8 gap-1 p-1">
              {filtered.map(([name, Icon]) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                  }}
                  title={name}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded hover:bg-accent',
                    value === name && 'bg-primary/20 ring-1 ring-primary'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
