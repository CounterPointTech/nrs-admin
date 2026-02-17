'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { dashboardApi } from '@/lib/api';
import { DashboardStats, getStudyStatusLabel } from '@/lib/types';
import {
  LayoutDashboard,
  FileSearch,
  Monitor,
  FileCode2,
  Activity,
  ArrowRight,
  Users,
  ImageIcon,
  CalendarDays,
  Radio,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

const quickLinks = [
  {
    title: 'Study Search',
    description: 'Search and view PACS studies',
    href: '/studies',
    icon: FileSearch,
  },
  {
    title: 'Modalities',
    description: 'Manage RIS modalities',
    href: '/modalities',
    icon: Monitor,
  },
  {
    title: 'Mapping Editor',
    description: 'Edit modality mapping file',
    href: '/modalities/mapping',
    icon: FileCode2,
  },
  {
    title: 'AE Monitoring',
    description: 'Monitor DICOM AE activity',
    href: '/modalities/monitoring',
    icon: Activity,
  },
];

const STATUS_COLORS = [
  'hsl(200, 80%, 55%)', // New — blue
  'hsl(45, 90%, 55%)',  // In Progress — amber
  'hsl(160, 60%, 45%)', // Read — teal
  'hsl(140, 70%, 40%)', // Final — green
  'hsl(270, 60%, 55%)', // Addendum — purple
  'hsl(0, 60%, 50%)',   // Cancelled — red
  'hsl(30, 70%, 50%)',  // On Hold — orange
  'hsl(340, 70%, 55%)', // Stat — pink
];

const MODALITY_COLORS = [
  'hsl(200, 75%, 50%)',
  'hsl(160, 65%, 45%)',
  'hsl(270, 55%, 55%)',
  'hsl(45, 85%, 50%)',
  'hsl(340, 65%, 50%)',
  'hsl(120, 50%, 45%)',
  'hsl(30, 75%, 50%)',
  'hsl(220, 60%, 55%)',
  'hsl(0, 55%, 50%)',
  'hsl(180, 60%, 45%)',
  'hsl(300, 50%, 50%)',
  'hsl(60, 70%, 45%)',
  'hsl(240, 55%, 55%)',
  'hsl(15, 65%, 50%)',
  'hsl(90, 50%, 45%)',
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user?.displayName || user?.username || 'Admin'}`}
        icon={LayoutDashboard}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadStats(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        }
      />

      {/* Stat Cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded mb-2" />
                <div className="h-3 w-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/50">
          <CardContent className="py-8 text-center">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => loadStats()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Studies
                </CardTitle>
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(stats.totalStudies)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all facilities
                </p>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '50ms' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Today&apos;s Studies
                </CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(stats.todayStudies)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Studies received today
                </p>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Sessions
                </CardTitle>
                <Radio className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 status-pulse" />
                  <span className="text-2xl font-bold">{stats.activeSessions}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Currently connected users
                </p>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '150ms' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Patients
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(stats.totalPatients)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  In PACS database
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Study Volume - 30 Day Trend */}
            <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
              <CardHeader>
                <CardTitle className="text-base">Study Volume — Last 30 Days</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.studiesByDate.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={stats.studiesByDate}>
                      <defs>
                        <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(200, 75%, 50%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(200, 75%, 50%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        width={45}
                      />
                      <Tooltip
                        labelFormatter={(v) => formatDate(v as string)}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(200, 75%, 50%)"
                        fill="url(#volumeGradient)"
                        strokeWidth={2}
                        name="Studies"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                    No data for the last 30 days
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Studies by Status - Pie Chart */}
            <Card className="animate-fade-in" style={{ animationDelay: '250ms' }}>
              <CardHeader>
                <CardTitle className="text-base">Studies by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.studiesByStatus.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="55%" height={260}>
                      <PieChart>
                        <Pie
                          data={stats.studiesByStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="count"
                          nameKey="label"
                        >
                          {stats.studiesByStatus.map((entry, index) => (
                            <Cell
                              key={`status-${entry.status}`}
                              fill={STATUS_COLORS[entry.status] || STATUS_COLORS[index % STATUS_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: 12,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {stats.studiesByStatus.map((entry, index) => (
                        <div key={entry.status} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{
                                backgroundColor: STATUS_COLORS[entry.status] || STATUS_COLORS[index % STATUS_COLORS.length],
                              }}
                            />
                            <span className="text-muted-foreground truncate">{entry.label}</span>
                          </div>
                          <span className="font-medium tabular-nums">{formatNumber(entry.count)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                    No status data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Studies by Modality - Bar Chart */}
          <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
            <CardHeader>
              <CardTitle className="text-base">Studies by Modality</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.studiesByModality.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.studiesByModality} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="modality"
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" name="Studies" radius={[0, 4, 4, 0]}>
                      {stats.studiesByModality.map((_, index) => (
                        <Cell key={`mod-${index}`} fill={MODALITY_COLORS[index % MODALITY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                  No modality data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Studies */}
          <Card className="animate-fade-in" style={{ animationDelay: '350ms' }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Studies</CardTitle>
              <Link href="/studies">
                <Button variant="ghost" size="sm" className="text-xs">
                  View all
                  <ArrowRight className="h-3 w-3 ml-1" />
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
                        <tr
                          key={study.id}
                          className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => window.location.href = `/studies/${study.id}`}
                        >
                          <td className="py-2 pr-4 font-medium">{study.patientName}</td>
                          <td className="py-2 pr-4 text-muted-foreground font-mono text-xs">{study.patientId}</td>
                          <td className="py-2 pr-4">
                            <Badge variant="outline">{study.modality}</Badge>
                          </td>
                          <td className="py-2 pr-4">
                            <Badge variant="secondary">{getStudyStatusLabel(study.status)}</Badge>
                          </td>
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

          {/* Quick Links */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Quick Access</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {quickLinks.map((link, index) => (
                <Link key={link.href} href={link.href}>
                  <Card className="group hover-lift card-glow cursor-pointer h-full">
                    <CardHeader className="pb-3">
                      <div
                        className="animate-fade-in"
                        style={{ opacity: 0, animationDelay: `${400 + index * 50}ms` }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-200">
                            <link.icon className="h-5 w-5 text-primary" />
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-1" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardTitle className="text-base mb-1">{link.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{link.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
