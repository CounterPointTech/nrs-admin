'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { connectionApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileBrowserDialog } from '@/components/file-browser-dialog';
import {
  Shield,
  Loader2,
  Database,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  FolderOpen,
} from 'lucide-react';

function cleanVersionString(version?: string): string {
  if (!version) return 'PostgreSQL';
  // Extract just "PostgreSQL X.Y" — drop everything after the comma
  const commaIdx = version.indexOf(',');
  return commaIdx > 0 ? version.substring(0, commaIdx).trim() : version.trim();
}

export default function SetupPage() {
  const router = useRouter();
  const { recheckConnection } = useAuth();

  // Database fields
  const [dbHost, setDbHost] = useState('localhost');
  const [dbPort, setDbPort] = useState('5432');
  const [dbName, setDbName] = useState('novarad');
  const [dbUser, setDbUser] = useState('nrsvc');
  const [dbPassword, setDbPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dbTimeout, setDbTimeout] = useState('30');

  // Mapping file fields — pre-filled with defaults
  const [mappingPath, setMappingPath] = useState('D:\\NovaRad\\NovaRIS\\Server\\modality_mapping.txt');
  const [backupDir, setBackupDir] = useState('D:\\NovaRad\\NovaRIS\\Server\\mapping_backups');

  // Browse dialog
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseTarget, setBrowseTarget] = useState<'mappingPath' | 'backupDir'>('mappingPath');
  const [browseType, setBrowseType] = useState<'file' | 'directory'>('file');

  // Test states
  const [testingDb, setTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{
    success: boolean;
    message: string;
    isNovarad?: boolean;
  } | null>(null);

  const [testingPath, setTestingPath] = useState(false);
  const [pathTestResult, setPathTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
          isNovarad: result.data.isNovaradDatabase,
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
        message: result.data.exists
          ? 'File found and accessible'
          : result.data.errorMessage || 'File not found',
      });
    } else {
      setPathTestResult({
        success: false,
        message: result.message || 'Path test failed',
      });
    }

    setTestingPath(false);
  };

  const openBrowse = (target: 'mappingPath' | 'backupDir', type: 'file' | 'directory') => {
    setBrowseTarget(target);
    setBrowseType(type);
    setBrowseOpen(true);
  };

  const handleBrowseSelect = (path: string) => {
    if (browseTarget === 'mappingPath') {
      setMappingPath(path);
    } else {
      setBackupDir(path);
    }
  };

  const handleSave = async () => {
    setError('');
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
      mappingFile: mappingPath.trim()
        ? {
            path: mappingPath.trim(),
            backupDirectory: backupDir.trim() || mappingPath.trim().replace(/[^/\\]+$/, 'mapping_backups'),
          }
        : undefined,
    });

    if (result.success) {
      await recheckConnection();
      router.push('/login');
    } else {
      setError(result.message || 'Failed to save connection settings');
    }

    setSaving(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute inset-0 bg-radial-gradient" />

      <div className="absolute top-1/4 -left-32 h-64 w-64 rounded-full bg-primary/10 blur-[100px] animate-float" />
      <div className="absolute bottom-1/4 -right-32 h-64 w-64 rounded-full bg-primary/5 blur-[100px] animate-float" style={{ animationDelay: '1.5s' }} />

      <div className="relative w-full max-w-2xl space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">NRS Admin Setup</h1>
          <p className="text-muted-foreground">
            Configure the database connection to get started
          </p>
        </div>

        {/* Database Connection Card */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-xl shadow-black/10">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-primary" />
              Database Connection
            </CardTitle>
            <CardDescription>
              Connect to the Novarad PostgreSQL database
            </CardDescription>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="host">Host</Label>
                <Input
                  id="host"
                  value={dbHost}
                  onChange={(e) => setDbHost(e.target.value)}
                  placeholder="localhost or IP address"
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  value={dbPort}
                  onChange={(e) => setDbPort(e.target.value)}
                  placeholder="5432"
                  className="bg-background/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="database">Database Name</Label>
                <Input
                  id="database"
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                  placeholder="novarad"
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={dbTimeout}
                  onChange={(e) => setDbTimeout(e.target.value)}
                  placeholder="30"
                  className="bg-background/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={dbUser}
                  onChange={(e) => setDbUser(e.target.value)}
                  placeholder="nrsvc"
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={dbPassword}
                    onChange={(e) => setDbPassword(e.target.value)}
                    placeholder="Database password"
                    className="pr-10 bg-background/50"
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

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testingDb || !dbHost || !dbName || !dbUser}
                className="gap-2"
              >
                {testingDb ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Database className="h-4 w-4" />
                )}
                Test Connection
              </Button>

              {dbTestResult && (
                <div className={`flex items-center gap-2 text-sm min-w-0 ${dbTestResult.success ? 'text-green-500' : 'text-destructive'}`}>
                  {dbTestResult.success ? (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="truncate">{dbTestResult.message}</span>
                  {dbTestResult.success && !dbTestResult.isNovarad && (
                    <span className="text-yellow-500 text-xs shrink-0">(not a Novarad DB)</span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mapping File Card */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-xl shadow-black/10">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Mapping File
              <span className="text-xs font-normal text-muted-foreground ml-1">(Optional)</span>
            </CardTitle>
            <CardDescription>
              Path to the DICOM modality mapping file. Adjust as needed for your installation.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mappingPath">Mapping File Path</Label>
              <div className="flex gap-2">
                <Input
                  id="mappingPath"
                  value={mappingPath}
                  onChange={(e) => setMappingPath(e.target.value)}
                  className="bg-background/50 font-mono text-sm flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => openBrowse('mappingPath', 'file')}
                  title="Browse for file"
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="backupDir">Backup Directory</Label>
              <div className="flex gap-2">
                <Input
                  id="backupDir"
                  value={backupDir}
                  onChange={(e) => setBackupDir(e.target.value)}
                  className="bg-background/50 font-mono text-sm flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => openBrowse('backupDir', 'directory')}
                  title="Browse for directory"
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleTestPath}
                disabled={testingPath || !mappingPath.trim()}
                className="gap-2"
              >
                {testingPath ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Validate Path
              </Button>

              {pathTestResult && (
                <div className={`flex items-center gap-2 text-sm ${pathTestResult.success ? 'text-green-500' : 'text-destructive'}`}>
                  {pathTestResult.success ? (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span>{pathTestResult.message}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="animate-fade-in">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={saving || !dbHost || !dbName || !dbUser}
          className="w-full h-11 font-medium transition-all duration-200 hover:shadow-lg hover:shadow-primary/20 gap-2"
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save & Connect'
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground/60">
          Settings are saved to connection.json and can be changed later in Settings.
        </p>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/40">
        NRS Admin v1.0
      </div>

      {/* File Browser Dialog */}
      <FileBrowserDialog
        open={browseOpen}
        onOpenChange={setBrowseOpen}
        onSelect={handleBrowseSelect}
        type={browseType}
        title={browseTarget === 'mappingPath' ? 'Select Mapping File' : 'Select Backup Directory'}
      />
    </div>
  );
}
