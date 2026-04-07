'use client';

import { useEffect, useRef } from 'react';
import type { Editor } from 'grapesjs';
import type { TemplatePlaceholder } from '@/lib/types';

interface GrapesJsEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholders: TemplatePlaceholder[];
}

// Convert HTML comment placeholders to visible spans for GrapesJS canvas
function commentsToSpans(html: string): string {
  return html.replace(
    /<!--(\w+)-->/g,
    '<span class="nrs-ph" data-ph="$1" contenteditable="false" style="background:#dbeafe;border:1px solid #93c5fd;border-radius:3px;padding:0 4px;font-size:11px;color:#1d4ed8;white-space:nowrap;">[$1]</span>'
  );
}

// Convert visible spans back to HTML comment placeholders
function spansToComments(html: string): string {
  return html.replace(
    /<span[^>]*class="nrs-ph"[^>]*data-ph="(\w+)"[^>]*>[^<]*<\/span>/gi,
    '<!--$1-->'
  );
}

// Extract <body> content from a full HTML document, preserving the wrapper
function extractBody(html: string): { body: string; before: string; after: string } {
  const match = html.match(/([\s\S]*<body[^>]*>)([\s\S]*?)(<\/body>[\s\S]*)/i);
  if (match) {
    return { before: match[1], body: match[2], after: match[3] };
  }
  return { before: '', body: html, after: '' };
}

// Inject GrapesJS CSS via a <link> tag (bypasses Tailwind/PostCSS bundling)
function ensureGrapesJsCss() {
  const id = 'grapesjs-editor-css';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = '/css/grapes.min.css';
  document.head.appendChild(link);
}

function addPlaceholderBlocks(bm: Editor['BlockManager'], placeholders: TemplatePlaceholder[]) {
  const categories = [...new Set(placeholders.map(p => p.category))];
  for (const cat of categories) {
    const catPlaceholders = placeholders.filter(p => p.category === cat);
    for (const p of catPlaceholders) {
      bm.add(`ph-${p.name}`, {
        label: p.name,
        category: `Placeholders: ${cat}`,
        content: `<span class="nrs-ph" data-ph="${p.name}" contenteditable="false" style="background:#dbeafe;border:1px solid #93c5fd;border-radius:3px;padding:0 4px;font-size:11px;color:#1d4ed8;white-space:nowrap;">[${p.name}]</span>`,
      });
    }
  }
}

function addReportBlocks(bm: Editor['BlockManager']) {
  bm.add('patient-info-row', {
    label: 'Patient Info Row',
    category: 'Report Sections',
    content: `<table width="100%" style="margin-bottom:8px;">
      <tr>
        <td><strong>Patient:</strong> <span class="nrs-ph" data-ph="PatientName" contenteditable="false" style="background:#dbeafe;border:1px solid #93c5fd;border-radius:3px;padding:0 4px;font-size:11px;color:#1d4ed8;">[PatientName]</span></td>
        <td><strong>MRN:</strong> <span class="nrs-ph" data-ph="PatientID" contenteditable="false" style="background:#dbeafe;border:1px solid #93c5fd;border-radius:3px;padding:0 4px;font-size:11px;color:#1d4ed8;">[PatientID]</span></td>
        <td><strong>DOB:</strong> <span class="nrs-ph" data-ph="DOB" contenteditable="false" style="background:#dbeafe;border:1px solid #93c5fd;border-radius:3px;padding:0 4px;font-size:11px;color:#1d4ed8;">[DOB]</span></td>
      </tr>
    </table>`,
  });

  bm.add('report-text-area', {
    label: 'Report Text',
    category: 'Report Sections',
    content: `<div style="margin:16px 0;"><span class="nrs-ph" data-ph="ReportText" contenteditable="false" style="background:#dbeafe;border:1px solid #93c5fd;border-radius:3px;padding:0 4px;font-size:11px;color:#1d4ed8;">[ReportText]</span></div>`,
  });

  bm.add('section-header', {
    label: 'Section Header',
    category: 'Report Sections',
    content: '<h3 style="border-bottom:1px solid #ccc;padding-bottom:4px;margin:12px 0 8px;">Section Title</h3>',
  });

  bm.add('signature-block', {
    label: 'Signature Block',
    category: 'Report Sections',
    content: `<div style="margin-top:24px;">
      <strong><span class="nrs-ph" data-ph="SigningPhysicianName" contenteditable="false" style="background:#dbeafe;border:1px solid #93c5fd;border-radius:3px;padding:0 4px;font-size:11px;color:#1d4ed8;">[SigningPhysicianName]</span></strong><br/>
      <span class="nrs-ph" data-ph="SigningPhysicianSignatureImage" contenteditable="false" style="background:#dbeafe;border:1px solid #93c5fd;border-radius:3px;padding:0 4px;font-size:11px;color:#1d4ed8;">[SigningPhysicianSignatureImage]</span><br/>
      Signed: <span class="nrs-ph" data-ph="DateSigned" contenteditable="false" style="background:#dbeafe;border:1px solid #93c5fd;border-radius:3px;padding:0 4px;font-size:11px;color:#1d4ed8;">[DateSigned]</span>
    </div>`,
  });

  bm.add('site-image', {
    label: 'Site Image',
    category: 'Report Sections',
    content: `<div style="text-align:center;margin:8px 0;"><span class="nrs-ph" data-ph="SiteImage" contenteditable="false" style="background:#dbeafe;border:1px solid #93c5fd;border-radius:3px;padding:0 4px;font-size:11px;color:#1d4ed8;">[SiteImage]</span></div>`,
  });

  bm.add('footer-image', {
    label: 'Footer Image',
    category: 'Report Sections',
    content: `<div style="text-align:center;margin:4px 0;"><span class="nrs-ph" data-ph="ReportFooterImage" contenteditable="false" style="background:#dbeafe;border:1px solid #93c5fd;border-radius:3px;padding:0 4px;font-size:11px;color:#1d4ed8;">[ReportFooterImage]</span></div>`,
  });

  bm.add('addendum-section', {
    label: 'Addendum Section',
    category: 'Report Sections',
    content: `<div style="margin:16px 0;border-top:2px solid #999;padding-top:8px;">
      <h4>Addendum</h4>
      <p><span class="nrs-ph" data-ph="AddendumReport" contenteditable="false" style="background:#dbeafe;border:1px solid #93c5fd;border-radius:3px;padding:0 4px;font-size:11px;color:#1d4ed8;">[AddendumReport]</span></p>
      <p><strong><span class="nrs-ph" data-ph="AddendumSigningPhysician" contenteditable="false" style="background:#dbeafe;border:1px solid #93c5fd;border-radius:3px;padding:0 4px;font-size:11px;color:#1d4ed8;">[AddendumSigningPhysician]</span></strong> — <span class="nrs-ph" data-ph="AddendumSignedDate" contenteditable="false" style="background:#dbeafe;border:1px solid #93c5fd;border-radius:3px;padding:0 4px;font-size:11px;color:#1d4ed8;">[AddendumSignedDate]</span></p>
    </div>`,
  });

  bm.add('spacer', {
    label: 'Spacer',
    category: 'Layout',
    content: '<div style="height:20px;"></div>',
  });

  bm.add('hr', {
    label: 'Horizontal Rule',
    category: 'Layout',
    content: '<hr style="border:none;border-top:1px solid #ccc;margin:12px 0;" />',
  });
}

