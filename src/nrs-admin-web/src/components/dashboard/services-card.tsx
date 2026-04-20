'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { servicesMonitorApi } from '@/lib/api';
import { ServicesSnapshot, ServiceInfo, ServiceAction } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Server,
  ChevronDown,
  RefreshCw,
  Loader2,
  AlertCircle,
  Network,
  Play,
  Square,
  RotateCw,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const STORAGE_KEY = 'dashboard-services-expanded';

function statusDotClass(status: string): string {
  switch (status) {
    case 'Running':
      return 'bg-green-500 status-pulse';
    case 'Stopped':
      return 'bg-muted-foreground/40';
    case 'StartPending':
    case 'ContinuePending':
      return 'bg-amber-500 status-pulse';
    case 'StopPending':
    case 'PausePending':
      return 'bg-orange-500 status-pulse';
    case 'Paused':
      return 'bg-blue-500';
    default:
      return 'bg-destructive';
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'Running':
      return 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30';
    case 'Stopped':
      return 'bg-muted text-muted-foreground border-border';
    case 'StartPending':
    case 'ContinuePending':
    case 'StopPending':
    case 'PausePending':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
    case 'Paused':
      return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';
    default:
      return 'bg-destructive/15 text-destructive border-destructive/30';
  }
}

interface ServiceRowProps {
  svc: ServiceInfo;
  pendingAction: ServiceAction | null;
  onAction: (svc: ServiceInfo, action: ServiceAction) => void;
  globalBusy?: boolean;
}

