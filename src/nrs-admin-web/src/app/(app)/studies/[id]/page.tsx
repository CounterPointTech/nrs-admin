'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { studyApi } from '@/lib/api';
import { StudyDetail, Series, Dataset, getStudyStatusLabel } from '@/lib/types';
import {
  FileSearch,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  Building,
  Hash,
  Layers,
  Image as ImageIcon,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatFileSize(bytes?: number | null): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusBadgeVariant(status: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 0: return 'outline';
    case 1: return 'secondary';
    case 2: case 3: return 'default';
    case 5: return 'destructive';
    default: return 'secondary';
  }
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}

export default function StudyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [study, setStudy] = useState<StudyDetail | null>(null);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [expandedSeries, setExpandedSeries] = useState<number | null>(null);
  const [datasets, setDatasets] = useState<Record<number, Dataset[]>>({});
  const [datasetsLoading, setDatasetsLoading] = useState<number | null>(null);

  useEffect(() => {
    async function loadStudy() {
      setLoading(true);
      const res = await studyApi.getById(Number(id));
      if (res.success && res.data) {
        setStudy(res.data);
        // Load series automatically
        setSeriesLoading(true);
        const seriesRes = await studyApi.getSeries(Number(id));
        if (seriesRes.success && seriesRes.data) {
          setSeriesList(seriesRes.data);
        }
        setSeriesLoading(false);
      } else {
        toast.error(res.message || 'Failed to load study');
      }
      setLoading(false);
    }
    loadStudy();
  }, [id]);

  async function toggleSeriesExpand(seriesId: number) {
    if (expandedSeries === seriesId) {
      setExpandedSeries(null);
      return;
    }

    setExpandedSeries(seriesId);

    // Load datasets if not cached
    if (!datasets[seriesId]) {
      setDatasetsLoading(seriesId);
      const res = await studyApi.getDatasets(seriesId);
      if (res.success && res.data) {
        setDatasets((prev) => ({ ...prev, [seriesId]: res.data! }));
      }
      setDatasetsLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!study) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Study not found</p>
        <Button variant="outline" onClick={() => router.push('/studies')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Search
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>{study.lastName}, {study.firstName}</span>
            <Badge variant={statusBadgeVariant(study.status)}>
              {getStudyStatusLabel(study.status)}
            </Badge>
          </div>
        }
        description={`${study.modality} study — ${formatDate(study.studyDate)}`}
        icon={FileSearch}
        actions={
          <Button variant="outline" onClick={() => router.push('/studies')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Search
          </Button>
        }
      />

      {/* Study Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Patient Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" /> Patient
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow label="Name" value={`${study.lastName}, ${study.firstName}${study.middleName ? ` ${study.middleName}` : ''}`} />
            <InfoRow label="MRN" value={study.patientId} mono />
            <InfoRow label="Gender" value={study.gender} />
            <InfoRow label="Date of Birth" value={formatDate(study.birthTime)} />
          </CardContent>
        </Card>

        {/* Study Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" /> Study
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow label="Study Date" value={formatDate(study.studyDate)} />
            <InfoRow label="Accession" value={study.accession} mono />
            <InfoRow label="Modality" value={study.modality} />
            <InfoRow label="Study UID" value={study.studyUid} mono />
            <InfoRow label="Anatomical Area" value={study.anatomicalArea} />
          </CardContent>
        </Card>

        {/* Clinical Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building className="h-4 w-4" /> Clinical
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow label="Facility" value={study.facilityName} />
            <InfoRow label="Institution" value={study.institution} />
            <InfoRow label="Referring Physician" value={study.physicianName} />
            <InfoRow label="Radiologist" value={study.radiologistName} />
            <InfoRow label="Priority" value={study.priority === 7 ? 'Stat' : study.priority === 0 ? 'Normal' : `Level ${study.priority}`} />
          </CardContent>
        </Card>
      </div>

      {/* Comments */}
      {study.comments && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{study.comments}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Hash className="h-4 w-4" /> Metadata
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8">
            <InfoRow label="Study Tags" value={study.studyTags} />
            <InfoRow label="Valid" value={study.isValid ? 'Yes' : 'No'} />
            <InfoRow label="Modified" value={formatDateTime(study.modifiedDate)} />
            <InfoRow label="First Processed" value={formatDateTime(study.firstProcessedDate)} />
            <InfoRow label="Last Image Processed" value={formatDateTime(study.lastImageProcessedDate)} />
            {[study.custom1, study.custom2, study.custom3, study.custom4, study.custom5, study.custom6].map(
              (val, i) => val ? <InfoRow key={i} label={`Custom ${i + 1}`} value={val} /> : null
            )}
          </div>
        </CardContent>
      </Card>

      {/* Series List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" />
            Series
            <Badge variant="secondary" className="ml-1">{seriesList.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {seriesLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : seriesList.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground">
              No series found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Modality</TableHead>
                  <TableHead>Series #</TableHead>
                  <TableHead>Images</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Key</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seriesList.map((series) => (
                  <>
                    <TableRow
                      key={series.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleSeriesExpand(series.id)}
                    >
                      <TableCell className="w-10">
                        {expandedSeries === series.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{series.description || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{series.modality}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{series.seriesId || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="tabular-nums">{series.numImages}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{series.manufacturer || '—'}</TableCell>
                      <TableCell>
                        {series.isKeyImages && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                      </TableCell>
                    </TableRow>

                    {/* Expanded datasets */}
                    {expandedSeries === series.id && (
                      <TableRow key={`${series.id}-datasets`}>
                        <TableCell colSpan={7} className="bg-muted/30 p-0">
                          <div className="px-8 py-3">
                            {datasetsLoading === series.id ? (
                              <div className="flex items-center gap-2 py-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm text-muted-foreground">Loading datasets...</span>
                              </div>
                            ) : !datasets[series.id] || datasets[series.id].length === 0 ? (
                              <p className="text-sm text-muted-foreground py-2">No datasets found</p>
                            ) : (
                              <>
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                  {datasets[series.id].length} dataset{datasets[series.id].length !== 1 ? 's' : ''}
                                </p>
                                <div className="rounded border bg-card">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Instance #</TableHead>
                                        <TableHead>Instance UID</TableHead>
                                        <TableHead>File Size</TableHead>
                                        <TableHead>MIME Type</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {datasets[series.id].map((ds) => (
                                        <TableRow key={ds.id}>
                                          <TableCell className="tabular-nums">{ds.instanceNumber}</TableCell>
                                          <TableCell className="font-mono text-xs max-w-xs truncate">{ds.instanceUid}</TableCell>
                                          <TableCell className="tabular-nums">{formatFileSize(ds.fileSize)}</TableCell>
                                          <TableCell className="text-xs">{ds.mimeType || '—'}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
