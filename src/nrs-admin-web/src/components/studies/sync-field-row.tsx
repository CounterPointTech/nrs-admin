'use client';

import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, Check, AlertTriangle, Pencil, X, ArrowLeftRight, RotateCcw } from 'lucide-react';

export interface SyncFieldState {
  pacsValue: string;
  risValue: string;
}

interface SyncFieldRowProps {
  label: string;
  original: SyncFieldState;
  current: SyncFieldState;
  onChange: (next: SyncFieldState) => void;
  formatFn?: (value: string) => string;
  /**
   * Optional trailing slot rendered in the middle controls cluster. Used for per-field
   * side actions (e.g. "Use Standard Procedure" on the Description row). Kept compact
   * by convention — h-5 icon buttons fit the row height.
   */
  extraAction?: ReactNode;
}

export function SyncFieldRow({ label, original, current, onChange, formatFn, extraAction }: SyncFieldRowProps) {
  const [editing, setEditing] = useState(false);
  const [editPacs, setEditPacs] = useState('');
  const [editRis, setEditRis] = useState('');

  const pacs = current.pacsValue;
  const ris = current.risValue;
  const isMatch = pacs.toLowerCase() === ris.toLowerCase() && (pacs !== '' || ris !== '');
  const hasMismatch = pacs !== '' && ris !== '' && !isMatch;
  const bothEmpty = pacs === '' && ris === '';
  const pacsChanged = pacs !== original.pacsValue;
  const risChanged = ris !== original.risValue;
  const anyChanged = pacsChanged || risChanged;

  const display = (v: string) => (!v ? '—' : formatFn ? formatFn(v) : v);

  function startEditing() {
    setEditPacs(pacs);
    setEditRis(ris);
    setEditing(true);
  }

  function applyEdits() {
    onChange({ pacsValue: editPacs, risValue: editRis });
    setEditing(false);
  }

  function pushToRis() { onChange({ ...current, risValue: pacs }); }
  function pushToPacs() { onChange({ ...current, pacsValue: ris }); }
  function copyPacsToRis() { setEditRis(editPacs); }
  function copyRisToPacs() { setEditPacs(editRis); }
  function copyToBoth() { const v = editPacs || editRis; setEditPacs(v); setEditRis(v); }
  function revert() { onChange({ ...original }); }

  if (editing) {
    return (
      <div className="rounded-md border border-blue-500/40 bg-blue-500/5 px-3 py-1.5 text-xs space-y-1.5">
        {/* Edit row */}
        <div className="flex items-center gap-2">
          <span className="w-20 shrink-0 font-medium text-muted-foreground">{label}</span>

          {/* PACS input */}
          <div className="flex-1 min-w-0 flex items-center gap-1">
            <Badge variant="outline" className="shrink-0 text-[9px] h-4 px-1 text-blue-500 border-blue-500/30">PACS</Badge>
            <Input value={editPacs} onChange={(e) => setEditPacs(e.target.value)} className="h-5 text-xs flex-1" placeholder="PACS value"
              onKeyDown={(e) => { if (e.key === 'Enter') applyEdits(); if (e.key === 'Escape') setEditing(false); }} autoFocus />
          </div>

          {/* Middle controls */}
          <div className="flex items-center gap-0.5 shrink-0">
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-blue-500" onClick={copyPacsToRis} title="Copy PACS → RIS"><ArrowRight className="h-3 w-3" /></Button>
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={copyToBoth} title="Make both the same"><ArrowLeftRight className="h-2.5 w-2.5" /></Button>
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-purple-500" onClick={copyRisToPacs} title="Copy RIS → PACS"><ArrowLeft className="h-3 w-3" /></Button>
          </div>

          {/* RIS input */}
          <div className="flex-1 min-w-0 flex items-center gap-1">
            <Input value={editRis} onChange={(e) => setEditRis(e.target.value)} className="h-5 text-xs flex-1" placeholder="RIS value"
              onKeyDown={(e) => { if (e.key === 'Enter') applyEdits(); if (e.key === 'Escape') setEditing(false); }} />
            <Badge variant="outline" className="shrink-0 text-[9px] h-4 px-1 text-purple-500 border-purple-500/30">RIS</Badge>
          </div>
        </div>

        {/* Apply / Cancel */}
        <div className="flex items-center gap-1.5 justify-end">
          <Button size="sm" variant="ghost" className="h-5 text-[10px] px-2" onClick={() => setEditing(false)}>Cancel</Button>
          <Button size="sm" className="h-5 text-[10px] px-2" onClick={applyEdits}>Apply</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors ${
      anyChanged ? 'border-blue-500/40 bg-blue-500/5' :
      hasMismatch ? 'border-amber-500/40 bg-amber-500/5' :
      isMatch ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border'
    }`}>
      {/* Label */}
      <span className="w-20 shrink-0 font-medium text-muted-foreground">{label}</span>

      {/* PACS */}
      <div className="flex-1 min-w-0 flex items-center gap-1">
        <Badge variant="outline" className={`shrink-0 text-[9px] h-4 px-1 ${pacsChanged ? 'text-blue-600 border-blue-500 bg-blue-500/10 font-bold' : 'text-blue-500 border-blue-500/30'}`}>PACS</Badge>
        <span className={`truncate ${!pacs ? 'text-muted-foreground italic' : ''} ${pacsChanged ? 'text-blue-600 font-semibold' : ''}`}>
          {display(pacs)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-0.5 shrink-0">
        {bothEmpty ? (
          <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px]" onClick={startEditing}>
            <Pencil className="h-2.5 w-2.5 mr-0.5" /> Set
          </Button>
        ) : (
          <>
            {pacs && !isMatch && <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-blue-500" onClick={pushToRis} title="Push PACS→RIS"><ArrowRight className="h-3 w-3" /></Button>}
            {ris && !isMatch && <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-purple-500" onClick={pushToPacs} title="Push RIS→PACS"><ArrowLeft className="h-3 w-3" /></Button>}
            {isMatch && !anyChanged && <Check className="h-3.5 w-3.5 text-emerald-500" />}
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={startEditing} title="Edit both"><Pencil className="h-2.5 w-2.5" /></Button>
            {anyChanged && <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-muted-foreground" onClick={revert} title="Revert"><RotateCcw className="h-2.5 w-2.5" /></Button>}
            {hasMismatch && !anyChanged && <AlertTriangle className="h-3 w-3 text-amber-500" />}
          </>
        )}
        {extraAction}
      </div>

      {/* RIS */}
      <div className="flex-1 min-w-0 flex items-center gap-1 justify-end">
        <span className={`truncate ${!ris ? 'text-muted-foreground italic' : ''} ${risChanged ? 'text-blue-600 font-semibold' : ''}`}>
          {display(ris)}
        </span>
        <Badge variant="outline" className={`shrink-0 text-[9px] h-4 px-1 ${risChanged ? 'text-blue-600 border-blue-500 bg-blue-500/10 font-bold' : 'text-purple-500 border-purple-500/30'}`}>RIS</Badge>
      </div>
    </div>
  );
}
