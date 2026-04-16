'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RoutingPaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function RoutingPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
}: RoutingPaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between pt-2">
      <span className="text-xs text-muted-foreground">
        {start}–{end} of {totalCount.toLocaleString()}
      </span>
      <div className="flex gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7"
          disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="flex items-center px-2 text-xs tabular-nums">
          {page} / {totalPages}
        </span>
        <Button variant="outline" size="icon" className="h-7 w-7"
          disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
