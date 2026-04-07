'use client';

import { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, LayoutDashboard, Users, ClipboardList, FileText, Layers } from 'lucide-react';
import { UnifiedStudyDetail, Series, getStudyStatusLabel } from '@/lib/types';
import { StudyOverviewTab } from './study-overview-tab';
import { PatientComparisonTab } from './patient-comparison-tab';
import { OrdersProceduresTab } from './orders-procedures-tab';
import { ReportsTab } from './reports-tab';
import { SeriesDatasetsTab } from './series-datasets-tab';

type SectionId = 'overview' | 'patient' | 'orders' | 'reports' | 'series';

interface Section {
  id: SectionId;
  label: string;
  icon: React.ElementType;
}

const SECTIONS: Section[] = [
  { id: 'overview', label: 'Study Info', icon: LayoutDashboard },
  { id: 'series', label: 'Series & Images', icon: Layers },
  { id: 'patient', label: 'Patient', icon: Users },
  { id: 'orders', label: 'Orders', icon: ClipboardList },
  { id: 'reports', label: 'Reports', icon: FileText },
];

interface PanelLayoutProps {
  data: UnifiedStudyDetail;
  seriesList: Series[];
  seriesLoading: boolean;
  onDataChange: (data: UnifiedStudyDetail) => void;
  onSeriesChange: (updated: Series[]) => void;
  onOpenLinkDialog: () => void;
  onOpenUnlinkDialog: () => void;
  onOpenMergeDialog: () => void;
}

export function PanelLayout({
  data, seriesList, seriesLoading, onDataChange, onSeriesChange,
  onOpenLinkDialog, onOpenUnlinkDialog, onOpenMergeDialog,
}: PanelLayoutProps) {
  const [active, setActive] = useState<SectionId>('overview');
  const [pillStyle, setPillStyle] = useState({ top: 0, height: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const setBtnRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) btnRefs.current.set(id, el);
    else btnRefs.current.delete(id);
  }, []);

  // Measure the active button position for the sliding pill
  useLayoutEffect(() => {
    const btn = btnRefs.current.get(active);
    const nav = navRef.current;
    if (btn && nav) {
      const navRect = nav.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setPillStyle({
        top: btnRect.top - navRect.top,
        height: btnRect.height,
      });
    }
  }, [active]);

  function getBadge(id: SectionId) {
    switch (id) {
      case 'patient':
        return data.patientComparison.discrepancies.length > 0
          ? <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-amber-500 text-white ml-auto">{data.patientComparison.discrepancies.length}</Badge>
          : null;
      case 'orders':
        return data.orders.length > 0
          ? <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-auto">{data.orders.length}</Badge>
          : null;
      case 'reports':
        return data.reports.length > 0
          ? <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-auto">{data.reports.length}</Badge>
          : null;
      case 'series':
        return seriesList.length > 0
          ? <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-auto">{seriesList.length}</Badge>
          : null;
      default:
        return null;
    }
  }

  return (
    <div className="flex gap-3" style={{ minHeight: '500px' }}>
      {/* Left navigation */}
      <nav ref={navRef} className="w-44 shrink-0 rounded-lg border bg-card p-1.5 relative self-start sticky top-4">
        {/* Animated pill */}
        <div
          className="absolute left-1.5 right-1.5 rounded-full bg-primary/10 transition-all duration-300 ease-out pointer-events-none"
          style={{ top: `${pillStyle.top}px`, height: `${pillStyle.height}px` }}
        />

        {SECTIONS.map(section => {
          const Icon = section.icon;
          const isActive = active === section.id;
          return (
            <button
              key={section.id}
              ref={(el) => setBtnRef(section.id, el)}
              onClick={() => setActive(section.id)}
              className={`relative z-10 w-full flex items-center gap-2 px-3 py-2 rounded-full text-xs transition-colors ${
                isActive ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {section.label}
              {getBadge(section.id)}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Active section content */}
        {active === 'overview' && (
          <StudyOverviewTab data={data} onDataChange={onDataChange}
            onOpenLinkDialog={onOpenLinkDialog} onOpenUnlinkDialog={onOpenUnlinkDialog} />
        )}
        {active === 'patient' && (
          <PatientComparisonTab data={data} onDataChange={onDataChange} onOpenMergeDialog={onOpenMergeDialog} />
        )}
        {active === 'orders' && (
          <OrdersProceduresTab data={data} onDataChange={onDataChange} />
        )}
        {active === 'reports' && (
          <ReportsTab data={data} onDataChange={onDataChange} />
        )}
        {active === 'series' && (
          seriesLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <SeriesDatasetsTab studyId={data.study.id} seriesList={seriesList} onSeriesChange={onSeriesChange} />
          )
        )}
      </div>
    </div>
  );
}

