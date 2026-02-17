'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { settingsApi, connectionApi } from '@/lib/api';
import { SharedSetting, SiteSetting } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { FileBrowserDialog } from '@/components/file-browser-dialog';
import {
  Settings,
  Search,
  Loader2,
  Check,
  X,
  Pencil,
  Database,
  Server,
  Plug,
  FileText,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';

function cleanVersionString(version?: string): string {
  if (!version) return 'PostgreSQL';
  const commaIdx = version.indexOf(',');
  return commaIdx > 0 ? version.substring(0, commaIdx).trim() : version.trim();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============== Connection Settings Tab ==============
function ConnectionSettingsTab() {
  const { recheckConnection } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Database fields
  const [dbHost, setDbHost] = useState('');
  const [dbPort, setDbPort] = useState('5432');
  const [dbName, setDbName] = useState('');
  const [dbUser, setDbUser] = useState('');
  const [dbPassword, setDbPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dbTimeout, setDbTimeout] = useState('30');

  // Mapping file fields
  const [mappingPath, setMappingPath] = useState('');
  const [backupDir, setBackupDir] = useState('');

  // Test states
  const [testingDb, setTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [testingPath, setTestingPath] = useState(false);
  const [pathTestResult, setPathTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Browse dialog
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseTarget, setBrowseTarget] = useState<'mappingPath' | 'backupDir'>('mappingPath');
  const [browseType, setBrowseType] = useState<'file' | 'directory'>('file');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    const result = await connectionApi.getSettings();
    if (result.success && result.data) {
      const s = result.data;
      setDbHost(s.database.host || '');
      setDbPort(String(s.database.port || 5432));
      setDbName(s.database.database || '');
      setDbUser(s.database.username || '');
      setDbTimeout(String(s.database.timeout || 30));
      setMappingPath(s.mappingFile.path || '');
      setBackupDir(s.mappingFile.backupDirectory || '');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleTestConnection = async () => {
    setTestingDb(true);
    setDbTestResult(null);

    const result = await connectionApi.testConnection({
      host: dbHost,
      port: parseInt(dbPort) || 5432,
      database: dbName,
      username: dbUser,
      password: dbPassword,
      timeout: parseInt(dbTimeout) || 10,
    });

    if (result.success && result.data) {
      if (result.data.success) {
        setDbTestResult({
          success: true,
          message: `Connected — ${cleanVersionString(result.data.serverVersion)}`,
        });
      } else {
        setDbTestResult({
          success: false,
          message: result.data.errorMessage || 'Connection failed',
        });
      }
    } else {
      setDbTestResult({
        success: false,
        message: result.message || 'Connection test failed',
      });
    }

    setTestingDb(false);
  };

  const handleTestPath = async () => {
    if (!mappingPath.trim()) return;
    setTestingPath(true);
    setPathTestResult(null);

    const result = await connectionApi.testPath(mappingPath);

    if (result.success && result.data) {
      setPathTestResult({
        success: result.data.exists,
        message: result.data.exists ? 'File found' : result.data.errorMessage || 'File not found',
      });
    } else {
      setPathTestResult({
        success: false,
        message: result.message || 'Path test failed',
      });
    }

    setTestingPath(false);
  };

  const handleSave = async () => {
    setSaving(true);

    const result = await connectionApi.save({
      database: {
        host: dbHost,
        port: parseInt(dbPort) || 5432,
        database: dbName,
        username: dbUser,
        password: dbPassword,
        timeout: parseInt(dbTimeout) || 30,
      },
      mappingFile: {
        path: mappingPath.trim(),
        backupDirectory: backupDir.trim(),
      },
    });

    if (result.success) {
      toast.success('Connection settings saved');
      setDbPassword('');
      await recheckConnection();
    } else {
      toast.error(result.message || 'Failed to save settings');
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Database */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <Database className="h-4 w-4 text-primary" />
          Database Connection
        </h3>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="conn-host">Host</Label>
            <Input
              id="conn-host"
              value={dbHost}
              onChange={(e) => setDbHost(e.target.value)}
              placeholder="localhost"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conn-port">Port</Label>
            <Input
              id="conn-port"
              type="number"
              value={dbPort}
              onChange={(e) => setDbPort(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="conn-db">Database Name</Label>
            <Input
              id="conn-db"
              value={dbName}
              onChange={(e) => setDbName(e.target.value)}
              placeholder="novarad"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conn-timeout">Timeout (seconds)</Label>
            <Input
              id="conn-timeout"
              type="number"
              value={dbTimeout}
              onChange={(e) => setDbTimeout(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="conn-user">Username</Label>
            <Input
              id="conn-user"
              value={dbUser}
              onChange={(e) => setDbUser(e.target.value)}
              placeholder="nrsvc"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conn-pass">Password</Label>
            <div className="relative">
              <Input
                id="conn-pass"
                type={showPassword ? 'text' : 'password'}
                value={dbPassword}
                onChange={(e) => setDbPassword(e.target.value)}
                placeholder="Enter to change"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={testingDb || !dbHost || !dbName || !dbUser}
            className="gap-2"
          >
            {testingDb ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
            Test Connection
          </Button>
          {dbTestResult && (
            <span className={`flex items-center gap-1.5 text-sm ${dbTestResult.success ? 'text-green-500' : 'text-destructive'}`}>
              {dbTestResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              {dbTestResult.message}
            </span>
          )}
        </div>
      </div>

      <hr className="border-border/50" />

      {/* Mapping File */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4 text-primary" />
          Mapping File
        </h3>

        <div className="space-y-2">
          <Label htmlFor="conn-mapping">File Path</Label>
          <div className="flex gap-2">
            <Input
              id="conn-mapping"
              value={mappingPath}
              onChange={(e) => setMappingPath(e.target.value)}
              placeholder="D:\NovaRad\NovaRIS\Server\modality_mapping.txt"
              className="font-mono text-sm flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => { setBrowseTarget('mappingPath'); setBrowseType('file'); setBrowseOpen(true); }}
              title="Browse for file"
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="conn-backup">Backup Directory</Label>
          <div className="flex gap-2">
            <Input
              id="conn-backup"
              value={backupDir}
              onChange={(e) => setBackupDir(e.target.value)}
              placeholder="Auto-generated from mapping path"
              className="font-mono text-sm flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => { setBrowseTarget('backupDir'); setBrowseType('directory'); setBrowseOpen(true); }}
              title="Browse for directory"
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestPath}
            disabled={testingPath || !mappingPath.trim()}
            className="gap-2"
          >
            {testingPath ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            Validate Path
          </Button>
          {pathTestResult && (
            <span className={`flex items-center gap-1.5 text-sm ${pathTestResult.success ? 'text-green-500' : 'text-destructive'}`}>
              {pathTestResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              {pathTestResult.message}
            </span>
          )}
        </div>
      </div>

      <hr className="border-border/50" />

      <Button onClick={handleSave} disabled={saving || !dbHost || !dbName || !dbUser} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Save Connection Settings
      </Button>

      <FileBrowserDialog
        open={browseOpen}
        onOpenChange={setBrowseOpen}
        onSelect={(path) => {
          if (browseTarget === 'mappingPath') setMappingPath(path);
          else setBackupDir(path);
        }}
        type={browseType}
        title={browseTarget === 'mappingPath' ? 'Select Mapping File' : 'Select Backup Directory'}
      />
    </div>
  );
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

      <Tabs defaultValue="connection">
        <TabsList>
          <TabsTrigger value="connection" className="gap-2">
            <Plug className="h-4 w-4" />
            Connection
          </TabsTrigger>
          <TabsTrigger value="shared" className="gap-2">
            <Database className="h-4 w-4" />
            Shared Settings
          </TabsTrigger>
          <TabsTrigger value="site" className="gap-2">
            <Server className="h-4 w-4" />
            Site Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connection Settings</CardTitle>
              <CardDescription>
                Database connection and mapping file configuration. Changes take effect immediately.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConnectionSettingsTab />
            </CardContent>
          </Card>
        </TabsContent>

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
