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
  Network,
  MapPin,
  Send,
  GitBranch,
  Forward,
  Radio,
  Waypoints,
  HardDrive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';
import { useTheme } from 'next-themes';

const dashboardNavItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
];

const pacsNavItems = [
  { title: 'Studies', href: '/studies', icon: FileSearch },
  { title: 'Destinations', href: '/pacs/destinations', icon: Radio },
  { title: 'Routing Zones', href: '/pacs/routing-zones', icon: Waypoints },
];

const hl7NavItems = [
  { title: 'Locations', href: '/hl7/locations', icon: MapPin },
  { title: 'Destinations', href: '/hl7/destinations', icon: Send },
  { title: 'Field Mapping', href: '/hl7/field-mapping', icon: GitBranch },
  { title: 'Forwarding', href: '/hl7/forwarding', icon: Forward },
];

const risModalityItems = [
  { title: 'Modality List', href: '/modalities', icon: Monitor },
  { title: 'Mapping Editor', href: '/modalities/mapping', icon: FileCode2 },
  { title: 'AE Monitoring', href: '/modalities/monitoring', icon: Activity },
];

const systemNavItems = [
  { title: 'Settings', href: '/settings', icon: Settings },
];

interface NavSidebarProps {
  className?: string;
}

export function NavSidebar({ className }: NavSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [pacsExpanded, setPacsExpanded] = useState(true);
  const [modalitiesExpanded, setModalitiesExpanded] = useState(true);
  const [hl7Expanded, setHl7Expanded] = useState(true);
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const NavItem = ({
    href,
    icon: Icon,
    title,
  }: {
    href: string;
    icon: React.ElementType;
    title: string;
  }) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);

    const linkContent = (
      <Link
        href={href}
        className={cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
      >
        <span
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-primary transition-all duration-200',
            isActive ? 'h-6 opacity-100' : 'h-0 opacity-0 group-hover:h-4 group-hover:opacity-50'
          )}
        />
        <Icon
          className={cn(
            'h-4 w-4 flex-shrink-0 transition-transform duration-200',
            isActive && 'text-primary',
            !isActive && 'group-hover:scale-110'
          )}
        />
        {!collapsed && (
          <span className="transition-opacity duration-200">{title}</span>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {title}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

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
                <span className="font-bold text-lg tracking-tight gradient-text">
                  NRS Admin
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
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          {/* Dashboard */}
          <div className="flex flex-col gap-1">
            {dashboardNavItems.map((item, index) => (
              <div
                key={item.href}
                className={cn('animate-fade-in', `stagger-${index + 1}`)}
                style={{ opacity: 0 }}
              >
                <NavItem {...item} />
              </div>
            ))}
          </div>

          <Separator className="my-4 bg-border/50" />

          {/* PACS */}
          {!collapsed && (
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 animate-fade-in">
              PACS
            </div>
          )}
          <div className="flex flex-col gap-1">
            {collapsed ? (
              pacsNavItems.map((item, index) => (
                <div
                  key={item.href}
                  className={cn('animate-fade-in', `stagger-${index + 2}`)}
                  style={{ opacity: 0 }}
                >
                  <NavItem {...item} />
                </div>
              ))
            ) : (
              <div className="animate-fade-in stagger-2" style={{ opacity: 0 }}>
                <button
                  onClick={() => setPacsExpanded(!pacsExpanded)}
                  className={cn(
                    'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <HardDrive className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  <span className="flex-1 text-left">PACS</span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      pacsExpanded && 'rotate-180'
                    )}
                  />
                </button>
                {pacsExpanded && (
                  <div className="ml-4 flex flex-col gap-1 border-l border-border/50 pl-2 mt-1">
                    {pacsNavItems.map((item) => (
                      <NavItem key={item.href} {...item} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator className="my-4 bg-border/50" />

          {/* HL7 */}
          {!collapsed && (
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 animate-fade-in">
              HL7
            </div>
          )}
          <div className="flex flex-col gap-1">
            {collapsed ? (
              hl7NavItems.map((item, index) => (
                <div
                  key={item.href}
                  className={cn('animate-fade-in', `stagger-${index + 2}`)}
                  style={{ opacity: 0 }}
                >
                  <NavItem {...item} />
                </div>
              ))
            ) : (
              <div className="animate-fade-in stagger-2" style={{ opacity: 0 }}>
                <button
                  onClick={() => setHl7Expanded(!hl7Expanded)}
                  className={cn(
                    'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Network className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  <span className="flex-1 text-left">HL7 Config</span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      hl7Expanded && 'rotate-180'
                    )}
                  />
                </button>
                {hl7Expanded && (
                  <div className="ml-4 flex flex-col gap-1 border-l border-border/50 pl-2 mt-1">
                    {hl7NavItems.map((item) => (
                      <NavItem key={item.href} {...item} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator className="my-4 bg-border/50" />

          {/* RIS */}
          {!collapsed && (
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 animate-fade-in">
              RIS
            </div>
          )}
          <div className="flex flex-col gap-1">
            {collapsed ? (
              risModalityItems.map((item, index) => (
                <div
                  key={item.href}
                  className={cn('animate-fade-in', `stagger-${index + 3}`)}
                  style={{ opacity: 0 }}
                >
                  <NavItem {...item} />
                </div>
              ))
            ) : (
              <div className="animate-fade-in stagger-3" style={{ opacity: 0 }}>
                <button
                  onClick={() => setModalitiesExpanded(!modalitiesExpanded)}
                  className={cn(
                    'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Monitor className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  <span className="flex-1 text-left">Modalities</span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      modalitiesExpanded && 'rotate-180'
                    )}
                  />
                </button>
                {modalitiesExpanded && (
                  <div className="ml-4 flex flex-col gap-1 border-l border-border/50 pl-2 mt-1">
                    {risModalityItems.map((item) => (
                      <NavItem key={item.href} {...item} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator className="my-4 bg-border/50" />

          {/* System */}
          {!collapsed && (
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 animate-fade-in">
              System
            </div>
          )}
          <div className="flex flex-col gap-1">
            {systemNavItems.map((item, index) => (
              <div
                key={item.href}
                className={cn('animate-fade-in', `stagger-${index + 5}`)}
                style={{ opacity: 0 }}
              >
                <NavItem {...item} />
              </div>
            ))}
          </div>
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
                  {user.displayName?.[0]?.toUpperCase() ||
                    user.username[0].toUpperCase()}
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
                      {theme === 'dark' ? (
                        <Sun className="h-4 w-4" />
                      ) : (
                        <Moon className="h-4 w-4" />
                      )}
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
