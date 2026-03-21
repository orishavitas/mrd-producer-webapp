'use client';

import { useState } from 'react';
import styles from './ChipInput.module.css';

interface ChipInputProps {
  label: string;
  chips: string[];
  onAdd: (chip: string) => void;
  onRemove: (chip: string) => void;
  placeholder?: string;
}

export default function ChipInput({ label, chips, onAdd, onRemove, placeholder }: ChipInputProps) {
  const [input, setInput] = useState('');

  const addChip = (text: string) => {
    const trimmed = text.trim();
    if (trimmed && !chips.includes(trimmed)) {
      onAdd(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addChip(input);
      setInput('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.includes(',')) {
      const parts = val.split(',');
      parts.forEach((part) => addChip(part));
      setInput('');
    } else {
      setInput(val);
    }
  };

  return (
    <div className={styles.container}>
      <span className={styles.label}>{label}</span>
      <div className={styles.chipArea}>
        {chips.map((chip) => (
          <span key={chip} className={styles.chip}>
            {chip}
            <button
              className={styles.remove}
              onClick={() => onRemove(chip)}
              aria-label={`Remove ${chip}`}
            >
              x
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={chips.length === 0 ? placeholder : ''}
          className={styles.input}
        />
      </div>
    </div>
  );
}
