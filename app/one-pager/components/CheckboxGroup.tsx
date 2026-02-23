'use client';

import styles from './CheckboxGroup.module.css';

interface CheckboxGroupProps {
  label: string;
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}

export default function CheckboxGroup({ label, options, selected, onToggle }: CheckboxGroupProps) {
  return (
    <div className={styles.container}>
      <span className={styles.groupLabel}>{label}</span>
      <div className={styles.grid}>
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={selected.includes(opt.id) ? styles.chipSelected : styles.chip}
            onClick={() => onToggle(opt.id)}
            aria-pressed={selected.includes(opt.id)}
          >
            {selected.includes(opt.id) && <span className={styles.checkMark}>✓</span>}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
