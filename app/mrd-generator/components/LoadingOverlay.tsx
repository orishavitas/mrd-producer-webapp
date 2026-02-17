/**
 * Loading Overlay Component - MRD Generator
 *
 * Full-screen overlay for batch MRD extraction progress.
 *
 * Features:
 * - Full-screen overlay with backdrop blur
 * - Center modal (max-width: 600px)
 * - Title: "Generating your MRD..."
 * - Progress checklist (12 items, one per section):
 *   - ✓ Done (green checkmark)
 *   - ⏳ Processing (blue, animated spinner)
 *   - ⌛ Pending (gray, waiting)
 * - Fade in on mount (200ms)
 * - Fade out on complete (300ms)
 * - Prevent interaction while visible (z-index: 1000)
 */

'use client';

import { useEffect, useState } from 'react';
import { MRDSection } from '../lib/mrd-state';
import styles from './LoadingOverlay.module.css';

// ============================================================================
// Types
// ============================================================================

interface LoadingOverlayProps {
  /** Sections currently being processed */
  processingSections: MRDSection[];
  /** Whether overlay should be visible */
  isVisible: boolean;
}

type SectionStatus = 'pending' | 'processing' | 'done';

interface SectionProgress {
  id: MRDSection;
  label: string;
  status: SectionStatus;
}

// ============================================================================
// Component
// ============================================================================

export default function LoadingOverlay({ processingSections, isVisible }: LoadingOverlayProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // All 12 MRD sections in order
  const allSections: MRDSection[] = [
    'purpose_vision',
    'problem_statement',
    'target_market',
    'target_users',
    'product_description',
    'key_requirements',
    'design_aesthetics',
    'target_price',
    'risks_thoughts',
    'competition',
    'additional_considerations',
    'success_criteria',
  ];

  // Calculate current processing section index
  const currentSectionIndex = processingSections.length > 0
    ? allSections.indexOf(processingSections[0])
    : -1;

  // Build progress checklist
  const progressChecklist: SectionProgress[] = allSections.map((sectionId, index) => {
    let status: SectionStatus = 'pending';

    if (index < currentSectionIndex) {
      status = 'done';
    } else if (index === currentSectionIndex) {
      status = 'processing';
    }

    return {
      id: sectionId,
      label: getSectionLabel(sectionId),
      status,
    };
  });

  // Handle fade in/out animations
  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setFadeOut(false);
    } else if (shouldRender) {
      // Start fade out
      setFadeOut(true);
      // Remove from DOM after fade out completes
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, shouldRender]);

  // Don't render if not visible and fade out complete
  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={`${styles.overlay} ${fadeOut ? styles.fadeOut : styles.fadeIn}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="loading-title"
      aria-describedby="loading-description"
    >
      <div className={styles.backdrop} onClick={(e) => e.stopPropagation()} />

      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 id="loading-title" className={styles.title}>
            Generating your MRD...
          </h2>
          <p id="loading-description" className={styles.subtitle}>
            Extracting all 12 sections from your product concept
          </p>
        </div>

        <div className={styles.progressList} role="status" aria-live="polite">
          {progressChecklist.map((section) => (
            <div key={section.id} className={styles.progressItem}>
              {/* Status Icon */}
              {section.status === 'done' && (
                <svg className={`${styles.icon} ${styles.iconDone}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}

              {section.status === 'processing' && (
                <div className={`${styles.icon} ${styles.iconProcessing}`}>
                  <svg className={styles.spinner} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                  </svg>
                </div>
              )}

              {section.status === 'pending' && (
                <svg className={`${styles.icon} ${styles.iconPending}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                </svg>
              )}

              {/* Section Label */}
              <span className={`${styles.label} ${styles[`label${capitalize(section.status)}`]}`}>
                {section.label}
              </span>
            </div>
          ))}
        </div>

        {/* Current Processing Section */}
        {currentSectionIndex >= 0 && (
          <div className={styles.currentSection}>
            <div className={styles.currentSectionDot} />
            <p className={styles.currentSectionText}>
              Processing: {getSectionLabel(progressChecklist[currentSectionIndex].id)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Client-safe section labels mapping (to avoid importing server-side section-definitions.ts)
 */
function getSectionLabel(sectionId: MRDSection): string {
  const labels: Record<MRDSection, string> = {
    purpose_vision: 'Purpose & Vision',
    problem_statement: 'Problem Statement',
    target_market: 'Target Market & Use Cases',
    target_users: 'Target Users',
    product_description: 'Product Description',
    key_requirements: 'Key Requirements',
    design_aesthetics: 'Design & Aesthetics',
    target_price: 'Target Price',
    risks_thoughts: 'Risks and Thoughts',
    competition: 'Competition to Review',
    additional_considerations: 'Additional Considerations',
    success_criteria: 'Success Criteria',
  };
  return labels[sectionId] ?? sectionId;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
