'use client';

import React, { useState } from 'react';
import styles from '../prd.module.css';

interface Props {
  score: number;
  suggestions: { sectionKey: string; note: string }[];
}

export function QAPanel({ score, suggestions }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.qaPanel}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span className={styles.qaScore}>{score}</span>
          <span style={{ fontSize: 14, color: '#555', marginLeft: 6 }}>/100 QA score</span>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--brand-green-dark)',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {open ? 'Hide' : 'Show'} suggestions ({suggestions.length})
        </button>
      </div>
      {open && (
        <div style={{ marginTop: 16 }}>
          {suggestions.length === 0 ? (
            <p style={{ color: '#555', fontSize: 14, margin: 0 }}>No suggestions — PRD looks good!</p>
          ) : (
            <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
              {suggestions.map((s, i) => (
                <li key={i} style={{ fontSize: 14, marginBottom: 6, color: '#222' }}>
                  <strong>{s.sectionKey}:</strong> {s.note}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
