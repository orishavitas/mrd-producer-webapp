'use client';

/**
 * Brief Helper Page - V2
 *
 * Main page for creating product briefs with AI assistance.
 * Features split-screen layout with:
 * - Left panel: Input fields (collapsed or expanded)
 * - Right panel: AI Suggestions or Document Preview
 * - Batch extraction on mount from start page description
 */

import React, { useEffect, useState } from 'react';
import { BriefProvider, useBrief } from './lib/brief-context';
import SplitLayout from './components/SplitLayout';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import LoadingOverlay from './components/LoadingOverlay';
import { BriefField } from './lib/brief-state';

// ============================================================================
// Inner Component (with context access)
// ============================================================================

function BriefHelperContent() {
  const { state, dispatch } = useBrief();
  const [isLoading, setIsLoading] = useState(false);
  const [hasTriedBatchExtract, setHasTriedBatchExtract] = useState(false);

  // On mount: Read description from sessionStorage and trigger batch extraction
  useEffect(() => {
    // Only run once
    if (hasTriedBatchExtract) {
      return;
    }

    setHasTriedBatchExtract(true);

    // Check if we have a description from start page
    const description = sessionStorage.getItem('brief-helper-description');

    if (!description || !description.trim()) {
      console.log('No description found in sessionStorage, skipping batch extraction');
      return;
    }

    // Check if fields are already populated (e.g., from sessionStorage persistence)
    const hasAnyBullets = Object.values(state.fields).some((field) => field.bulletPoints.length > 0);
    if (hasAnyBullets) {
      console.log('Fields already populated, skipping batch extraction');
      return;
    }

    // Trigger batch extraction
    console.log('Starting batch extraction from description:', description.substring(0, 100) + '...');
    batchExtractFields(description);
  }, [hasTriedBatchExtract, state.fields]);

  // Batch extract all 6 fields from description
  const batchExtractFields = async (description: string) => {
    setIsLoading(true);

    // Set all fields as processing
    const allFields: BriefField[] = ['what', 'who', 'where', 'moq', 'must-have', 'nice-to-have'];
    dispatch({
      type: 'SET_PROCESSING_FIELDS',
      payload: { fields: allFields },
    });

    try {
      const response = await fetch('/api/brief/batch-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.details || 'Batch extraction failed');
      }

      console.log('Batch extraction complete:', {
        fieldCount: Object.keys(data.fields || {}).length,
        gapCount: Object.keys(data.gaps || {}).length,
      });

      // Build BATCH_POPULATE_FIELDS payload
      const fieldsPayload: {
        [K in BriefField]?: {
          bulletPoints: string[];
          gaps: any[];
        };
      } = {};

      allFields.forEach((fieldId) => {
        const fieldData = data.fields?.[fieldId];
        const fieldGaps = data.gaps?.[fieldId] || [];

        if (fieldData) {
          fieldsPayload[fieldId] = {
            bulletPoints: fieldData.bullets || [],
            gaps: fieldGaps,
          };
        }
      });

      // Dispatch batch populate action
      dispatch({
        type: 'BATCH_POPULATE_FIELDS',
        payload: { fields: fieldsPayload },
      });

      // Set first incomplete field as active
      const firstIncomplete = allFields.find(
        (fieldId) => (fieldsPayload[fieldId]?.bulletPoints.length || 0) === 0
      );
      if (firstIncomplete) {
        dispatch({
          type: 'SET_ACTIVE_FIELD',
          payload: { fieldId: firstIncomplete },
        });
      }
    } catch (error) {
      console.error('Batch extraction error:', error);
      // TODO: Show user-friendly error message
      alert('Failed to extract information. Please try again or fill fields manually.');

      // Clear processing state
      dispatch({
        type: 'SET_PROCESSING_FIELDS',
        payload: { fields: [] },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SplitLayout leftPanel={<LeftPanel />} rightPanel={<RightPanel />} />
      <LoadingOverlay processingFields={state.processingFields} isVisible={isLoading} />
    </>
  );
}

// ============================================================================
// Main Component (with Provider)
// ============================================================================

export default function BriefHelperPage() {
  return (
    <BriefProvider>
      <BriefHelperContent />
    </BriefProvider>
  );
}
