'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/auth-context';
import { dashboardApi } from '@/lib/api';
import { DashboardStats, getStudyStatusLabel } from '@/lib/types';
import {
  LayoutDashboard,
  ArrowRight,
  Users,
  ImageIcon,
  CalendarDays,
  RefreshCw,
  Loader2,
  Images,
  Users2,
  Server,
} from 'lucide-react';
import Link from 'next/link';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const result = await dashboardApi.getStats();
    if (result.success && result.data) {
      setStats(result.data);
    } else {
      setError(result.message || 'Failed to load dashboard stats');
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user?.displayName || user?.username || 'Admin'}`}
        icon={LayoutDashboard}
        actions={
          <Button variant="outline" size="sm" onClick={() => loadStats(true)} disabled={refreshing}>
            {refreshing
              ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
              : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2"><div className="h-4 w-24 bg-muted rounded" /></CardHeader>
              <CardContent><div className="h-8 w-16 bg-muted rounded mb-2" /><div className="h-3 w-32 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/50">
          <CardContent className="py-8 text-center">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => loadStats()}>Retry</Button>
          </CardContent>
        </Card>
      ) : stats ? (
        <>
          {/* Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <Card className="animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Studies</CardTitle>
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(stats.totalStudies)}</div>
                <p className="text-xs text-muted-foreground mt-1">Across all facilities</p>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '50ms' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Images</CardTitle>
                <Images className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(stats.totalImages)}</div>
                <p className="text-xs text-muted-foreground mt-1">DICOM instances</p>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Studies</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(stats.todayStudies)}</div>
                <p className="text-xs text-muted-foreground mt-1">Received today</p>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '150ms' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Patients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(stats.totalPatients)}</div>
                <p className="text-xs text-muted-foreground mt-1">In PACS database</p>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
                <Users2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${stats.activeUsers > 0 ? 'bg-green-500 status-pulse' : 'bg-muted-foreground/30'}`} />
                  <span className="text-2xl font-bold">{stats.activeUsers}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Connected users</p>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '250ms' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Services</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${stats.activeServices > 0 ? 'bg-green-500 status-pulse' : 'bg-destructive status-pulse'}`} />
                  <span className="text-2xl font-bold">{stats.activeServices}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Novarad services</p>
              </CardContent>
            </Card>
          </div>

          {/* Data Tables Row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Modality Breakdown */}
            <Card className="animate-fade-in" style={{ animationDelay: '250ms' }}>
              <CardHeader>
                <CardTitle className="text-base">By Modality</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {stats.modalityBreakdown.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Modality</TableHead>
                        <TableHead className="text-right">Studies</TableHead>
                        <TableHead className="text-right">Series</TableHead>
                        <TableHead className="text-right">Images</TableHead>
                        <TableHead className="text-right">Patients</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.modalityBreakdown.map((m) => (
                        <TableRow key={m.modality}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">{m.modality}</Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {formatNumber(m.studyCount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                            {formatNumber(m.seriesCount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {formatNumber(m.imageCount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                            {formatNumber(m.patientCount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    No modality data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Facility Breakdown */}
            <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
              <CardHeader>
                <CardTitle className="text-base">By Facility</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {stats.facilityBreakdown.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Facility</TableHead>
                        <TableHead className="text-right">Studies</TableHead>
                        <TableHead className="text-right">Patients</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.facilityBreakdown.map((f) => (
                        <TableRow key={f.facilityId}>
                          <TableCell className="font-medium text-sm">{f.facilityName}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {formatNumber(f.studyCount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                            {formatNumber(f.patientCount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    No facility data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Studies */}
          <Card className="animate-fade-in" style={{ animationDelay: '350ms' }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Studies</CardTitle>
              <Link href="/studies">
                <Button variant="ghost" size="sm" className="text-xs">
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {stats.recentStudies.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left font-medium py-2 pr-4">Patient</th>
                        <th className="text-left font-medium py-2 pr-4">MRN</th>
                        <th className="text-left font-medium py-2 pr-4">Modality</th>
                        <th className="text-left font-medium py-2 pr-4">Status</th>
                        <th className="text-left font-medium py-2 pr-4">Study Date</th>
                        <th className="text-left font-medium py-2">Facility</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentStudies.map((study) => (
                        <tr key={study.id}
                          className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => window.location.href = `/studies/${study.id}`}>
                          <td className="py-2 pr-4 font-medium">{study.patientName}</td>
                          <td className="py-2 pr-4 text-muted-foreground font-mono text-xs">{study.patientId}</td>
                          <td className="py-2 pr-4"><Badge variant="outline">{study.modality}</Badge></td>
                          <td className="py-2 pr-4"><Badge variant="secondary">{getStudyStatusLabel(study.status)}</Badge></td>
                          <td className="py-2 pr-4 text-muted-foreground">{formatDateTime(study.studyDate)}</td>
                          <td className="py-2 text-muted-foreground">{study.facilityName || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No recent studies</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
