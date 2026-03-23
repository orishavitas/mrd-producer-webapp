/**
 * Suggestions View Component
 *
 * Right panel view showing AI suggestions and field recommendations.
 *
 * Layout:
 * - Top 60%: Active field suggestions (contextual tips, examples, patterns)
 * - Bottom 40%: Other fields needing attention (clickable gap list)
 *
 * Features:
 * - Context-aware suggestions based on field type
 * - Empty state when no gaps exist
 * - Clickable field list updates active field
 * - Independent scroll sections
 */

'use client';

import { useBriefContext } from '../lib/brief-context';
import { BriefField, Gap } from '../lib/brief-state';
import { getFieldLabel } from '../lib/field-definitions';
import styles from './SuggestionsView.module.css';

// ============================================================================
// Props
// ============================================================================

interface SuggestionsViewProps {
  activeFieldId: BriefField | null;
}

// ============================================================================
// Field-Specific Suggestions
// ============================================================================

const FIELD_SUGGESTIONS: Record<BriefField, { tips: string[]; examples: string[] }> = {
  what: {
    tips: [
      'Describe the core product concept in 1-2 sentences',
      'Include the primary function or purpose',
      'Mention key differentiators if known',
    ],
    examples: [
      'A secure tablet stand for retail POS systems with integrated cable management',
      'Desktop monitor mount with gas spring adjustment for ergonomic positioning',
    ],
  },
  who: {
    tips: [
      'Identify primary user roles or personas',
      'Include both end-users and decision-makers if different',
      'Consider technical expertise level',
    ],
    examples: [
      'Retail store managers and cashiers in small to medium businesses',
      'Office workers and IT managers in corporate environments',
    ],
  },
  where: {
    tips: [
      'Specify physical environments or contexts',
      'Include conditions (indoor/outdoor, temperature, etc.)',
      'Mention typical use scenarios',
    ],
    examples: [
      'Retail counters, restaurants, trade show booths - high-traffic public areas',
      'Office desks, conference rooms, home offices - professional workspaces',
    ],
  },
  moq: {
    tips: [
      'Specify minimum order quantity as a number',
      'Include timeframe constraints if relevant',
      'Mention budget considerations',
    ],
    examples: [
      '1000 units, need production in 12 weeks',
      '500 units for initial run, potential for 5000+ if successful',
    ],
  },
  'must-have': {
    tips: [
      'List only non-negotiable requirements',
      'Include critical safety or regulatory needs',
      'Specify compatibility requirements (VESA, mounting standards)',
    ],
    examples: [
      'VESA 75/100 compatible, lockable tablet security, cable routing channels',
      'Adjustable tilt/swivel, holds 10-20 lbs, desk clamp mount',
    ],
  },
  'nice-to-have': {
    tips: [
      'List features that would add value but are optional',
      'Consider aesthetic preferences or upgrades',
      'Think about future-proofing features',
    ],
    examples: [
      'Quick-release mechanism, integrated USB hub, premium finish options',
      'Tool-free assembly, cable concealment, multiple color choices',
    ],
  },
};

// ============================================================================
// Component
// ============================================================================

export default function SuggestionsView({ activeFieldId }: SuggestionsViewProps) {
  const { state, dispatch } = useBriefContext();

  // Get active field suggestions
  const activeSuggestions = activeFieldId ? FIELD_SUGGESTIONS[activeFieldId] : null;

  // Get fields with visible gaps (not hidden)
  const fieldsWithGaps: Array<{ fieldId: BriefField; label: string; gapCount: number }> = [];
  const allFields: BriefField[] = ['what', 'who', 'where', 'moq', 'must-have', 'nice-to-have'];

  allFields.forEach((fieldId) => {
    const fieldState = state.fields[fieldId];
    const visibleGaps = fieldState.gaps.filter(
      (gap: Gap) => !fieldState.hiddenGaps.includes(gap.id)
    );
    if (visibleGaps.length > 0) {
      fieldsWithGaps.push({
        fieldId,
        label: getFieldLabel(fieldId),
        gapCount: visibleGaps.length,
      });
    }
  });

  const handleFieldClick = (fieldId: BriefField) => {
    dispatch({
      type: 'SET_ACTIVE_FIELD',
      payload: { fieldId },
    });

    // Scroll to field in left panel (LeftPanel handles auto-scroll)
  };

  return (
    <div className={styles.container}>
      {/* Active Field Suggestions - Top 60% */}
      <div className={styles.activeSection}>
        <h3 className={styles.sectionTitle}>
          {activeFieldId ? `Tips for ${getFieldLabel(activeFieldId)}` : 'Select a field to see tips'}
        </h3>

        {activeSuggestions ? (
          <div className={styles.suggestions}>
            {/* Tips */}
            <div className={styles.tipsBox}>
              <h4 className={styles.subsectionTitle}>Best Practices</h4>
              <ul className={styles.tipsList}>
                {activeSuggestions.tips.map((tip, index) => (
                  <li key={index} className={styles.tip}>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Examples */}
            <div className={styles.examplesBox}>
              <h4 className={styles.subsectionTitle}>Examples</h4>
              <div className={styles.examplesList}>
                {activeSuggestions.examples.map((example, index) => (
                  <div key={index} className={styles.example}>
                    <svg className={styles.quoteIcon} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                    <p className={styles.exampleText}>{example}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className={styles.emptyText}>Click on a field to see contextual tips and examples</p>
          </div>
        )}
      </div>

      {/* Other Fields with Gaps - Bottom 40% */}
      <div className={styles.gapsSection}>
        <h3 className={styles.sectionTitle}>Fields Needing Attention</h3>

        {fieldsWithGaps.length > 0 ? (
          <ul className={styles.gapsList}>
            {fieldsWithGaps.map(({ fieldId, label, gapCount }) => (
              <li key={fieldId} className={styles.gapItem}>
                <button
                  className={`${styles.gapButton} ${activeFieldId === fieldId ? styles.active : ''}`}
                  onClick={() => handleFieldClick(fieldId)}
                  aria-label={`View ${label} - ${gapCount} gap${gapCount === 1 ? '' : 's'} detected`}
                >
                  <div className={styles.gapInfo}>
                    <span className={styles.gapLabel}>{label}</span>
                    <span className={styles.gapCount}>
                      {gapCount} gap{gapCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <svg className={styles.chevronIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.allClearState}>
            <svg className={styles.checkIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className={styles.allClearText}>Looking good! No gaps detected ✓</p>
          </div>
        )}
      </div>
    </div>
  );
}
