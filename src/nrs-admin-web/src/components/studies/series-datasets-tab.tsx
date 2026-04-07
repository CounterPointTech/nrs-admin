'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Layers, Image as ImageIcon, Star, ChevronDown, ChevronRight, Loader2,
  Pencil, Save, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Series, Dataset } from '@/lib/types';
import { studyApi } from '@/lib/api';

function formatFileSize(bytes?: number | null): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  studyId: number;
  seriesList: Series[];
  onSeriesChange?: (updated: Series[]) => void;
}

export function SeriesDatasetsTab({ studyId, seriesList, onSeriesChange }: Props) {
  const [expandedSeries, setExpandedSeries] = useState<number | null>(null);
  const [datasets, setDatasets] = useState<Record<number, Dataset[]>>({});
  const [datasetsLoading, setDatasetsLoading] = useState<number | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editModality, setEditModality] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function toggleSeriesExpand(seriesId: number) {
    if (expandedSeries === seriesId) { setExpandedSeries(null); return; }
    setExpandedSeries(seriesId);
    if (!datasets[seriesId]) {
      setDatasetsLoading(seriesId);
      const res = await studyApi.getDatasets(seriesId);
      if (res.success && res.data) setDatasets(prev => ({ ...prev, [seriesId]: res.data! }));
      setDatasetsLoading(null);
    }
  }

  function startEdit(s: Series, e: React.MouseEvent) {
    e.stopPropagation();
    setEditModality(s.modality);
    setEditDescription(s.description || '');
    setEditingId(s.id);
  }

  function cancelEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(null);
  }

  async function saveEdit(seriesId: number, e: React.MouseEvent) {
    e.stopPropagation();
    const original = seriesList.find(s => s.id === seriesId);
    if (!original) return;

    const changes: Record<string, string> = {};
    if (editModality !== original.modality) changes.modality = editModality;
    if (editDescription !== (original.description || '')) changes.description = editDescription;

    if (Object.keys(changes).length === 0) { setEditingId(null); return; }

    setSaving(true);
    try {
      const res = await studyApi.updateSeries(seriesId, changes);
      if (res.success && res.data) {
        onSeriesChange?.(res.data);
        setEditingId(null);
        toast.success('Series updated');
      } else {
        toast.error(res.message || 'Update failed');
      }
    } catch { toast.error('Failed to update series'); }
    finally { setSaving(false); }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4" />
          Series
          <Badge variant="secondary" className="ml-1">{seriesList.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {seriesList.length === 0 ? (
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
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {seriesList.map((series) => {
                const isEditing = editingId === series.id;

                return (
                  <>
                    <TableRow
                      key={series.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => !isEditing && toggleSeriesExpand(series.id)}
                    >
                      <TableCell className="w-10">
                        {expandedSeries === series.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input value={editDescription} onChange={e => setEditDescription(e.target.value)}
                            className="h-6 text-xs" onClick={e => e.stopPropagation()}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(series.id, e as unknown as React.MouseEvent); if (e.key === 'Escape') setEditingId(null); }} autoFocus />
                        ) : (
                          <span className="font-medium">{series.description || '—'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input value={editModality} onChange={e => setEditModality(e.target.value.toUpperCase())}
                            className="h-6 text-xs font-mono w-16" onClick={e => e.stopPropagation()} maxLength={16} />
                        ) : (
                          <Badge variant="outline" className="font-mono">{series.modality}</Badge>
                        )}
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
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-0.5">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={e => saveEdit(series.id, e)} disabled={saving}>
                              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={cancelEdit} disabled={saving}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={e => startEdit(series, e)} title="Edit series">
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>

                    {expandedSeries === series.id && (
                      <TableRow key={`${series.id}-datasets`}>
                        <TableCell colSpan={8} className="bg-muted/30 p-0">
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
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
