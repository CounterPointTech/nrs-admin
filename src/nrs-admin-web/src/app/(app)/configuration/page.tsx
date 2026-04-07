'use client';

import { PageHeader } from '@/components/page-header';
import { ConnectionSettingsCard } from '@/components/settings/connection-settings-card';
import { Wrench } from 'lucide-react';

export default function ConfigurationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuration"
        description="NRS Admin application settings — database connection, mapping file, and report template paths"
        icon={Wrench}
      />
      <ConnectionSettingsCard defaultExpanded />
    </div>
  );
}
