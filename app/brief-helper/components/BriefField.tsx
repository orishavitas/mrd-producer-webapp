'use client';

/**
 * Brief Field Component
 *
 * Container for a single field in the brief helper form.
 * Wraps SmartTextBox with label, help text, field counter badge,
 * and slots for gap detection and AI expansion panels.
 */

import React from 'react';
import { BriefField as BriefFieldType } from '../lib/brief-state';
import { getFieldDefinition } from '../lib/field-definitions';
import { useBrief } from '../lib/brief-context';
import SmartTextBox from './SmartTextBox';
import FieldStatusBadge from './FieldStatusBadge';
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
  const handlePause = () => {
    console.log(`User paused typing in field: ${fieldType}`);
    // TODO (Task 5): Call text extraction agent API
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
        fieldType={fieldType}
        value={fieldState.rawText}
        onChange={handleTextChange}
        onPause={handlePause}
        isAIProcessing={fieldState.isAIProcessing}
        isComplete={fieldState.isComplete}
        placeholder={fieldDefinition.placeholder}
        aria-label={fieldDefinition.label}
      />

      {/* Gap detection panel slot (Task 6) */}
      {fieldState.gaps.length > 0 && (
        <div className={styles.gapSlot}>
          {/* TODO (Task 6): Render gap detection panel */}
          <div className={styles.placeholder}>Gap detection panel coming soon...</div>
        </div>
      )}

      {/* AI expansion panel slot (Task 7) */}
      {/* TODO (Task 7): Render AI expansion panel when active */}
    </div>
  );
}
