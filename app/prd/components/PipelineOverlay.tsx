'use client';

import styles from '../prd.module.css';

export type AgentStep = 'analyst' | 'architect' | 'human_gate' | 'writer' | 'qa' | 'done';

interface Props {
  currentStep: AgentStep;
}

const STEPS: { key: AgentStep; label: string }[] = [
  { key: 'analyst', label: 'Analyzing One-Pager' },
  { key: 'architect', label: 'Building PRD Skeleton' },
  { key: 'human_gate', label: 'Awaiting your review' },
  { key: 'writer', label: 'Writing PRD sections' },
  { key: 'qa', label: 'QA Review' },
];

const ORDER: AgentStep[] = ['analyst', 'architect', 'human_gate', 'writer', 'qa', 'done'];

function getIcon(stepKey: AgentStep, current: AgentStep): string {
  const stepIdx = ORDER.indexOf(stepKey);
  const currentIdx = ORDER.indexOf(current);
  if (current === 'done' || stepIdx < currentIdx) return '✅';
  if (stepKey === current) return '⏳';
  return '○';
}

export function PipelineOverlay({ currentStep }: Props) {
  return (
    <div className={styles.overlay}>
      <div className={styles.overlayCard}>
        <h2 className={styles.overlayTitle}>Generating PRD...</h2>
        <ul className={styles.checklist}>
          {STEPS.map((step) => (
            <li key={step.key} className={styles.checklistItem}>
              <span className={styles.checklistIcon}>{getIcon(step.key, currentStep)}</span>
              <span>{step.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
