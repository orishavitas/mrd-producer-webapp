'use client';

/**
 * Brief Field Component
 *
 * Container for a single field in the brief helper form.
 * Wraps SmartTextBox with label, help text, field counter badge,
 * and slots for gap detection and AI expansion panels.
 */

import React, { useState, useEffect } from 'react';
import { BriefField as BriefFieldType, BriefField as FieldId } from '../lib/brief-state';
import { getFieldDefinition } from '../lib/field-definitions';
import { useBrief } from '../lib/brief-context';
import SmartTextBox from './SmartTextBox';
import FieldStatusBadge from './FieldStatusBadge';
import GapSuggestion, { Gap } from './GapSuggestion';
import AIExpansionPanel from './AIExpansionPanel';
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
  const [showAIPanel, setShowAIPanel] = useState(false);

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

  // Handle gap hiding
  const handleHideGap = (gapId: string) => {
    dispatch({
      type: 'HIDE_GAP',
      payload: {
        fieldType,
        gapId,
      },
    });
  };

  // Handle AI expansion
  const handleAIExpand = () => {
    console.log(`AI expansion requested for ${fieldType}`);
    setShowAIPanel(true);
  };

  // Handle accepting AI suggestions
  const handleAcceptSuggestions = (bullets: string[]) => {
    // Merge with existing bullets (avoid duplicates)
    const existingSet = new Set(fieldState.bulletPoints.map((b) => b.toLowerCase()));
    const newBullets = bullets.filter(
      (b) => !existingSet.has(b.toLowerCase())
    );

    const mergedBullets = [...fieldState.bulletPoints, ...newBullets];

    // Update state
    dispatch({
      type: 'SET_BULLET_POINTS',
      payload: {
        fieldType,
        bulletPoints: mergedBullets,
      },
    });

    // Mark field as complete if it has content
    if (mergedBullets.length > 0) {
      dispatch({
        type: 'MARK_COMPLETE',
        payload: {
          fieldType,
          isComplete: true,
        },
      });
    }

    console.log(`Accepted ${newBullets.length} new bullet points for ${fieldType}`);
  };

  // Handle closing AI panel
  const handleCloseAIPanel = () => {
    setShowAIPanel(false);
  };

  // Handle marking field as done and collapsing
  const handleDone = () => {
    // Mark field as complete
    dispatch({
      type: 'MARK_COMPLETE',
      payload: {
        fieldType,
        isComplete: true,
      },
    });

    // Collapse field
    dispatch({
      type: 'COLLAPSE_FIELD',
      payload: { fieldType },
    });

    // Find next incomplete field and focus it
    const allFields: FieldId[] = ['what', 'who', 'where', 'moq', 'must-have', 'nice-to-have'];
    const currentIndex = allFields.indexOf(fieldType);
    const nextIncompleteField = allFields
      .slice(currentIndex + 1)
      .find((f) => !state.fields[f].isComplete);

    if (nextIncompleteField) {
      dispatch({
        type: 'SET_ACTIVE_FIELD',
        payload: { fieldId: nextIncompleteField },
      });
    }
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

      {/* Extracted bullet points: frame with checkbox + content + edit */}
      {fieldState.bulletPoints.length > 0 && (
        <div className={styles.bulletPoints}>
          <h4 className={styles.bulletPointsTitle}>AI Extracted Points:</h4>
          <ul className={styles.bulletPointsList} role="list">
            {fieldState.bulletPoints.map((point, index) => {
              const included =
                fieldState.includedBullets?.[index] ??
                true;
              return (
                <li key={index} className={styles.bulletRow}>
                  <label className={styles.bulletRowLabel}>
                    <input
                      type="checkbox"
                      checked={included}
                      onChange={() =>
                        dispatch({
                          type: 'TOGGLE_BULLET_INCLUDED',
                          payload: { fieldType, index },
                        })
                      }
                      aria-label={`Include in export: ${point.slice(0, 40)}…`}
                      className={styles.bulletCheckbox}
                    />
                    <span className={styles.bulletPointText}>{point}</span>
                  </label>
                  <button
                    type="button"
                    className={styles.bulletEditButton}
                    onClick={handleAIExpand}
                    aria-label={`Edit ${fieldDefinition.label}`}
                  >
                    Edit
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Gap detection panel */}
      {detectedGaps.length > 0 && (
        <GapSuggestion
          gaps={detectedGaps}
          fieldId={fieldType}
          hiddenGapIds={fieldState.hiddenGaps}
          onDismissGap={handleDismissGap}
          onHideGap={handleHideGap}
          onAIExpand={handleAIExpand}
          canExpand={true}
        />
      )}

      {/* AI expansion panel */}
      {showAIPanel && (
        <AIExpansionPanel
          fieldType={fieldType}
          currentBullets={fieldState.bulletPoints}
          gaps={detectedGaps}
          onAcceptSuggestions={handleAcceptSuggestions}
          onClose={handleCloseAIPanel}
        />
      )}

      {/* Done button - only show if field has content */}
      {fieldState.bulletPoints.length > 0 && !fieldState.isComplete && (
        <div className={styles.doneButtonContainer}>
          <button className={styles.doneButton} onClick={handleDone} type="button">
            Mark as Done
          </button>
        </div>
      )}
    </div>
  );
}
