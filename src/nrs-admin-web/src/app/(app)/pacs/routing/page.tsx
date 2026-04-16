'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { RoutingProvider, useRoutingContext } from '@/components/routing/routing-context';
import { RoutingPanelLayout } from '@/components/routing/routing-panel-layout';
import { Radio, RefreshCw } from 'lucide-react';

function RoutingPageContent() {
  const { reloadAll, summaryLoading } = useRoutingContext();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Routing"
          description="Manage PACS destinations, routing zones, and monitor the route queue."
          icon={Radio}
        />
        <Button variant="outline" size="sm" onClick={reloadAll} disabled={summaryLoading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${summaryLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      <RoutingPanelLayout />
    </div>
  );
}

export default function RoutingPage() {
  return (
    <RoutingProvider>
      <RoutingPageContent />
    </RoutingProvider>
  );
}
