'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { settingsApi } from '@/lib/api';
import { SharedSetting, SiteSetting } from '@/lib/types';
import {
  Settings,
  Search,
  Loader2,
  Check,
  X,
  Pencil,
  Database,
  Server,
} from 'lucide-react';
import { toast } from 'sonner';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============== Shared Settings Tab ==============
function SharedSettingsTab() {
  const [settings, setSettings] = useState<SharedSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    const result = await settingsApi.getShared(search || undefined);
    if (result.success && result.data) {
      setSettings(result.data);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(loadSettings, 300);
    return () => clearTimeout(timeout);
  }, [loadSettings]);

  const startEdit = (setting: SharedSetting) => {
    setEditingName(setting.name);
    setEditValue(setting.value || '');
  };

  const cancelEdit = () => {
    setEditingName(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingName) return;
    setSaving(true);
    const result = await settingsApi.updateShared(editingName, editValue || undefined);
    if (result.success) {
      toast.success(`Setting "${editingName}" updated`);
      setEditingName(null);
      setEditValue('');
      loadSettings();
    } else {
      toast.error(result.message || 'Failed to update setting');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search settings by name or value..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : settings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? 'No settings match your search' : 'No shared settings found'}
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium py-2.5 px-4">Name</th>
                <th className="text-left font-medium py-2.5 px-4">Value</th>
                <th className="text-left font-medium py-2.5 px-4 hidden lg:table-cell">Default</th>
                <th className="text-left font-medium py-2.5 px-4 hidden md:table-cell">Updated</th>
                <th className="text-right font-medium py-2.5 px-4 w-20">Edit</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((setting) => (
                <tr
                  key={setting.settingId}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-2.5 px-4 font-mono text-xs font-medium">
                    {setting.name}
                  </td>
                  <td className="py-2.5 px-4 max-w-[300px]">
                    {editingName === setting.name ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={saveEdit}
                          disabled={saving}
                          className="h-8 w-8 p-0 shrink-0"
                        >
                          {saving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEdit}
                          className="h-8 w-8 p-0 shrink-0"
                        >
                          <X className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground truncate block">
                        {setting.value || <span className="italic text-muted-foreground/50">empty</span>}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 hidden lg:table-cell">
                    {setting.usingDefault && (
                      <Badge variant="outline" className="text-xs">Default</Badge>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-muted-foreground text-xs hidden md:table-cell">
                    {formatDate(setting.lastUpdateDate)}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {editingName !== setting.name && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(setting)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {settings.length} setting{settings.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

// ============== Site Settings Tab ==============
function SiteSettingsTab() {
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    const result = await settingsApi.getSite(search || undefined);
    if (result.success && result.data) {
      setSettings(result.data);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(loadSettings, 300);
    return () => clearTimeout(timeout);
  }, [loadSettings]);

  const startEdit = (setting: SiteSetting) => {
    setEditingName(setting.name);
    setEditValue(setting.value || '');
  };

  const cancelEdit = () => {
    setEditingName(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingName) return;
    setSaving(true);
    const result = await settingsApi.updateSite(editingName, editValue || undefined);
    if (result.success) {
      toast.success(`Setting "${editingName}" updated`);
      setEditingName(null);
      setEditValue('');
      loadSettings();
    } else {
      toast.error(result.message || 'Failed to update setting');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search settings by name or value..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : settings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? 'No settings match your search' : 'No site settings found'}
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium py-2.5 px-4">Name</th>
                <th className="text-left font-medium py-2.5 px-4">Value</th>
                <th className="text-left font-medium py-2.5 px-4 hidden md:table-cell">Updated</th>
                <th className="text-right font-medium py-2.5 px-4 w-20">Edit</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((setting) => (
                <tr
                  key={setting.settingId}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-2.5 px-4 font-mono text-xs font-medium">
                    {setting.name}
                  </td>
                  <td className="py-2.5 px-4 max-w-[300px]">
                    {editingName === setting.name ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={saveEdit}
                          disabled={saving}
                          className="h-8 w-8 p-0 shrink-0"
                        >
                          {saving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEdit}
                          className="h-8 w-8 p-0 shrink-0"
                        >
                          <X className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground truncate block">
                        {setting.value || <span className="italic text-muted-foreground/50">empty</span>}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-muted-foreground text-xs hidden md:table-cell">
                    {formatDate(setting.lastUpdateDate)}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {editingName !== setting.name && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(setting)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {settings.length} setting{settings.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

// ============== Main Settings Page ==============
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="System configuration and preferences"
        icon={Settings}
      />

      <Tabs defaultValue="shared">
        <TabsList>
          <TabsTrigger value="shared" className="gap-2">
            <Database className="h-4 w-4" />
            Shared Settings
          </TabsTrigger>
          <TabsTrigger value="site" className="gap-2">
            <Server className="h-4 w-4" />
            Site Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shared" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shared Settings</CardTitle>
              <p className="text-sm text-muted-foreground">
                Cross-system settings from the shared schema. These affect all Novarad products.
              </p>
            </CardHeader>
            <CardContent>
              <SharedSettingsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="site" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Site Settings</CardTitle>
              <p className="text-sm text-muted-foreground">
                Site-level settings for this installation. These are specific to this server.
              </p>
            </CardHeader>
            <CardContent>
              <SiteSettingsTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
