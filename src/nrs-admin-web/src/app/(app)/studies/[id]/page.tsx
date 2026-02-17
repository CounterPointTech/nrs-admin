'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { studyApi } from '@/lib/api';
import { StudyDetail, Series, Dataset, UpdateStudyRequest, getStudyStatusLabel, STUDY_STATUS_LABELS } from '@/lib/types';
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
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 0, label: 'New' },
  { value: 1, label: 'In Progress' },
  { value: 2, label: 'Read' },
  { value: 3, label: 'Final' },
  { value: 4, label: 'Addendum' },
  { value: 5, label: 'Cancelled' },
  { value: 6, label: 'On Hold' },
  { value: 7, label: 'Stat' },
];

const PRIORITY_OPTIONS = [
  { value: 0, label: 'Normal' },
  { value: 1, label: 'Level 1' },
  { value: 2, label: 'Level 2' },
  { value: 3, label: 'Level 3' },
  { value: 4, label: 'Level 4' },
  { value: 5, label: 'Level 5' },
  { value: 6, label: 'Level 6' },
  { value: 7, label: 'Stat' },
];

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

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<UpdateStudyRequest>({});

  useEffect(() => {
    async function loadStudy() {
      setLoading(true);
      const res = await studyApi.getById(Number(id));
      if (res.success && res.data) {
        setStudy(res.data);
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

  function startEditing() {
    if (!study) return;
    setEditForm({
      status: study.status,
      comments: study.comments ?? '',
      priority: study.priority,
      custom1: study.custom1 ?? '',
      custom2: study.custom2 ?? '',
      custom3: study.custom3 ?? '',
      custom4: study.custom4 ?? '',
      custom5: study.custom5 ?? '',
      custom6: study.custom6 ?? '',
    });
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setEditForm({});
  }

  async function handleSave() {
    if (!study) return;
    setSaving(true);
    try {
      const res = await studyApi.update(study.id, editForm);
      if (res.success && res.data) {
        setStudy(res.data);
        setEditing(false);
        toast.success('Study updated');
      } else {
        toast.error(res.message || 'Update failed');
      }
    } catch {
      toast.error('Failed to update study');
    } finally {
      setSaving(false);
    }
  }

  async function toggleSeriesExpand(seriesId: number) {
    if (expandedSeries === seriesId) {
      setExpandedSeries(null);
      return;
    }

    setExpandedSeries(seriesId);

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
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </Button>
                <Button variant="outline" onClick={cancelEditing} disabled={saving} className="gap-2">
                  <X className="h-4 w-4" /> Cancel
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={startEditing} className="gap-2">
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
            <Button variant="outline" onClick={() => router.push('/studies')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </div>
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
            {editing ? (
              <div className="flex justify-between items-center py-1.5">
                <span className="text-sm text-muted-foreground">Status</span>
                <Select
                  value={String(editForm.status ?? study.status)}
                  onValueChange={(v) => setEditForm({ ...editForm, status: Number(v) })}
                >
                  <SelectTrigger className="w-36 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={String(s.value)}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {editing ? (
              <div className="flex justify-between items-center py-1.5">
                <span className="text-sm text-muted-foreground">Priority</span>
                <Select
                  value={String(editForm.priority ?? study.priority)}
                  onValueChange={(v) => setEditForm({ ...editForm, priority: Number(v) })}
                >
                  <SelectTrigger className="w-36 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <InfoRow label="Priority" value={study.priority === 7 ? 'Stat' : study.priority === 0 ? 'Normal' : `Level ${study.priority}`} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Comments</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={editForm.comments ?? ''}
              onChange={(e) => setEditForm({ ...editForm, comments: e.target.value })}
              placeholder="Add comments..."
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{study.comments || <span className="text-muted-foreground">No comments</span>}</p>
          )}
        </CardContent>
      </Card>

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
          </div>
          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              {([1, 2, 3, 4, 5, 6] as const).map((n) => {
                const key = `custom${n}` as keyof UpdateStudyRequest;
                return (
                  <div key={n} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Custom {n}</Label>
                    <Input
                      value={(editForm[key] as string) ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                      className="h-8 text-sm"
                      placeholder={`Custom ${n}`}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8">
              {[study.custom1, study.custom2, study.custom3, study.custom4, study.custom5, study.custom6].map(
                (val, i) => val ? <InfoRow key={i} label={`Custom ${i + 1}`} value={val} /> : null
              )}
            </div>
          )}
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