export function GrapesJsEditor({ content, onChange, placeholders }: GrapesJsEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const readyRef = useRef(false);
  const wrapperRef = useRef<{ before: string; after: string }>({ before: '', after: '' });

  // Keep stable refs for props that change — avoids re-triggering the init effect
  const contentRef = useRef(content);
  const onChangeRef = useRef(onChange);
  const placeholdersRef = useRef(placeholders);
  contentRef.current = content;
  onChangeRef.current = onChange;
  placeholdersRef.current = placeholders;

  // Single init effect — runs once on mount, cleans up on unmount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let destroyed = false;
    let gjsEditor: Editor | null = null;

    ensureGrapesJsCss();

    const { body, before, after } = extractBody(contentRef.current);
    wrapperRef.current = { before, after };

    (async () => {
      const grapesjs = (await import('grapesjs')).default;

      // Check if component unmounted during async import
      if (destroyed) return;

      gjsEditor = grapesjs.init({
        container,
        height: '100%',
        width: 'auto',
        storageManager: false,
        fromElement: false,
        components: commentsToSpans(body),
        style: '',
        // Custom UI — we provide our own block/style panels outside the GrapesJS container,
        // so skip built-in panels. This also makes the canvas use full width/height
        // instead of calc(100% - var(--gjs-left-width)) which reserves space for panels.
        customUI: true,
        panels: { defaults: [] },
        blockManager: {
          appendTo: '#gjs-blocks',
        },
        styleManager: {
          appendTo: '#gjs-styles',
        },
        deviceManager: {
          devices: [
            { name: 'Letter', width: '8.5in' },
            { name: 'A4', width: '210mm' },
            { name: 'Full', width: '' },
          ],
        },
      });

      if (destroyed) {
        gjsEditor.destroy();
        return;
      }

      // Add blocks — uses current placeholders from ref
      const bm = gjsEditor.BlockManager;
      addPlaceholderBlocks(bm, placeholdersRef.current);
      addReportBlocks(bm);

      // Emit changes — only after canvas is fully loaded
      function emitChange() {
        if (!readyRef.current || !gjsEditor) return;
        const html = gjsEditor.getHtml();
        const w = wrapperRef.current;
        const body = spansToComments(html);
        const full = (w.before || w.after) ? w.before + body + w.after : body;
        onChangeRef.current(full);
      }

      gjsEditor.on('component:update', emitChange);
      gjsEditor.on('component:add', emitChange);
      gjsEditor.on('component:remove', emitChange);

      // Mark ready once the canvas frame has actually loaded
      gjsEditor.on('canvas:frame:load', () => {
        readyRef.current = true;
      });

      editorRef.current = gjsEditor;
    })();

    return () => {
      destroyed = true;
      readyRef.current = false;
      if (gjsEditor) {
        gjsEditor.destroy();
      }
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty — init once, use refs for changing props

  return (
    <div className="flex h-full" style={{ minHeight: 0 }}>
      {/* Block panel */}
      <div
        id="gjs-blocks"
        className="w-56 shrink-0 border-r overflow-y-auto bg-card"
        style={{ maxHeight: '100%' }}
      />
      {/* Canvas — needs explicit dimensions for GrapesJS iframe */}
      <div
        ref={containerRef}
        className="flex-1 relative"
        style={{ minHeight: 0, minWidth: 0 }}
      />
      {/* Style panel */}
      <div
        id="gjs-styles"
        className="w-56 shrink-0 border-l overflow-y-auto bg-card"
        style={{ maxHeight: '100%' }}
      />
    </div>
  );
}
