'use client';

import { useRef, useCallback, useLayoutEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useRoutingContext, type RoutingSectionId } from './routing-context';
import { DashboardSection } from './dashboard-section';
import { DestinationsSection } from './destinations-section';
import { ZonesSection } from './zones-section';
import { QueueSection } from './queue-section';
import { ErrorsHistorySection } from './errors-history-section';
import {
  LayoutDashboard,
  Radio,
  Waypoints,
  Clock,
  AlertTriangle,
} from 'lucide-react';

interface Section {
  id: RoutingSectionId;
  label: string;
  icon: React.ElementType;
}

const SECTIONS: Section[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'destinations', label: 'Destinations', icon: Radio },
  { id: 'zones', label: 'Zones', icon: Waypoints },
  { id: 'queue', label: 'Queue', icon: Clock },
  { id: 'errors', label: 'Errors', icon: AlertTriangle },
];

export function RoutingPanelLayout() {
  const { activeSection, navigateTo, destinations, zones, summary } = useRoutingContext();
  const [pillStyle, setPillStyle] = useState({ top: 0, height: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const setBtnRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) btnRefs.current.set(id, el);
    else btnRefs.current.delete(id);
  }, []);

  useLayoutEffect(() => {
    const btn = btnRefs.current.get(activeSection);
    const nav = navRef.current;
    if (btn && nav) {
      const navRect = nav.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setPillStyle({
        top: btnRect.top - navRect.top,
        height: btnRect.height,
      });
    }
  }, [activeSection]);

  function getBadge(id: RoutingSectionId) {
    switch (id) {
      case 'destinations':
        return destinations.length > 0
          ? <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-auto">{destinations.length}</Badge>
          : null;
      case 'zones':
        return zones.length > 0
          ? <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-auto">{zones.length}</Badge>
          : null;
      case 'queue':
        return summary && summary.totals.pending > 0
          ? <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-auto">{summary.totals.pending}</Badge>
          : null;
      case 'errors':
        return summary && summary.totals.errors > 0
          ? <Badge className="text-[9px] h-4 px-1 ml-auto bg-destructive text-destructive-foreground">{summary.totals.errors}</Badge>
          : null;
      default:
        return null;
    }
  }

  return (
    <div className="flex gap-3" style={{ minHeight: '400px' }}>
      {/* Left navigation */}
      <nav ref={navRef} className="w-44 shrink-0 rounded-lg border bg-card p-1.5 relative self-start sticky top-4">
        <div
          className="absolute left-1.5 right-1.5 rounded-full bg-primary/10 transition-all duration-300 ease-out pointer-events-none"
          style={{ top: `${pillStyle.top}px`, height: `${pillStyle.height}px` }}
        />

        {SECTIONS.map(section => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              ref={(el) => setBtnRef(section.id, el)}
              onClick={() => navigateTo(section.id)}
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
      <div className="flex-1 min-w-0">
        {activeSection === 'dashboard' && <DashboardSection />}
        {activeSection === 'destinations' && <DestinationsSection />}
        {activeSection === 'zones' && <ZonesSection />}
        {activeSection === 'queue' && <QueueSection />}
        {activeSection === 'errors' && <ErrorsHistorySection />}
      </div>
    </div>
  );
}
