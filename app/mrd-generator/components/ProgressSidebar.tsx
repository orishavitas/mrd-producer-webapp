'use client';

import { useMRD } from '../lib/mrd-context';
import { MRD_SECTION_IDS } from '../lib/mrd-state';
import styles from './ProgressSidebar.module.css';

const SECTION_LABELS: Record<string, string> = {
  purpose_vision: 'Purpose & Vision',
  problem_statement: 'Problem Statement',
  target_market: 'Target Market',
  target_users: 'Target Users',
  product_description: 'Product Description',
  key_requirements: 'Key Requirements',
  design_aesthetics: 'Design & Aesthetics',
  target_price: 'Target Price',
  risks_thoughts: 'Risks & Thoughts',
  competition: 'Competition',
  additional_considerations: 'Additional',
  success_criteria: 'Success Criteria',
};

export default function ProgressSidebar() {
  const { state, dispatch } = useMRD();

  const completed = MRD_SECTION_IDS.filter(
    (id) => state.sections[id]?.isComplete
  ).length;
  const total = MRD_SECTION_IDS.length;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.progressLabel}>Sections</span>
        <span className={styles.progressCount}>
          {completed}/{total}
        </span>
      </div>
      <ul className={styles.list} role="list">
        {MRD_SECTION_IDS.map((sectionId) => {
          const section = state.sections[sectionId];
          const hasContent = (section?.content?.trim().length ?? 0) > 0;
          const isComplete = section?.isComplete ?? false;
          const hasGaps = (section?.gaps?.length ?? 0) > 0;
          const isActive = state.activeSectionId === sectionId;
          const label = SECTION_LABELS[sectionId] ?? sectionId;

          let status: 'done' | 'gaps' | 'empty' = 'empty';
          if (isComplete) status = 'done';
          else if (hasContent && hasGaps) status = 'gaps';
          else if (hasContent) status = 'done';

          return (
            <li key={sectionId} className={styles.item}>
              <button
                type="button"
                className={`${styles.sectionButton} ${isActive ? styles.active : ''} ${styles[status]}`}
                onClick={() =>
                  dispatch({
                    type: 'SET_ACTIVE_SECTION',
                    payload: { sectionId },
                  })
                }
                aria-pressed={isActive}
                aria-label={`${label}, ${status}`}
              >
                <span className={styles.statusIcon}>
                  {status === 'done' && '✓'}
                  {status === 'gaps' && '⚠'}
                  {status === 'empty' && '○'}
                </span>
                <span className={styles.sectionLabel}>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
