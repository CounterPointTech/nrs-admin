'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { connectionApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { FileBrowserDialog } from '@/components/file-browser-dialog';
import {
  Loader2,
  Check,
  Database,
  Plug,
  FileText,
  FileCode2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Server,
} from 'lucide-react';
import { toast } from 'sonner';

function cleanVersionString(version?: string): string {
  if (!version) return 'PostgreSQL';
  const commaIdx = version.indexOf(',');
  return commaIdx > 0 ? version.substring(0, commaIdx).trim() : version.trim();
}

interface ConnectionSettingsCardProps {
  defaultExpanded?: boolean;
}

export function ConnectionSettingsCard({ defaultExpanded = false }: ConnectionSettingsCardProps) {
  const { recheckConnection } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(defaultExpanded);

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

  // Report template fields
  const [templateDir, setTemplateDir] = useState('');
  const [templateBackupDir, setTemplateBackupDir] = useState('');

  // Novarad server (host where PACS/RIS Windows services run)
  const [novaradHost, setNovaradHost] = useState('');

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
  const [browseTarget, setBrowseTarget] = useState<'mappingPath' | 'backupDir' | 'templateDir' | 'templateBackupDir'>('mappingPath');
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
      setTemplateDir(s.reportTemplate?.directory || '');
      setTemplateBackupDir(s.reportTemplate?.backupDirectory || '');
      setNovaradHost(s.novaradServer?.host || '');
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
      reportTemplate: {
        directory: templateDir.trim(),
        backupDirectory: templateBackupDir.trim(),
      },
      novaradServer: {
        host: novaradHost.trim(),
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

  // Summary text for collapsed state
  const summaryText = dbHost ? `${dbHost}:${dbPort}/${dbName}` : 'Not configured';

  return (
    <Card id="category-connection" className="scroll-mt-6">
      <CardHeader className="pb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 w-full text-left"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-blue-500">
            <Plug className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Connection</h3>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                File
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {expanded ? 'NRS Admin app configuration — database, mapping file, report templates.' : summaryText}
            </p>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
      </CardHeader>

      {expanded && (
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Database */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Database className="h-3.5 w-3.5 text-primary" />
                  Database Connection
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="conn-host" className="text-xs">Host</Label>
                    <Input id="conn-host" value={dbHost} onChange={(e) => setDbHost(e.target.value)} placeholder="localhost" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="conn-port" className="text-xs">Port</Label>
                    <Input id="conn-port" type="number" value={dbPort} onChange={(e) => setDbPort(e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="conn-db" className="text-xs">Database</Label>
                    <Input id="conn-db" value={dbName} onChange={(e) => setDbName(e.target.value)} placeholder="novarad" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="conn-timeout" className="text-xs">Timeout (s)</Label>
                    <Input id="conn-timeout" type="number" value={dbTimeout} onChange={(e) => setDbTimeout(e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="conn-user" className="text-xs">Username</Label>
                    <Input id="conn-user" value={dbUser} onChange={(e) => setDbUser(e.target.value)} placeholder="nrsvc" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="conn-pass" className="text-xs">Password</Label>
                    <div className="relative">
                      <Input
                        id="conn-pass"
                        type={showPassword ? 'text' : 'password'}
                        value={dbPassword}
                        onChange={(e) => setDbPassword(e.target.value)}
                        placeholder="Enter to change"
                        className="pr-8 h-8 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={testingDb || !dbHost || !dbName || !dbUser} className="gap-1.5 h-7 text-xs">
                    {testingDb ? <Loader2 className="h-3 w-3 animate-spin" /> : <Database className="h-3 w-3" />}
                    Test
                  </Button>
                  {dbTestResult && (
                    <span className={`flex items-center gap-1 text-xs ${dbTestResult.success ? 'text-green-500' : 'text-destructive'}`}>
                      {dbTestResult.success ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {dbTestResult.message}
                    </span>
                  )}
                </div>
              </div>

              <hr className="border-border/50" />

              {/* Mapping File */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  Mapping File
                </h4>

                <div className="space-y-1.5">
                  <Label htmlFor="conn-mapping" className="text-xs">File Path</Label>
                  <div className="flex gap-2">
                    <Input id="conn-mapping" value={mappingPath} onChange={(e) => setMappingPath(e.target.value)} placeholder="D:\NovaRad\NovaRIS\Server\modality_mapping.txt" className="font-mono text-xs h-8 flex-1" />
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setBrowseTarget('mappingPath'); setBrowseType('file'); setBrowseOpen(true); }}><FolderOpen className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="conn-backup" className="text-xs">Backup Directory</Label>
                  <div className="flex gap-2">
                    <Input id="conn-backup" value={backupDir} onChange={(e) => setBackupDir(e.target.value)} placeholder="Auto-generated" className="font-mono text-xs h-8 flex-1" />
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setBrowseTarget('backupDir'); setBrowseType('directory'); setBrowseOpen(true); }}><FolderOpen className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={handleTestPath} disabled={testingPath || !mappingPath.trim()} className="gap-1.5 h-7 text-xs">
                    {testingPath ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                    Validate
                  </Button>
                  {pathTestResult && (
                    <span className={`flex items-center gap-1 text-xs ${pathTestResult.success ? 'text-green-500' : 'text-destructive'}`}>
                      {pathTestResult.success ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {pathTestResult.message}
                    </span>
                  )}
                </div>
              </div>

              <hr className="border-border/50" />

              {/* Report Templates */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <FileCode2 className="h-3.5 w-3.5 text-primary" />
                  Report Templates
                </h4>

                <div className="space-y-1.5">
                  <Label htmlFor="conn-template-dir" className="text-xs">Templates Directory</Label>
                  <div className="flex gap-2">
                    <Input id="conn-template-dir" value={templateDir} onChange={(e) => setTemplateDir(e.target.value)} placeholder="D:\NovaRad\NovaRIS\Server\ReportTemplates" className="font-mono text-xs h-8 flex-1" />
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setBrowseTarget('templateDir'); setBrowseType('directory'); setBrowseOpen(true); }}><FolderOpen className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="conn-template-backup" className="text-xs">Backup Directory</Label>
                  <div className="flex gap-2">
                    <Input id="conn-template-backup" value={templateBackupDir} onChange={(e) => setTemplateBackupDir(e.target.value)} placeholder="Auto-generated" className="font-mono text-xs h-8 flex-1" />
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setBrowseTarget('templateBackupDir'); setBrowseType('directory'); setBrowseOpen(true); }}><FolderOpen className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>

              <hr className="border-border/50" />

              {/* Novarad Server */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Server className="h-3.5 w-3.5 text-primary" />
                  Novarad Server
                </h4>

                <div className="space-y-1.5">
                  <Label htmlFor="conn-novarad-host" className="text-xs">Host</Label>
                  <Input
                    id="conn-novarad-host"
                    value={novaradHost}
                    onChange={(e) => setNovaradHost(e.target.value)}
                    placeholder="Leave blank to use local machine"
                    className="h-8 text-sm font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Windows host where NovaPACS / NovaRIS services are running. Used by the
                    dashboard Services card to query service status. Can differ from the database
                    host when the DB lives on a separate server. Leave blank to query the local
                    NRS Admin API machine. Accepts hostname, FQDN, or IP — remote queries require
                    network access and admin credentials on the target.
                  </p>
                </div>
              </div>

              <hr className="border-border/50" />

              <Button onClick={handleSave} disabled={saving || !dbHost || !dbName || !dbUser} className="gap-1.5 h-8 text-sm">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save Connection Settings
              </Button>

              <FileBrowserDialog
                open={browseOpen}
                onOpenChange={setBrowseOpen}
                onSelect={(path) => {
                  if (browseTarget === 'mappingPath') setMappingPath(path);
                  else if (browseTarget === 'backupDir') setBackupDir(path);
                  else if (browseTarget === 'templateDir') setTemplateDir(path);
                  else if (browseTarget === 'templateBackupDir') setTemplateBackupDir(path);
                }}
                type={browseType}
                title={
                  browseTarget === 'mappingPath' ? 'Select Mapping File'
                    : browseTarget === 'backupDir' ? 'Select Backup Directory'
                    : browseTarget === 'templateDir' ? 'Select Templates Directory'
                    : 'Select Template Backup Directory'
                }
              />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
