'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileSearch,
  Monitor,
  FileCode2,
  Activity,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Moon,
  Sun,
  Shield,
  Radio,
  HardDrive,
  DollarSign,
  Stethoscope,
  Receipt,
  FileText,
  Wrench,
  Rocket,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth-context';
import { useMemo, useState } from 'react';
import { useTheme } from 'next-themes';

// ---------- Nav tree definition ----------

interface NavNode {
  title: string;
  icon: LucideIcon;
  /** Leaf nodes have an href. Branch nodes have children. Either / or. */
  href?: string;
  children?: NavNode[];
  /** Whether a branch defaults to expanded on first load (before localStorage override). */
  defaultExpanded?: boolean;
}

const NAV_TREE: NavNode[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    title: 'PACS',
    icon: HardDrive,
    children: [
      { title: 'Studies', href: '/studies', icon: FileSearch },
      { title: 'Routing', href: '/pacs/routing', icon: Radio },
      { title: 'Novarad Settings', href: '/settings', icon: Settings },
    ],
  },
  {
    title: 'RIS',
    icon: Stethoscope,
    children: [
      {
        title: 'Modalities',
        icon: Monitor,
        children: [
          { title: 'List', href: '/modalities', icon: Monitor },
          { title: 'Mapping Editor', href: '/modalities/mapping', icon: FileCode2 },
          { title: 'AE Monitoring', href: '/modalities/monitoring', icon: Activity },
        ],
      },
      {
        title: 'Reports',
        icon: FileText,
        children: [
          { title: 'Templates', href: '/reports/templates', icon: FileText },
        ],
      },
      {
        title: 'Billing',
        icon: Receipt,
        children: [
          { title: 'CPT Codes', href: '/billing/cpt-codes', icon: DollarSign },
          { title: 'ICD Codes', href: '/billing/icd-codes', icon: Stethoscope },
        ],
      },
      { title: 'Novarad Settings', href: '/settings', icon: Settings },
    ],
  },
  {
    title: 'External Tools',
    icon: Rocket,
    children: [
      { title: 'My Tools', href: '/tools', icon: Rocket },
    ],
  },
  {
    title: 'System',
    icon: Wrench,
    children: [
      { title: 'Configuration', href: '/configuration', icon: Wrench },
    ],
  },
];

// ---------- Helpers ----------

function flattenLeaves(nodes: NavNode[]): NavNode[] {
  const out: NavNode[] = [];
  const walk = (ns: NavNode[]) => {
    for (const n of ns) {
      if (n.children) walk(n.children);
      else if (n.href) out.push(n);
    }
  };
  walk(nodes);
  return out;
}

