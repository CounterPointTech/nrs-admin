'use client';

import { useMemo } from 'react';
import { TemplatePlaceholder } from '@/lib/types';

interface TemplatePreviewProps {
  content: string;
  placeholders: TemplatePlaceholder[];
  className?: string;
}

export function TemplatePreview({ content, placeholders, className }: TemplatePreviewProps) {
  const rendered = useMemo(() => {
    if (!content) return '';

    let result = content;

    // Replace placeholder comments with sample values
    for (const p of placeholders) {
      result = result.replaceAll(p.tag, p.sampleValue);
    }

    // Replace cid: image references with placeholder SVG
    result = result.replace(
      /src\s*=\s*(['"])cid:[^'"]+\1/gi,
      `src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='60'%3E%3Crect width='200' height='60' fill='%23e2e8f0'/%3E%3Ctext x='100' y='35' text-anchor='middle' fill='%2364748b' font-size='12'%3EImage Placeholder%3C/text%3E%3C/svg%3E"`
    );

    return result;
  }, [content, placeholders]);

  return (
    <iframe
      srcDoc={rendered}
      sandbox="allow-same-origin"
      className={className}
      style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
      title="Template Preview"
    />
  );
}