function ServiceRow({ svc, pendingAction, onAction, globalBusy }: ServiceRowProps) {
  const isRunning = svc.status === 'Running';
  const isStopped = svc.status === 'Stopped';
  const isTransient =
    svc.status === 'StartPending' ||
    svc.status === 'StopPending' ||
    svc.status === 'ContinuePending' ||
    svc.status === 'PausePending';
  const busy = pendingAction !== null || isTransient || !!globalBusy;

  return (
    <div className="group flex items-center justify-between gap-3 rounded-md border border-border/40 bg-card/50 px-3 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', statusDotClass(svc.status))} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{svc.displayName}</div>
          <div className="truncate font-mono text-[11px] text-muted-foreground">{svc.name}</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className={cn('font-medium text-[11px]', statusBadgeClass(svc.status))}>
          {svc.status}
        </Badge>

        <div className="flex items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title={isRunning ? 'Already running' : 'Start service'}
            disabled={busy || isRunning}
            onClick={() => onAction(svc, 'start')}
          >
            {pendingAction === 'start' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title={isStopped ? 'Already stopped' : !svc.canStop ? 'Service does not accept stop' : 'Stop service'}
            disabled={busy || isStopped || !svc.canStop}
            onClick={() => onAction(svc, 'stop')}
          >
            {pendingAction === 'stop' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Square className="h-3.5 w-3.5 text-destructive" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Restart service"
            disabled={busy || (!svc.canStop && isRunning)}
            onClick={() => onAction(svc, 'restart')}
          >
            {pendingAction === 'restart' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ServicesCard() {
  const [snapshot, setSnapshot] = useState<ServicesSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    // Default collapsed — only expanded if user has explicitly opened it.
    return localStorage.getItem(STORAGE_KEY) === '1';
  });
  // { serviceName: action } for the service currently being acted on
  const [pending, setPending] = useState<Record<string, ServiceAction>>({});
  const [confirm, setConfirm] = useState<{ svc: ServiceInfo; action: ServiceAction } | null>(null);
  const [confirmRestartAll, setConfirmRestartAll] = useState(false);
  const [restartingAll, setRestartingAll] = useState(false);

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      }
      return next;
    });
  };

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const result = await servicesMonitorApi.getSnapshot();
    if (result.success && result.data) {
      setSnapshot(result.data);
    } else {
      setError(result.message ?? 'Failed to load services');
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const performAction = useCallback(
    async (svc: ServiceInfo, action: ServiceAction) => {
      setPending((p) => ({ ...p, [svc.name]: action }));
      try {
        const res = await servicesMonitorApi.control(svc.name, action);
        if (res.success && res.data) {
          setSnapshot((prev) =>
            prev
              ? {
                  ...prev,
                  services: prev.services.map((s) => (s.name === svc.name ? res.data! : s)),
                  checkedAt: new Date().toISOString(),
                }
              : prev
          );
          toast.success(`${svc.displayName}: ${action} succeeded.`);
        } else {
          toast.error(res.message ?? `${action} failed.`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `${action} failed.`);
      } finally {
        setPending((p) => {
          const next = { ...p };
          delete next[svc.name];
          return next;
        });
      }
    },
    []
  );

  const restartAll = useCallback(async () => {
    const services = snapshot?.services ?? [];
    if (services.length === 0) return;

    setRestartingAll(true);
    const toastId = toast.loading(`Restarting 0 of ${services.length} services...`);

    let succeeded = 0;
    const failures: string[] = [];

    // Sequential — avoids overwhelming SCM and respects any service dependencies.
    for (let i = 0; i < services.length; i++) {
      const svc = services[i];
      setPending((p) => ({ ...p, [svc.name]: 'restart' }));
      toast.loading(`Restarting ${i + 1} of ${services.length} — ${svc.displayName}`, { id: toastId });

      try {
        const res = await servicesMonitorApi.control(svc.name, 'restart');
        if (res.success && res.data) {
          succeeded++;
          setSnapshot((prev) =>
            prev
              ? { ...prev, services: prev.services.map((s) => (s.name === svc.name ? res.data! : s)) }
              : prev
          );
        } else {
          failures.push(`${svc.displayName}: ${res.message ?? 'failed'}`);
        }
      } catch (err) {
        failures.push(`${svc.displayName}: ${err instanceof Error ? err.message : 'failed'}`);
      } finally {
        setPending((p) => {
          const next = { ...p };
          delete next[svc.name];
          return next;
        });
      }
    }

    setRestartingAll(false);

    if (failures.length === 0) {
      toast.success(`Restarted all ${succeeded} service${succeeded === 1 ? '' : 's'}.`, { id: toastId });
    } else if (succeeded === 0) {
      toast.error(`All ${failures.length} restarts failed. First error: ${failures[0]}`, { id: toastId });
    } else {
      toast.warning(
        `Restarted ${succeeded} of ${services.length} services. ${failures.length} failed — check logs.`,
        { id: toastId }
      );
    }
  }, [snapshot]);

  const requestAction = useCallback(
    (svc: ServiceInfo, action: ServiceAction) => {
      // Start is non-destructive → act immediately. Stop/Restart get a confirmation.
      if (action === 'start') {
        void performAction(svc, action);
      } else {
        setConfirm({ svc, action });
      }
    },
    [performAction]
  );

  const counts = useMemo(() => {
    const services = snapshot?.services ?? [];
    return {
      total: services.length,
      running: services.filter((s) => s.status === 'Running').length,
      stopped: services.filter((s) => s.status === 'Stopped').length,
      other: services.filter((s) => s.status !== 'Running' && s.status !== 'Stopped').length,
    };
  }, [snapshot]);

  return (
    <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <button
          type="button"
          onClick={toggleExpanded}
          className="group flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
              !expanded && '-rotate-90'
            )}
          />
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
            <Server className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base leading-tight group-hover:text-primary transition-colors">
              Services
            </CardTitle>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              {snapshot?.remote ? (
                <>
                  <Network className="h-3 w-3" />
                  <span className="font-mono">{snapshot.host}</span>
                </>
              ) : (
                <span>Local host</span>
              )}
              {snapshot && !snapshot.error && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span>Updated {new Date(snapshot.checkedAt).toLocaleTimeString()}</span>
                </>
              )}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {snapshot && !snapshot.error && (
            <div className="hidden items-center gap-3 text-xs sm:flex">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="font-medium tabular-nums">{counts.running}</span>
                <span className="text-muted-foreground">running</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                <span className="font-medium tabular-nums">{counts.stopped}</span>
                <span className="text-muted-foreground">stopped</span>
              </span>
              {counts.other > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="font-medium tabular-nums">{counts.other}</span>
                  <span className="text-muted-foreground">other</span>
                </span>
              )}
            </div>
          )}
          {expanded && snapshot && !snapshot.error && snapshot.services.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmRestartAll(true);
              }}
              disabled={loading || refreshing || restartingAll}
              className="h-8 gap-1.5 text-xs"
              title="Restart every monitored service"
            >
              {restartingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
              Restart All
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              load(true);
            }}
            disabled={loading || refreshing || restartingAll}
            className="h-8 w-8 p-0"
            title="Refresh services"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : snapshot?.error ? (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{snapshot.error}</span>
            </div>
          ) : snapshot && snapshot.services.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              No matching services found on <span className="font-mono">{snapshot.host}</span>.
              <br />
              Adjust <code className="font-mono text-xs">ServicesMonitor:Patterns</code> in <code className="font-mono text-xs">appsettings.json</code>.
            </div>
          ) : snapshot ? (
            <div className="space-y-1.5">
              {snapshot.services.map((svc) => (
                <ServiceRow
                  key={svc.name}
                  svc={svc}
                  pendingAction={pending[svc.name] ?? null}
                  onAction={requestAction}
                  globalBusy={restartingAll}
                />
              ))}
            </div>
          ) : null}
        </CardContent>
      )}

      <AlertDialog open={confirmRestartAll} onOpenChange={setConfirmRestartAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart all services?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Every monitored service on{' '}
                  <span className="font-mono font-medium">{snapshot?.host ?? 'this host'}</span>
                  {' '}will be stopped and started again, one at a time. Clients connected to these
                  services will be disrupted.
                </p>
                {snapshot && snapshot.services.length > 0 && (
                  <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs">
                    <div className="mb-1.5 font-medium text-foreground">
                      {snapshot.services.length} service{snapshot.services.length === 1 ? '' : 's'} will be restarted:
                    </div>
                    <ul className="space-y-0.5 font-mono text-[11px] text-muted-foreground">
                      {snapshot.services.map((s) => (
                        <li key={s.name}>• {s.displayName}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmRestartAll(false);
                void restartAll();
              }}
            >
              Restart All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === 'restart' ? 'Restart service?' : 'Stop service?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === 'restart' ? (
                <>
                  Restart <strong>{confirm.svc.displayName}</strong>? The service will be stopped
                  and started again. Clients connected to it will be disrupted briefly.
                </>
              ) : confirm ? (
                <>
                  Stop <strong>{confirm.svc.displayName}</strong>? The service will remain stopped
                  until it is started again. Any active operations will be interrupted.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm) {
                  void performAction(confirm.svc, confirm.action);
                  setConfirm(null);
                }
              }}
              className={cn(
                confirm?.action === 'stop' &&
                  'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              )}
            >
              {confirm?.action === 'restart' ? 'Restart' : 'Stop'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
