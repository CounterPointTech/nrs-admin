'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  FileText, ChevronDown, ChevronRight, User, Calendar, AlertTriangle,
  Pencil, Save, X, Loader2, Plus, RotateCcw, Settings2, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  UnifiedStudyDetail, RisReport, UpdateRisReportRequest, CreateRisReportRequest,
  StandardReport,
} from '@/lib/types';
import { studyApi } from '@/lib/api';

function fmtDateTime(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const REPORT_TYPES = ['Final', 'Preliminary', 'Addendum', 'Correction'];
const REPORT_STATUSES = ['Draft', 'Transcribed', 'Signed', 'Corrected'];

function typeBadge(type: string) {
  const cls = { final: 'bg-emerald-600', preliminary: 'bg-secondary text-secondary-foreground', addendum: 'bg-blue-600', correction: 'bg-amber-600' }[type.toLowerCase()] || '';
  return <Badge className={`text-[10px] h-4 ${cls}`}>{type}</Badge>;
}

function statusBadge(status?: string) {
  if (!status) return null;
  const cls = { signed: '', transcribed: 'bg-secondary text-secondary-foreground', draft: 'bg-transparent border text-foreground', corrected: 'bg-amber-600' }[status.toLowerCase()] || '';
  return <Badge className={`text-[10px] h-4 ${cls}`} variant={status.toLowerCase() === 'draft' ? 'outline' : 'default'}>{status}</Badge>;
}

interface Props {
  data: UnifiedStudyDetail;
  onDataChange: (data: UnifiedStudyDetail) => void;
}

export function ReportsTab({ data, onDataChange }: Props) {
  const { study, reports, procedures } = data;
  const [expandedReports, setExpandedReports] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<UpdateRisReportRequest>({});
  const [saving, setSaving] = useState(false);

  // Create report state
  const [creatingForProc, setCreatingForProc] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState<CreateRisReportRequest>({ procedureId: 0, reportType: 'Final' });

  // Standard reports (precanned text)
  const [standardReports, setStandardReports] = useState<StandardReport[]>([]);
  const [standardReportsLoaded, setStandardReportsLoaded] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateText, setNewTemplateText] = useState('');
  const [templateSaving, setTemplateSaving] = useState(false);

  function toggleReport(id: number) {
    setExpandedReports(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function startEdit(r: RisReport) {
    setEditForm({
      reportText: r.reportText ?? '', notes: r.notes ?? '', status: r.status ?? '',
      reportType: r.reportType, requiresCorrection: r.requiresCorrection,
      customField1: r.customField1 ?? '', customField2: r.customField2 ?? '', customField3: r.customField3 ?? '',
    });
    setEditingId(r.reportId);
    setExpandedReports(prev => new Set(prev).add(r.reportId));
  }

  async function saveEdit(reportId: number) {
    setSaving(true);
    try {
      const res = await studyApi.updateRisReport(study.id, reportId, editForm);
      if (res.success && res.data) { onDataChange(res.data); setEditingId(null); toast.success('Report updated'); }
      else { toast.error(res.message || 'Update failed'); }
    } catch { toast.error('Failed to update report'); }
    finally { setSaving(false); }
  }

  async function startCreate(procedureId: number) {
    setCreateForm({ procedureId, reportType: 'Final', status: 'Draft', reportText: '', reportFormat: 'text', notes: '' });
    setCreatingForProc(procedureId);
    if (!standardReportsLoaded) {
      const res = await studyApi.getStandardReports();
      if (res.success && res.data) setStandardReports(res.data);
      setStandardReportsLoaded(true);
    }
  }

  async function saveCreate() {
    setSaving(true);
    try {
      const res = await studyApi.createRisReport(study.id, createForm);
      if (res.success && res.data) { onDataChange(res.data); setCreatingForProc(null); toast.success('Report created'); }
      else { toast.error(res.message || 'Create failed'); }
    } catch { toast.error('Failed to create report'); }
    finally { setSaving(false); }
  }

  async function loadStandardReports() {
    const res = await studyApi.getStandardReports();
    if (res.success && res.data) setStandardReports(res.data);
    setStandardReportsLoaded(true);
  }

  async function handleCreateTemplate() {
    if (!newTemplateName.trim()) return;
    setTemplateSaving(true);
    try {
      const res = await studyApi.createStandardReport(newTemplateName, newTemplateText);
      if (res.success) {
        toast.success('Standard report created');
        setNewTemplateName('');
        setNewTemplateText('');
        await loadStandardReports();
      } else { toast.error(res.message || 'Failed to create'); }
    } catch { toast.error('Failed to create standard report'); }
    finally { setTemplateSaving(false); }
  }

  async function handleDeleteTemplate(id: number) {
    try {
      const res = await studyApi.deleteStandardReport(id);
      if (res.success) {
        toast.success('Standard report deleted');
        await loadStandardReports();
      } else { toast.error(res.message || 'Failed to delete'); }
    } catch { toast.error('Failed to delete'); }
  }

  // Group reports by procedure
  const reportsByProc = new Map<number, RisReport[]>();
  for (const r of reports) {
    const list = reportsByProc.get(r.procedureId) ?? [];
    list.push(r);
    reportsByProc.set(r.procedureId, list);
  }

  // Show all procedures (even without reports) so you can add reports
  const procsToShow = procedures.length > 0 ? procedures : [];

  if (procsToShow.length === 0) {
    return (
      <Card className="shadow-none">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground font-medium">No procedures linked</p>
          <p className="text-xs text-muted-foreground mt-1">Link this study to a RIS order to manage reports.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {procsToShow.map(proc => {
        const procReports = reportsByProc.get(proc.procedureId) ?? [];

        return (
          <div key={proc.procedureId} className="space-y-2">
            {/* Procedure heading */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">{proc.procedureName || `Procedure #${proc.procedureId}`}</span>
                <Badge variant="secondary" className="text-[10px] h-4">{procReports.length} report{procReports.length !== 1 ? 's' : ''}</Badge>
              </div>
              <Button size="sm" variant="outline" onClick={() => startCreate(proc.procedureId)} className="gap-1 h-6 text-[11px]"
                disabled={creatingForProc === proc.procedureId}>
                <Plus className="h-3 w-3" /> Add Report
              </Button>
            </div>

            {/* Create form */}
            {creatingForProc === proc.procedureId && (
              <Card className="shadow-none border-blue-500/40 bg-blue-500/5">
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-sm">New Report</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[11px]">Type</Label>
                      <Select value={createForm.reportType} onValueChange={v => setCreateForm({ ...createForm, reportType: v })}>
                        <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                        <SelectContent>{REPORT_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[11px]">Status</Label>
                      <Select value={createForm.status || 'Draft'} onValueChange={v => setCreateForm({ ...createForm, status: v })}>
                        <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                        <SelectContent>{REPORT_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[11px]">Format</Label>
                      <Select value={createForm.reportFormat || 'text'} onValueChange={v => setCreateForm({ ...createForm, reportFormat: v })}>
                        <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text" className="text-xs">Plain Text</SelectItem>
                          <SelectItem value="html" className="text-xs">HTML</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* Standard report template selector */}
                  {standardReports.length > 0 && (
                    <div>
                      <Label className="text-[11px]">Use Standard Report</Label>
                      <Select value="" onValueChange={v => {
                        const sr = standardReports.find(r => r.standardReportId.toString() === v);
                        if (sr) setCreateForm({ ...createForm, reportText: sr.reportText });
                      }}>
                        <SelectTrigger className="h-7 text-xs mt-0.5">
                          <SelectValue placeholder="Select a template to pre-fill..." />
                        </SelectTrigger>
                        <SelectContent>
                          {standardReports.map(sr => (
                            <SelectItem key={sr.standardReportId} value={sr.standardReportId.toString()} className="text-xs">
                              {sr.shortReportName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label className="text-[11px]">Report Text</Label>
                    <textarea className="w-full min-h-[100px] rounded-md border border-input bg-background px-2 py-1.5 text-xs mt-0.5 ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                      value={createForm.reportText ?? ''} onChange={e => setCreateForm({ ...createForm, reportText: e.target.value })}
                      placeholder="Enter report text..." />
                  </div>
                  <div>
                    <Label className="text-[11px]">Notes</Label>
                    <Input value={createForm.notes ?? ''} onChange={e => setCreateForm({ ...createForm, notes: e.target.value })} className="h-6 text-xs mt-0.5" placeholder="Optional notes" />
                  </div>
                  <div className="flex gap-1.5 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setCreatingForProc(null)} disabled={saving} className="h-6 text-[11px]">Cancel</Button>
                    <Button size="sm" onClick={saveCreate} disabled={saving || !createForm.reportType} className="gap-1 h-6 text-[11px]">
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Create
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Existing reports */}
            {procReports.map(report => {
              const isExpanded = expandedReports.has(report.reportId);
              const isEditing = editingId === report.reportId;

              return (
                <Card key={report.reportId} className="shadow-none">
                  <CardHeader className="pb-1 pt-2 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleReport(report.reportId)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        {typeBadge(report.reportType)}
                        {statusBadge(report.status)}
                        {report.requiresCorrection && (
                          <Badge variant="destructive" className="text-[10px] h-4 gap-0.5"><AlertTriangle className="h-2.5 w-2.5" /> Correction</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground" onClick={e => e.stopPropagation()}>
                        {report.signingPhysicianName && (
                          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {report.signingPhysicianName}</span>
                        )}
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {fmtDateTime(report.signedDate || report.creationDate)}</span>
                        {isEditing ? (
                          <>
                            <Button size="sm" onClick={() => saveEdit(report.reportId)} disabled={saving} className="gap-1 h-6 text-[11px]">
                              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)} disabled={saving} className="h-6 text-[11px]"><X className="h-3 w-3" /></Button>
                          </>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => startEdit(report)} className="gap-1 h-6 text-[11px]"><Pencil className="h-3 w-3" /> Edit</Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="px-4 pb-3 pt-0">
                      {isEditing ? (
                        <div className="space-y-2 pt-2">
                          {/* Editable metadata row */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div>
                              <Label className="text-[11px]">Type</Label>
                              <Select value={editForm.reportType || report.reportType} onValueChange={v => setEditForm({ ...editForm, reportType: v })}>
                                <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                <SelectContent>{REPORT_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-[11px]">Status</Label>
                              <Select value={editForm.status || ''} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                                <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                <SelectContent>{REPORT_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-end gap-2 pb-0.5">
                              <Checkbox id={`corr-${report.reportId}`} checked={editForm.requiresCorrection ?? false}
                                onCheckedChange={c => setEditForm({ ...editForm, requiresCorrection: c === true })} />
                              <Label htmlFor={`corr-${report.reportId}`} className="text-[11px]">Requires Correction</Label>
                            </div>
                          </div>
                          {/* Report text */}
                          <div>
                            <Label className="text-[11px]">Report Text</Label>
                            <textarea className="w-full min-h-[150px] rounded-md border border-input bg-background px-2 py-1.5 text-xs mt-0.5 ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                              value={editForm.reportText ?? ''} onChange={e => setEditForm({ ...editForm, reportText: e.target.value })} />
                          </div>
                          {/* Notes + custom fields */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="col-span-2 sm:col-span-1">
                              <Label className="text-[11px]">Notes</Label>
                              <Input value={editForm.notes ?? ''} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className="h-6 text-xs mt-0.5" />
                            </div>
                            <div>
                              <Label className="text-[11px]">Custom 1</Label>
                              <Input value={editForm.customField1 ?? ''} onChange={e => setEditForm({ ...editForm, customField1: e.target.value })} className="h-6 text-xs mt-0.5" />
                            </div>
                            <div>
                              <Label className="text-[11px]">Custom 2</Label>
                              <Input value={editForm.customField2 ?? ''} onChange={e => setEditForm({ ...editForm, customField2: e.target.value })} className="h-6 text-xs mt-0.5" />
                            </div>
                            <div>
                              <Label className="text-[11px]">Custom 3</Label>
                              <Input value={editForm.customField3 ?? ''} onChange={e => setEditForm({ ...editForm, customField3: e.target.value })} className="h-6 text-xs mt-0.5" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Read-only metadata */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-0.5 mb-2 text-xs pt-2">
                            {report.reportingPhysicianName && (
                              <div><span className="text-muted-foreground">Reporting: </span><span className="font-medium">{report.reportingPhysicianName}</span></div>
                            )}
                            {report.signingPhysicianName && (
                              <div><span className="text-muted-foreground">Signing: </span><span className="font-medium">{report.signingPhysicianName}</span></div>
                            )}
                            {report.transcribedDate && (
                              <div><span className="text-muted-foreground">Transcribed: </span>{fmtDateTime(report.transcribedDate)}</div>
                            )}
                            {report.signedDate && (
                              <div><span className="text-muted-foreground">Signed: </span>{fmtDateTime(report.signedDate)}</div>
                            )}
                          </div>
                          {/* Report text */}
                          {report.reportText ? (
                            <div className="rounded-md border bg-muted/20 p-3">
                              {report.reportFormat?.toLowerCase() === 'html' ? (
                                <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: report.reportText }} />
                              ) : (
                                <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed">{report.reportText}</pre>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No report text</p>
                          )}
                        </>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        );
      })}

      {/* Manage Standard Reports button */}
      <div className="flex justify-end pt-2">
        <Button variant="outline" size="sm" className="gap-1 h-7 text-xs"
          onClick={() => { setManageOpen(true); if (!standardReportsLoaded) loadStandardReports(); }}>
          <Settings2 className="h-3 w-3" /> Manage Standard Reports
        </Button>
      </div>

      {/* Standard Reports Management Dialog */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Standard Reports</DialogTitle>
            <DialogDescription>
              Manage precanned report templates. Select these when creating new reports to pre-fill the text.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Existing templates */}
            {standardReports.length > 0 ? (
              <div className="space-y-2">
                {standardReports.map(sr => (
                  <div key={sr.standardReportId} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{sr.shortReportName}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteTemplate(sr.standardReportId)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{sr.reportText}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No standard reports yet.</p>
            )}

            {/* Add new template */}
            <div className="rounded-md border border-dashed p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add New Template</p>
              <Input value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)}
                placeholder="Template name (e.g. 'Normal Study')" className="h-8 text-xs" />
              <textarea className="w-full min-h-[80px] rounded-md border border-input bg-background px-2 py-1.5 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                value={newTemplateText} onChange={e => setNewTemplateText(e.target.value)}
                placeholder="Report text..." />
              <div className="flex justify-end">
                <Button size="sm" onClick={handleCreateTemplate} disabled={templateSaving || !newTemplateName.trim()}
                  className="gap-1 h-7 text-xs">
                  {templateSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Add Template
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManageOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
