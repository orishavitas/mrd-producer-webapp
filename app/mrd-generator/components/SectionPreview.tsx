'use client';

import { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import { useMRD } from '../lib/mrd-context';
import { MRD_SECTION_IDS } from '../lib/mrd-state';
import styles from './SectionPreview.module.css';

// Sanitize markdown output for safe HTML (basic)
marked.setOptions({ gfm: true });

const SECTION_LABELS: Record<string, string> = {
  purpose_vision: '1. Purpose & Vision',
  problem_statement: '2. Problem Statement',
  target_market: '3. Target Market & Use Cases',
  target_users: '4. Target Users',
  product_description: '5. Product Description',
  key_requirements: '6. Key Requirements',
  design_aesthetics: '7. Design & Aesthetics',
  target_price: '8. Target Price',
  risks_thoughts: '9. Risks and Thoughts',
  competition: '10. Competition to review',
  additional_considerations: '11. Additional Considerations',
  success_criteria: '12. Success Criteria',
};

export default function SectionPreview() {
  const { state } = useMRD();
  const activeRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const sectionsForExport: Partial<
        Record<string, { content: string; subsections?: Record<string, { content: string }> }>
      > = {};
      for (const id of MRD_SECTION_IDS) {
        const s = state.sections[id];
        if (!s) continue;
        const subsections: Record<string, { content: string }> = {};
        if (s.subsections) {
          for (const [subId, sub] of Object.entries(s.subsections)) {
            if (sub?.content) subsections[subId] = { content: sub.content };
          }
        }
        sectionsForExport[id] = {
          content: s.content ?? '',
          ...(Object.keys(subsections).length > 0 ? { subsections } : {}),
        };
      }
      const res = await fetch('/api/mrd/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: sectionsForExport,
          documentName: state.documentName || 'MRD-Document',
        }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${state.documentName || 'MRD-Document'}-MRD-${new Date().toISOString().slice(0, 10)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (state.activeSectionId && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [state.activeSectionId]);

  const previewMode = state.previewMode;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>MRD Preview</h2>
          {state.documentName && (
            <p className={styles.subtitle}>{state.documentName}</p>
          )}
        </div>
        <button
          type="button"
          className={styles.exportButton}
          onClick={handleExport}
          disabled={exporting}
          aria-label="Export as DOCX"
        >
          {exporting ? 'Exporting…' : 'Export DOCX'}
        </button>
      </header>

      <div className={styles.content}>
        {MRD_SECTION_IDS.map((sectionId) => {
          const section = state.sections[sectionId];
          const content = section?.content?.trim() ?? '';
          const hasContent = content.length > 0;
          const isComplete = section?.isComplete ?? false;
          const hasGaps = (section?.gaps?.length ?? 0) > 0;
          const isIncomplete = !hasContent || (!isComplete && hasGaps);
          const isActive = state.activeSectionId === sectionId;
          const showInPreview =
            previewMode === 'full' || (previewMode === 'completed' && hasContent);

          if (!showInPreview) return null;

          const label = SECTION_LABELS[sectionId] ?? sectionId;

          return (
            <section
              key={sectionId}
              ref={isActive ? activeRef : null}
              className={`${styles.section} ${isIncomplete ? styles.incomplete : ''} ${isActive ? styles.active : ''}`}
              id={`section-${sectionId}`}
            >
              <h3 className={styles.sectionTitle}>{label}</h3>
              {hasContent ? (
                <div
                  className={styles.markdown}
                  dangerouslySetInnerHTML={{
                    __html: marked(content) as string,
                  }}
                />
              ) : (
                <p className={styles.placeholder}>— Section incomplete —</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
