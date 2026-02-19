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
          <label key={opt.id} className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={selected.includes(opt.id)}
              onChange={() => onToggle(opt.id)}
              className={styles.checkbox}
            />
            <span className={styles.text}>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
