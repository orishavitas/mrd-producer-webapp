'use client';

/**
 * MRD Generator - Main Page
 *
 * If no concept: show StartPage (redirect to start flow or show inline).
 * If concept: show SplitLayout (Chat + Sidebar left, Preview right).
 * On mount with concept and empty sections, trigger batch extract.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMRD } from './lib/mrd-context';
import { MRD_SECTION_IDS } from './lib/mrd-state';
import type { MRDSection } from './lib/mrd-state';
import SplitLayout from '../brief-helper/components/SplitLayout';
import LeftPanelStack from './components/LeftPanelStack';
import SectionPreview from './components/SectionPreview';
import StartPage from './components/StartPage';
import LoadingOverlay from './components/LoadingOverlay';
import styles from './page.module.css';

function MRDGeneratorContent() {
  const router = useRouter();
  const { state, dispatch } = useMRD();
  const [isLoading, setIsLoading] = useState(false);
  const [hasTriedBatch, setHasTriedBatch] = useState(false);

  const concept =
    typeof window !== 'undefined'
      ? sessionStorage.getItem('mrd-generator-concept')?.trim()
      : state.initialConcept?.trim();
  const hasConcept = !!concept;
  const hasAnyContent = MRD_SECTION_IDS.some(
    (id) => (state.sections[id]?.content?.trim().length ?? 0) > 0
  );

  useEffect(() => {
    if (!hasConcept) return;
    if (hasTriedBatch) return;
    if (hasAnyContent) return;

    setHasTriedBatch(true);
    dispatch({ type: 'SET_INITIAL_CONCEPT', payload: { concept: concept! } });
    runBatchExtract(concept!);
  }, [hasConcept, hasTriedBatch, hasAnyContent, concept]);

  const runBatchExtract = async (description: string) => {
    setIsLoading(true);
    dispatch({
      type: 'SET_PROCESSING_SECTIONS',
      payload: { sectionIds: [...MRD_SECTION_IDS] },
    });

    try {
      const res = await fetch('/api/mrd/batch-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: description }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.details || 'Batch extraction failed');
      }

      const sectionsPayload: Partial<
        Record<
          MRDSection,
          {
            content: string;
            subsections?: Record<string, { content: string }>;
          }
        >
      > = {};

      if (data.sections) {
        for (const [id, val] of Object.entries(data.sections)) {
          const v = val as { content?: string; subsections?: Record<string, { content: string }> };
          if (v?.content !== undefined) {
            sectionsPayload[id as MRDSection] = {
              content: typeof v.content === 'string' ? v.content : '',
              ...(v.subsections ? { subsections: v.subsections } : {}),
            };
          }
        }
      }

      dispatch({
        type: 'BATCH_POPULATE_SECTIONS',
        payload: {
          sections: sectionsPayload,
          gaps: data.gaps,
          documentName: data.suggestedDocumentName,
        },
      });

      if (data.suggestedDocumentName) {
        dispatch({
          type: 'SET_DOCUMENT_NAME',
          payload: { documentName: data.suggestedDocumentName },
        });
      }

      const firstId = MRD_SECTION_IDS[0];
      if (firstId) {
        dispatch({ type: 'SET_ACTIVE_SECTION', payload: { sectionId: firstId } });
      }
    } catch (err) {
      console.error('Batch extract error:', err);
      dispatch({ type: 'SET_PROCESSING_SECTIONS', payload: { sectionIds: [] } });
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasConcept) {
    return (
      <div className={styles.startWrapper}>
        <StartPage />
      </div>
    );
  }

  return (
    <>
      <SplitLayout
        leftPanel={<LeftPanelStack />}
        rightPanel={<SectionPreview />}
      />
      <LoadingOverlay
        processingSections={state.processingSections}
        isVisible={isLoading}
      />
    </>
  );
}

export default function MRDGeneratorPage() {
  return (
    <main className={styles.main}>
      <MRDGeneratorContent />
    </main>
  );
}
