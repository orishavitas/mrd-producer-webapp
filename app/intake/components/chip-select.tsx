'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import styles from './chip-select.module.css';

interface ChipSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  allowCustom?: boolean;
  label?: string;
}

export default function ChipSelect({
  options,
  selected,
  onChange,
  allowCustom = false,
  label,
}: ChipSelectProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Track which values are custom (not in original options)
  const customValues = selected.filter((v) => !options.includes(v));

  function toggleOption(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((v) => v !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  function removeCustom(value: string) {
    onChange(selected.filter((v) => v !== value));
  }

  function handleAddCustom() {
    setShowCustomInput(true);
    // Focus input after render
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function submitCustomValue() {
    const trimmed = customValue.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
    }
    setCustomValue('');
    setShowCustomInput(false);
  }

  function handleCustomKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitCustomValue();
    } else if (e.key === 'Escape') {
      setCustomValue('');
      setShowCustomInput(false);
    }
  }

  function handleChipKeyDown(e: KeyboardEvent<HTMLButtonElement>, option: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleOption(option);
    }
  }

  return (
    <div className={styles.container}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.chipList} role="group" aria-label={label || 'Select options'}>
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              className={`${styles.chip} ${isSelected ? styles.chipSelected : styles.chipUnselected}`}
              onClick={() => toggleOption(option)}
              onKeyDown={(e) => handleChipKeyDown(e, option)}
              aria-pressed={isSelected}
            >
              {option}
            </button>
          );
        })}

        {/* Custom value chips */}
        {customValues.map((value) => (
          <span key={`custom-${value}`} className={`${styles.chip} ${styles.chipSelected} ${styles.chipCustom}`}>
            {value}
            <button
              type="button"
              className={styles.chipRemove}
              onClick={() => removeCustom(value)}
              aria-label={`Remove ${value}`}
            >
              &times;
            </button>
          </span>
        ))}

        {/* Add custom chip button */}
        {allowCustom && !showCustomInput && (
          <button
            type="button"
            className={`${styles.chip} ${styles.chipAdd}`}
            onClick={handleAddCustom}
            aria-label="Add custom option"
          >
            +
          </button>
        )}

        {/* Inline custom input */}
        {allowCustom && showCustomInput && (
          <span className={styles.customInputWrapper}>
            <input
              ref={inputRef}
              type="text"
              className={styles.customInput}
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={handleCustomKeyDown}
              onBlur={submitCustomValue}
              placeholder="Type & Enter"
              aria-label="Custom option value"
            />
          </span>
        )}
      </div>
    </div>
  );
}
