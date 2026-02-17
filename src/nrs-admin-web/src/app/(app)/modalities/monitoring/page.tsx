'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { aeMonitorApi } from '@/lib/api';
import { AeActivity } from '@/lib/types';
import {
  Activity,
  RefreshCw,
  Search,
  Loader2,
  Radio,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AeMonitoringPage() {
  const [activities, setActivities] = useState<AeActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hours, setHours] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await aeMonitorApi.getRecent(hours);
      if (res.success && res.data) {
        setActivities(res.data);
        setLastUpdated(new Date());
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        loadData(false);
      }, 30000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, loadData]);

  const filteredActivities = search
    ? activities.filter((a) =>
        a.aeTitle.toLowerCase().includes(search.toLowerCase())
      )
    : activities;

  // Unique AE Titles for stats
  const uniqueAeTitles = [...new Set(activities.map((a) => a.aeTitle))];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AE Monitoring"
        description="Monitor DICOM Application Entity activity"
        icon={Activity}
        actions={
          <Button
            variant="outline"
            onClick={() => loadData()}
            disabled={loading}
            className="gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active AE Titles</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold">{uniqueAeTitles.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold">{activities.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Updated</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold">
              {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by AE Title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 1 hour</SelectItem>
              <SelectItem value="4">Last 4 hours</SelectItem>
              <SelectItem value="8">Last 8 hours</SelectItem>
              <SelectItem value="24">Last 24 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="auto-refresh"
            checked={autoRefresh}
            onCheckedChange={setAutoRefresh}
          />
          <Label htmlFor="auto-refresh" className="text-sm">
            Auto-refresh (30s)
          </Label>
          {autoRefresh && (
            <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
          )}
        </div>
      </div>

      {/* Activity Table */}
      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <Activity className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              {activities.length === 0
                ? 'No DICOM AE activity detected in the selected time range'
                : 'No results match your filter'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>AE Title</TableHead>
                <TableHead>Matching Items</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((activity, i) => (
                <TableRow key={`${activity.aeTitle}-${activity.timeStamp}-${i}`}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {activity.aeTitle}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {activity.matchingItems || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(activity.timeStamp).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
