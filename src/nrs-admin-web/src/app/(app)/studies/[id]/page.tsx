'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { studyApi } from '@/lib/api';
import { UnifiedStudyDetail, Series, getStudyStatusLabel } from '@/lib/types';
import {
  FileSearch, ArrowLeft, Loader2, AlertCircle, Link2, Unlink,
  LayoutDashboard, Users, ClipboardList, FileText, Layers, PanelLeft, LayoutList,
} from 'lucide-react';
import { StudyOverviewTab } from '@/components/studies/study-overview-tab';
import { PatientComparisonTab } from '@/components/studies/patient-comparison-tab';
import { OrdersProceduresTab } from '@/components/studies/orders-procedures-tab';
import { ReportsTab } from '@/components/studies/reports-tab';
import { SeriesDatasetsTab } from '@/components/studies/series-datasets-tab';
import { PanelLayout } from '@/components/studies/panel-layout';
import { LinkManagementDialog, UnlinkConfirmDialog } from '@/components/studies/link-management-dialog';
import { PatientMergeDialog } from '@/components/studies/patient-merge-dialog';

function statusBadgeVariant(status: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) { case 0: return 'outline'; case 1: return 'secondary'; case 2: case 3: return 'default'; case 5: return 'destructive'; default: return 'secondary'; }
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

type LayoutMode = 'tabs' | 'panels';

export default function UnifiedStudyEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UnifiedStudyDetail | null>(null);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [layout, setLayout] = useState<LayoutMode>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('studyEditorLayout') as LayoutMode) || 'panels';
    return 'panels';
  });

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);

  useEffect(() => { loadData(); }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await studyApi.getUnified(Number(id));
      if (res.success && res.data) {
        setData(res.data);
        setSeriesLoading(true);
        const seriesRes = await studyApi.getSeries(Number(id));
        if (seriesRes.success && seriesRes.data) setSeriesList(seriesRes.data);
        setSeriesLoading(false);
      }
    } finally { setLoading(false); }
  }

  function handleDataChange(newData: UnifiedStudyDetail) { setData(newData); }

  function toggleLayout() {
    const next: LayoutMode = layout === 'tabs' ? 'panels' : 'tabs';
    setLayout(next);
    localStorage.setItem('studyEditorLayout', next);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!data) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="h-10 w-10 text-muted-foreground" />
      <p className="text-muted-foreground">Study not found</p>
      <Button variant="outline" onClick={() => router.push('/studies')}><ArrowLeft className="h-4 w-4 mr-2" /> Back to Search</Button>
    </div>
  );

  const { study, link } = data;

  return (
    <div className="space-y-3">
      <PageHeader
        title={
          <div className="flex items-center gap-2 flex-wrap">
            <span>{study.lastName}, {study.firstName}</span>
            <Badge variant={statusBadgeVariant(study.status)} className="text-xs">{getStudyStatusLabel(study.status)}</Badge>
            {link.linkMethod === 'None' ? (
              <Badge variant="destructive" className="gap-1 text-xs"><Unlink className="h-3 w-3" /> Unlinked</Badge>
            ) : (
              <Badge className="gap-1 text-xs bg-emerald-600"><Link2 className="h-3 w-3" /> Linked</Badge>
            )}
          </div>
        }
        description={`${study.modality} — ${formatDate(study.studyDate)} — ${study.accession ? `ACC: ${study.accession}` : 'No accession'}`}
        icon={FileSearch}
        actions={
          <div className="flex items-center gap-2">
            {/* Layout toggle */}
            <div className="flex items-center gap-1.5 text-muted-foreground border rounded-md px-2 py-1">
              <LayoutList className={`h-3.5 w-3.5 ${layout === 'tabs' ? 'text-primary' : ''}`} />
              <Switch checked={layout === 'panels'} onCheckedChange={toggleLayout} className="h-4 w-7 data-[state=checked]:bg-primary" />
              <PanelLeft className={`h-3.5 w-3.5 ${layout === 'panels' ? 'text-primary' : ''}`} />
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/studies')} className="h-7 text-xs">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
          </div>
        }
      />

      {layout === 'tabs' ? (
        /* ===== Tab View ===== */
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <TabsList className="grid w-full grid-cols-5 h-8">
            <TabsTrigger value="overview" className="gap-1 text-xs h-7"><LayoutDashboard className="h-3 w-3" /> Overview</TabsTrigger>
            <TabsTrigger value="patient" className="gap-1 text-xs h-7">
              <Users className="h-3 w-3" /> Patient
              {data.patientComparison.discrepancies.length > 0 && (
                <Badge variant="secondary" className="h-3.5 w-3.5 p-0 flex items-center justify-center text-[9px] bg-amber-500 text-white">{data.patientComparison.discrepancies.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-1 text-xs h-7">
              <ClipboardList className="h-3 w-3" /> Orders
              {data.orders.length > 0 && <Badge variant="secondary" className="text-[9px] h-3.5 px-1">{data.orders.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1 text-xs h-7">
              <FileText className="h-3 w-3" /> Reports
              {data.reports.length > 0 && <Badge variant="secondary" className="text-[9px] h-3.5 px-1">{data.reports.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="series" className="gap-1 text-xs h-7">
              <Layers className="h-3 w-3" /> Series
              {seriesList.length > 0 && <Badge variant="secondary" className="text-[9px] h-3.5 px-1">{seriesList.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <StudyOverviewTab data={data} onDataChange={handleDataChange} onOpenLinkDialog={() => setLinkDialogOpen(true)} onOpenUnlinkDialog={() => setUnlinkDialogOpen(true)} />
          </TabsContent>
          <TabsContent value="patient">
            <PatientComparisonTab data={data} onDataChange={handleDataChange} onOpenMergeDialog={() => setMergeDialogOpen(true)} />
          </TabsContent>
          <TabsContent value="orders">
            <OrdersProceduresTab data={data} onDataChange={handleDataChange} />
          </TabsContent>
          <TabsContent value="reports">
            <ReportsTab data={data} onDataChange={handleDataChange} />
          </TabsContent>
          <TabsContent value="series">
            {seriesLoading ? (
              <div className="flex items-center justify-center h-24"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <SeriesDatasetsTab studyId={study.id} seriesList={seriesList} onSeriesChange={setSeriesList} />
            )}
          </TabsContent>
        </Tabs>
      ) : (
        /* ===== Panel View ===== */
        <PanelLayout
          data={data}
          seriesList={seriesList}
          seriesLoading={seriesLoading}
          onDataChange={handleDataChange}
          onSeriesChange={setSeriesList}
          onOpenLinkDialog={() => setLinkDialogOpen(true)}
          onOpenUnlinkDialog={() => setUnlinkDialogOpen(true)}
          onOpenMergeDialog={() => setMergeDialogOpen(true)}
        />
      )}

      {/* Dialogs (shared between both layouts) */}
      <LinkManagementDialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen} studyId={study.id} onDataChange={handleDataChange} />
      <UnlinkConfirmDialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen} studyId={study.id} onDataChange={handleDataChange} />
      {data.risPatient && (
        <PatientMergeDialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen} data={data} onDataChange={handleDataChange} />
      )}
    </div>
  );
}