function isRouteActive(pathname: string, href: string | undefined): boolean {
  if (!href) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function branchContainsActive(node: NavNode, pathname: string): boolean {
  if (!node.children) return false;
  return node.children.some((child) =>
    child.href ? isRouteActive(pathname, child.href) : branchContainsActive(child, pathname)
  );
}

// ---------- Components ----------

interface NavSidebarProps {
  className?: string;
}

export function NavSidebar({ className }: NavSidebarProps) {
  const pathname = usePathname();
  const { user, logout, connectionReady } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem('nav-tree-expanded');
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });
  const { theme, setTheme } = useTheme();

  const toggleExpanded = (path: string) => {
    setExpanded((prev) => {
      const wasOpen = isExpanded(path, prev);
      const next = { ...prev, [path]: !wasOpen };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('nav-tree-expanded', JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  const isExpanded = (path: string, state: Record<string, boolean> = expanded): boolean => {
    // User's explicit toggle always wins — even against auto-expand.
    if (path in state) return state[path];

    const node = findNode(NAV_TREE, path);
    if (!node) return false;

    // First time (no explicit state): auto-expand if this branch contains the
    // active route, or if the node is marked defaultExpanded.
    if (branchContainsActive(node, pathname)) return true;
    return node.defaultExpanded ?? false;
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const leaves = useMemo(() => flattenLeaves(NAV_TREE), []);

  return (
    <TooltipProvider>
      <div
        className={cn(
          'relative flex flex-col border-r bg-sidebar transition-all duration-300 ease-out',
          collapsed ? 'w-16' : 'w-64',
          className
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

        {/* Header */}
        <div className="relative flex h-16 items-center justify-between border-b px-4">
          {!collapsed && (
            <div className="flex items-center gap-3 animate-fade-in">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
                <span className="absolute inset-0 rounded-lg bg-primary/20 animate-pulse-glow" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight gradient-text flex items-center gap-2">
                  NRS Admin
                  <span
                    className={cn(
                      'inline-block h-2 w-2 rounded-full flex-shrink-0',
                      connectionReady ? 'bg-green-500' : 'bg-red-500'
                    )}
                    title={connectionReady ? 'Connected' : 'Disconnected'}
                  />
                </span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Novarad Tools
                </span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'h-8 w-8 transition-all duration-200 hover:bg-accent',
              collapsed && 'absolute -right-3 top-1/2 -translate-y-1/2 z-10 bg-background border shadow-md'
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          {collapsed ? (
            <div className="flex flex-col gap-1">
              {leaves.map((leaf) => (
                <CollapsedLeaf key={leaf.href} node={leaf} pathname={pathname} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {NAV_TREE.map((node) => (
                <NavNodeView
                  key={node.title}
                  node={node}
                  path={node.title}
                  depth={0}
                  pathname={pathname}
                  expanded={expanded}
                  onToggle={toggleExpanded}
                  isExpanded={isExpanded}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* User section */}
        <div className="relative border-t p-4">
          {user && (
            <div
              className={cn(
                'flex items-center gap-3 transition-all duration-200',
                collapsed && 'justify-center'
              )}
            >
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-2 ring-primary/20 flex-shrink-0">
                <span className="text-sm font-semibold text-primary">
                  {user.displayName?.[0]?.toUpperCase() || user.username[0].toUpperCase()}
                </span>
              </div>
              {!collapsed && (
                <div className="flex-1 overflow-hidden animate-fade-in">
                  <p className="text-sm font-medium truncate">
                    {user.displayName || user.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate capitalize">
                    {user.roles?.[0] || 'User'}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleTheme}
                      className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors duration-200"
                    >
                      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side={collapsed ? 'right' : 'top'}>
                    {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                  </TooltipContent>
                </Tooltip>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={logout}
                      className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-200"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side={collapsed ? 'right' : 'top'}>
                    Sign out
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ---------- Subcomponents ----------

function findNode(nodes: NavNode[], path: string): NavNode | null {
  const parts = path.split('/');
  let current: NavNode | undefined = nodes.find((n) => n.title === parts[0]);
  for (let i = 1; i < parts.length && current; i++) {
    current = current.children?.find((n) => n.title === parts[i]);
  }
  return current ?? null;
}

interface NavNodeViewProps {
  node: NavNode;
  path: string;
  depth: number;
  pathname: string;
  expanded: Record<string, boolean>;
  onToggle: (path: string) => void;
  isExpanded: (path: string, state?: Record<string, boolean>) => boolean;
}

function NavNodeView({ node, path, depth, pathname, expanded, onToggle, isExpanded }: NavNodeViewProps) {
  // Leaf node → direct link
  if (!node.children) {
    const active = isRouteActive(pathname, node.href);
    return <NavLeaf node={node} depth={depth} active={active} />;
  }

  // Branch node → button + optional child block
  const containsActive = branchContainsActive(node, pathname);
  const open = isExpanded(path);
  const Icon = node.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(path)}
        className={cn(
          'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
          containsActive
            ? 'text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
        style={{ paddingLeft: depth === 0 ? undefined : `${0.75 + depth * 0.75}rem` }}
      >
        <Icon
          className={cn(
            'h-4 w-4 flex-shrink-0 transition-transform duration-200',
            !containsActive && 'group-hover:scale-110',
            containsActive && 'text-primary'
          )}
        />
        <span className="flex-1 text-left">{node.title}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground/60 transition-transform duration-200',
            !open && '-rotate-90'
          )}
        />
      </button>
      {open && (
        <div
          className={cn(
            'flex flex-col gap-1 mt-1',
            depth === 0 ? 'ml-4 border-l border-border/50 pl-2' : 'ml-3 border-l border-border/40 pl-2'
          )}
        >
          {node.children.map((child) => (
            <NavNodeView
              key={child.title}
              node={child}
              path={`${path}/${child.title}`}
              depth={depth + 1}
              pathname={pathname}
              expanded={expanded}
              onToggle={onToggle}
              isExpanded={isExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NavLeaf({ node, depth, active }: { node: NavNode; depth: number; active: boolean }) {
  const Icon = node.icon;
  return (
    <Link
      href={node.href!}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
      style={{ paddingLeft: depth === 0 ? undefined : `${0.75 + depth * 0.25}rem` }}
    >
      <span
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-primary transition-all duration-200',
          active ? 'h-6 opacity-100' : 'h-0 opacity-0 group-hover:h-4 group-hover:opacity-50'
        )}
      />
      <Icon
        className={cn(
          'h-4 w-4 flex-shrink-0 transition-transform duration-200',
          active && 'text-primary',
          !active && 'group-hover:scale-110'
        )}
      />
      <span className="transition-opacity duration-200">{node.title}</span>
    </Link>
  );
}

function CollapsedLeaf({ node, pathname }: { node: NavNode; pathname: string }) {
  const Icon = node.icon;
  const active = isRouteActive(pathname, node.href);
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Link
          href={node.href!}
          className={cn(
            'group relative flex items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
            active
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <span
            className={cn(
              'absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-primary transition-all duration-200',
              active ? 'h-6 opacity-100' : 'h-0 opacity-0 group-hover:h-4 group-hover:opacity-50'
            )}
          />
          <Icon
            className={cn(
              'h-4 w-4 flex-shrink-0 transition-transform duration-200',
              active && 'text-primary',
              !active && 'group-hover:scale-110'
            )}
          />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="font-medium">
        {node.title}
      </TooltipContent>
    </Tooltip>
  );
}
