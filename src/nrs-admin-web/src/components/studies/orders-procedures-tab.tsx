'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Stethoscope,
  Pencil,
  Save,
  X,
  Loader2,
  Check,
  Clock,
  XCircle,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  UnifiedStudyDetail,
  RisOrder,
  RisOrderProcedure,
  RisProcedureStep,
  UpdateRisOrderRequest,
  UpdateRisOrderProcedureRequest,
} from '@/lib/types';
import { studyApi } from '@/lib/api';

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

function orderStatusVariant(status?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status?.toLowerCase()) {
    case 'complete': case 'completed': return 'default';
    case 'cancelled': return 'destructive';
    case 'scheduled': return 'secondary';
    default: return 'outline';
  }
}

function stepStatusIcon(status?: string) {
  switch (status?.toUpperCase()) {
    case 'COMPLETE': return <Check className="h-4 w-4 text-emerald-500" />;
    case 'CANCELLED': return <XCircle className="h-4 w-4 text-red-500" />;
    case 'PENDING': return <Clock className="h-4 w-4 text-amber-500" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || '—'}</span>
    </div>
  );
}

interface Props {
  data: UnifiedStudyDetail;
  onDataChange: (data: UnifiedStudyDetail) => void;
}

export function OrdersProceduresTab({ data, onDataChange }: Props) {
  const { study, orders, procedures } = data;
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set(orders.map(o => o.orderId)));
  const [expandedProcs, setExpandedProcs] = useState<Set<number>>(new Set());
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [editingProcId, setEditingProcId] = useState<number | null>(null);
  const [orderForm, setOrderForm] = useState<UpdateRisOrderRequest>({});
  const [procForm, setProcForm] = useState<UpdateRisOrderProcedureRequest>({});
  const [saving, setSaving] = useState(false);

  function toggleOrder(id: number) {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleProc(id: number) {
    setExpandedProcs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startEditOrder(order: RisOrder) {
    setOrderForm({
      description: order.description ?? '',
      notes: order.notes ?? '',
      patientComplaint: order.patientComplaint ?? '',
      physicianReason: order.physicianReason ?? '',
      customField1: order.customField1 ?? '',
      customField2: order.customField2 ?? '',
      customField3: order.customField3 ?? '',
      customField4: order.customField4 ?? '',
    });
    setEditingOrderId(order.orderId);
  }

  function startEditProc(proc: RisOrderProcedure) {
    setProcForm({
      notes: proc.notes ?? '',
      schedulerNotes: proc.schedulerNotes ?? '',
      customField1: proc.customField1 ?? '',
      customField2: proc.customField2 ?? '',
      customField3: proc.customField3 ?? '',
    });
    setEditingProcId(proc.procedureId);
  }

  async function saveOrder(orderId: number) {
    setSaving(true);
    try {
      const res = await studyApi.updateRisOrder(study.id, orderId, orderForm);
      if (res.success && res.data) {
        onDataChange(res.data);
        setEditingOrderId(null);
        toast.success('Order updated');
      } else {
        toast.error(res.message || 'Update failed');
      }
    } catch {
      toast.error('Failed to update order');
    } finally {
      setSaving(false);
    }
  }

  async function saveProc(procedureId: number) {
    setSaving(true);
    try {
      const res = await studyApi.updateRisProcedure(study.id, procedureId, procForm);
      if (res.success && res.data) {
        onDataChange(res.data);
        setEditingProcId(null);
        toast.success('Procedure updated');
      } else {
        toast.error(res.message || 'Update failed');
      }
    } catch {
      toast.error('Failed to update procedure');
    } finally {
      setSaving(false);
    }
  }

  // Group procedures by order
  const procsByOrder = new Map<number, RisOrderProcedure[]>();
  for (const p of procedures) {
    const list = procsByOrder.get(p.orderId) ?? [];
    list.push(p);
    procsByOrder.set(p.orderId, list);
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium mb-1">No RIS orders linked</p>
          <p className="text-sm text-muted-foreground">
            Link this study to a RIS order to view orders, procedures, and workflow steps.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const isExpanded = expandedOrders.has(order.orderId);
        const isEditingThis = editingOrderId === order.orderId;
        const orderProcs = procsByOrder.get(order.orderId) ?? [];

        return (
          <Card key={order.orderId}>
            {/* Order Header */}
            <CardHeader
              className="pb-3 cursor-pointer select-none hover:bg-muted/30 transition-colors"
              onClick={() => toggleOrder(order.orderId)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <ClipboardList className="h-4 w-4" />
                  Order #{order.orderId}
                  <Badge variant={orderStatusVariant(order.status)} className="ml-2">{order.status || 'Unknown'}</Badge>
                  {order.accessionNumber && (
                    <span className="text-xs font-mono text-muted-foreground ml-2">ACC: {order.accessionNumber}</span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {isEditingThis ? (
                    <>
                      <Button size="sm" onClick={() => saveOrder(order.orderId)} disabled={saving} className="gap-1 h-7">
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingOrderId(null)} disabled={saving} className="h-7">
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => startEditOrder(order)} className="h-7 gap-1">
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 space-y-4">
                {/* Order Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0 pl-6">
                  {isEditingThis ? (
                    <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Description</Label>
                        <Input value={orderForm.description ?? ''} onChange={(e) => setOrderForm({ ...orderForm, description: e.target.value })} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Patient Complaint</Label>
                        <Input value={orderForm.patientComplaint ?? ''} onChange={(e) => setOrderForm({ ...orderForm, patientComplaint: e.target.value })} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Physician Reason</Label>
                        <Input value={orderForm.physicianReason ?? ''} onChange={(e) => setOrderForm({ ...orderForm, physicianReason: e.target.value })} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Notes</Label>
                        <Input value={orderForm.notes ?? ''} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} className="h-8 text-sm" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <InfoRow label="Description" value={order.description} />
                      <InfoRow label="Referring Physician" value={order.referringPhysicianName} />
                      <InfoRow label="Patient Complaint" value={order.patientComplaint} />
                      <InfoRow label="Physician Reason" value={order.physicianReason} />
                      <InfoRow label="Created" value={formatDateTime(order.creationDate)} />
                      <InfoRow label="Notes" value={order.notes} />
                    </>
                  )}
                </div>

                {/* Procedures */}
                {orderProcs.length > 0 && (
                  <div className="pl-6 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Procedures ({orderProcs.length})
                    </p>
                    {orderProcs.map((proc) => {
                      const procExpanded = expandedProcs.has(proc.procedureId);
                      const isEditingProc = editingProcId === proc.procedureId;

                      return (
                        <div key={proc.procedureId} className="rounded-lg border bg-card">
                          {/* Procedure Header */}
                          <div
                            className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => toggleProc(proc.procedureId)}
                          >
                            <div className="flex items-center gap-2">
                              {procExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">{proc.procedureName || `Procedure #${proc.procedureId}`}</span>
                              {proc.modalityName && (
                                <Badge variant="outline" className="font-mono text-xs">{proc.modalityType || proc.modalityName}</Badge>
                              )}
                              <Badge variant={orderStatusVariant(proc.status)} className="text-xs">{proc.status || 'Unknown'}</Badge>
                              {proc.statFlag && (
                                <Badge variant="destructive" className="text-xs gap-0.5">
                                  <Zap className="h-3 w-3" /> STAT
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              {isEditingProc ? (
                                <>
                                  <Button size="sm" onClick={() => saveProc(proc.procedureId)} disabled={saving} className="gap-1 h-6 text-xs">
                                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingProcId(null)} disabled={saving} className="h-6">
                                    <X className="h-3 w-3" />
                                  </Button>
                                </>
                              ) : (
                                <Button size="sm" variant="ghost" onClick={() => startEditProc(proc)} className="h-6 text-xs gap-1">
                                  <Pencil className="h-3 w-3" /> Edit
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Procedure Details */}
                          {procExpanded && (
                            <div className="px-4 pb-3 border-t">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 pt-2 pl-5">
                                {isEditingProc ? (
                                  <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Notes</Label>
                                      <Input value={procForm.notes ?? ''} onChange={(e) => setProcForm({ ...procForm, notes: e.target.value })} className="h-7 text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Scheduler Notes</Label>
                                      <Input value={procForm.schedulerNotes ?? ''} onChange={(e) => setProcForm({ ...procForm, schedulerNotes: e.target.value })} className="h-7 text-sm" />
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <InfoRow label="Assigned Physician" value={proc.assignedPhysicianName} />
                                    <InfoRow label="Study UID" value={proc.studyUid} />
                                    <InfoRow label="Patient Class" value={proc.patientClass} />
                                    <InfoRow label="Patient Location" value={proc.patientLocation} />
                                    <InfoRow label="Visit #" value={proc.visitNumber} />
                                    <InfoRow label="Check-In" value={formatDateTime(proc.checkInTime)} />
                                    <InfoRow label="Start" value={formatDateTime(proc.procedureDateStart)} />
                                    <InfoRow label="End" value={formatDateTime(proc.procedureDateEnd)} />
                                    <InfoRow label="Notes" value={proc.notes} />
                                    <InfoRow label="Scheduler Notes" value={proc.schedulerNotes} />
                                  </>
                                )}
                              </div>

                              {/* Procedure Steps Timeline */}
                              {proc.steps.length > 0 && (
                                <div className="mt-3 pl-5">
                                  <p className="text-xs font-semibold text-muted-foreground mb-2">Steps</p>
                                  <div className="space-y-0">
                                    {proc.steps.map((step, idx) => (
                                      <div key={`${step.procedureId}-${step.stepNumber}`} className="flex items-start gap-3 relative">
                                        {/* Timeline line */}
                                        {idx < proc.steps.length - 1 && (
                                          <div className="absolute left-[7px] top-6 bottom-0 w-px bg-border" />
                                        )}
                                        {/* Status icon */}
                                        <div className="shrink-0 mt-0.5 z-10 bg-background">
                                          {stepStatusIcon(step.status)}
                                        </div>
                                        {/* Step info */}
                                        <div className="flex-1 pb-3">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">Step {step.stepNumber}</span>
                                            <Badge variant="outline" className="text-[10px]">{step.status || 'READY'}</Badge>
                                            {step.isDisabled && <Badge variant="secondary" className="text-[10px]">Disabled</Badge>}
                                          </div>
                                          {step.description && (
                                            <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                                          )}
                                          {step.completionDate && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                              Completed: {formatDateTime(step.completionDate)}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
