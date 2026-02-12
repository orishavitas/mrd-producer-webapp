'use client';

/**
 * Brief Field Component
 *
 * Container for a single field in the brief helper form.
 * Wraps SmartTextBox with label, help text, field counter badge,
 * and slots for gap detection and AI expansion panels.
 */

import React, { useState, useEffect } from 'react';
import { BriefField as BriefFieldType } from '../lib/brief-state';
import { getFieldDefinition } from '../lib/field-definitions';
import { useBrief } from '../lib/brief-context';
import SmartTextBox from './SmartTextBox';
import FieldStatusBadge from './FieldStatusBadge';
import GapSuggestion, { Gap } from './GapSuggestion';
import styles from './BriefField.module.css';

// ============================================================================
// Types
// ============================================================================

export interface BriefFieldProps {
  /** Field type identifier */
  fieldType: BriefFieldType;
  /** Field order number (1-6) for status badge */
  order: number;
}

// ============================================================================
// Component
// ============================================================================

export default function BriefField({ fieldType, order }: BriefFieldProps) {
  const { state, dispatch } = useBrief();
  const fieldDefinition = getFieldDefinition(fieldType);
  const fieldState = state.fields[fieldType];
  const [detectedGaps, setDetectedGaps] = useState<Gap[]>([]);
  const [isDetectingGaps, setIsDetectingGaps] = useState(false);

  // Handle text change
  const handleTextChange = (value: string) => {
    dispatch({
      type: 'SET_RAW_TEXT',
      payload: {
        fieldType,
        rawText: value,
      },
    });
  };

  // Handle pause (user stopped typing)
  const handlePause = async () => {
    console.log(`User paused typing in field: ${fieldType}`);

    // Skip if text is empty or AI is already processing
    if (!fieldState.rawText.trim() || fieldState.isAIProcessing) {
      return;
    }

    // Set AI processing state
    dispatch({
      type: 'SET_AI_PROCESSING',
      payload: {
        fieldType,
        isProcessing: true,
      },
    });

    try {
      // Call text extraction API
      const response = await fetch('/api/brief/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fieldType,
          freeText: fieldState.rawText,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.details || 'Extraction failed');
      }

      // Update state with extracted bullet points
      dispatch({
        type: 'SET_BULLET_POINTS',
        payload: {
          fieldType,
          bulletPoints: data.bulletPoints || [],
        },
      });

      console.log(`Extraction complete for ${fieldType}:`, {
        bulletCount: data.bulletPoints?.length || 0,
        confidence: data.confidence,
      });

      // Trigger gap detection after successful extraction
      if (data.bulletPoints && data.bulletPoints.length > 0) {
        detectGaps(data.bulletPoints, data.entities || []);
      }
    } catch (error) {
      console.error(`Extraction error for ${fieldType}:`, error);
      // TODO (Task 6): Show user-friendly error message
    } finally {
      // Clear AI processing state
      dispatch({
        type: 'SET_AI_PROCESSING',
        payload: {
          fieldType,
          isProcessing: false,
        },
      });
    }
  };

  // Detect gaps after extraction
  const detectGaps = async (
    bulletPoints: string[],
    entities: Array<{ type: string; value: string; confidence: number; span?: string }>
  ) => {
    setIsDetectingGaps(true);

    try {
      const response = await fetch('/api/brief/gaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fieldType,
          bulletPoints,
          entities,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.details || 'Gap detection failed');
      }

      // Update local state with detected gaps
      setDetectedGaps(data.gaps || []);

      // Update context state with gaps
      dispatch({
        type: 'SET_GAPS',
        payload: {
          fieldType,
          gaps: data.gaps || [],
        },
      });

      console.log(`Gap detection complete for ${fieldType}:`, {
        gapCount: data.gaps?.length || 0,
        completeness: data.completeness,
      });
    } catch (error) {
      console.error(`Gap detection error for ${fieldType}:`, error);
    } finally {
      setIsDetectingGaps(false);
    }
  };

  // Handle gap dismissal
  const handleDismissGap = (gapId: string) => {
    setDetectedGaps((prev) => prev.filter((gap) => gap.id !== gapId));

    // Also update context state
    dispatch({
      type: 'SET_GAPS',
      payload: {
        fieldType,
        gaps: detectedGaps.filter((gap) => gap.id !== gapId),
      },
    });
  };

  // Handle AI expansion (TODO: Task 7)
  const handleAIExpand = () => {
    console.log(`AI expansion requested for ${fieldType}`);
    // TODO (Task 7): Open AI expansion panel
  };

  return (
    <div className={styles.container}>
      {/* Field header with label and badge */}
      <div className={styles.header}>
        <label htmlFor={`field-${fieldType}`} className={styles.label}>
          {fieldDefinition.label}
        </label>
        <FieldStatusBadge
          currentField={order}
          totalFields={6}
          isComplete={fieldState.isComplete}
        />
      </div>

      {/* Help text */}
      <p className={styles.helpText}>{fieldDefinition.helpText}</p>

      {/* Smart text box */}
      <SmartTextBox
        id={`field-${fieldType}`}
        fieldType={fieldType}
        value={fieldState.rawText}
        onChange={handleTextChange}
        onPause={handlePause}
        isAIProcessing={fieldState.isAIProcessing}
        isComplete={fieldState.isComplete}
        placeholder={fieldDefinition.placeholder}
        aria-label={fieldDefinition.label}
      />

      {/* Extracted bullet points */}
      {fieldState.bulletPoints.length > 0 && (
        <div className={styles.bulletPoints}>
          <h4 className={styles.bulletPointsTitle}>AI Extracted Points:</h4>
          <ul className={styles.bulletPointsList}>
            {fieldState.bulletPoints.map((point, index) => (
              <li key={index} className={styles.bulletPoint}>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gap detection panel */}
      {detectedGaps.length > 0 && (
        <GapSuggestion
          gaps={detectedGaps}
          onDismissGap={handleDismissGap}
          onAIExpand={handleAIExpand}
          canExpand={true}
        />
      )}

      {/* AI expansion panel slot (Task 7) */}
      {/* TODO (Task 7): Render AI expansion panel when active */}
    </div>
  );
}
