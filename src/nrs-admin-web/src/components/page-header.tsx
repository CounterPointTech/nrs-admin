'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: React.ReactNode;
  description?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  children,
  actions,
  className,
}: PageHeaderProps) {
  const actionsContent = actions || children;
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in', className)}>
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actionsContent && <div className="flex items-center gap-3">{actionsContent}</div>}
    </div>
  );
}
