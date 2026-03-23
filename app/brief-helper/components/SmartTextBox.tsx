'use client';

/**
 * SmartTextBox Component
 *
 * Auto-expanding textarea with AI processing states and pause detection.
 * Provides visual feedback during typing, AI processing, and completion.
 */

import React, { useRef, useEffect, ChangeEvent } from 'react';
import { usePauseDetection } from '../lib/brief-context';
import { BriefField } from '../lib/brief-state';
import styles from './SmartTextBox.module.css';

// ============================================================================
// Types
// ============================================================================

export interface SmartTextBoxProps {
  /** Field type identifier */
  fieldType: BriefField;
  /** Current text value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Callback when user pauses typing (after debounce delay) */
  onPause: () => void;
  /** Whether AI is currently processing this field */
  isAIProcessing: boolean;
  /** Whether the field is marked complete */
  isComplete: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Accessible label */
  'aria-label': string;
  /** HTML id for label association */
  id?: string;
}

// ============================================================================
// Component
// ============================================================================

export default function SmartTextBox({
  fieldType,
  value,
  onChange,
  onPause,
  isAIProcessing,
  isComplete,
  placeholder,
  'aria-label': ariaLabel,
  id,
}: SmartTextBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Set up pause detection (2.5 second delay)
  usePauseDetection(value, onPause, 2500);

  // Auto-expand textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to get accurate scrollHeight
    textarea.style.height = 'auto';

    // Get the scroll height
    const scrollHeight = textarea.scrollHeight;

    // Clamp between min (120px) and max (400px)
    const MIN_HEIGHT = 120;
    const MAX_HEIGHT = 400;
    const newHeight = Math.max(MIN_HEIGHT, Math.min(scrollHeight, MAX_HEIGHT));

    // Set the new height
    textarea.style.height = `${newHeight}px`;
  }, [value]);

  // Handle text change
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  // Calculate character count
  const charCount = value.length;

  return (
    <div className={styles.container}>
      <textarea
        id={id}
        ref={textareaRef}
        className={styles.textarea}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
        data-ai-processing={isAIProcessing || undefined}
        data-complete={isComplete || undefined}
        rows={1}
      />
      {charCount > 0 && (
        <div className={styles.charCounter} aria-live="polite">
          {charCount.toLocaleString()} characters
        </div>
      )}
    </div>
  );
}
