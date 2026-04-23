'use client';

import React from 'react';
import { PRDFrame } from '@/agent/agents/prd/types';
import { QAPanel } from './QAPanel';
import styles from '../prd.module.css';

interface Props {
  productName: string;
  frames: PRDFrame[];
  prdDocumentId: string;
  qaScore?: number;
  qaSuggestions?: { sectionKey: string; note: string }[];
  onRegenerate?: () => void;
}

function formatSectionTitle(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PRDViewer({
  productName,
  frames,
  prdDocumentId,
  qaScore,
  qaSuggestions,
  onRegenerate,
}: Props) {
  const sorted = [...frames].sort((a, b) => a.sectionOrder - b.sectionOrder);

  function handleExport(format: 'docx' | 'html') {
    window.open(`/api/pipeline/prd/${prdDocumentId}/export?format=${format}`, '_blank');
  }

  return (
    <div>
      {qaScore !== undefined && <QAPanel score={qaScore} suggestions={qaSuggestions ?? []} />}
      <div className={styles.exportBar}>
        <button className={styles.exportBtn} onClick={() => handleExport('docx')}>
          Export DOCX
        </button>
        <button className={styles.exportBtn} onClick={() => handleExport('html')}>
          Export HTML
        </button>
        {onRegenerate && (
          <button className={styles.exportBtn} style={{ background: '#666' }} onClick={onRegenerate}>
            Regenerate
          </button>
        )}
      </div>
      <div className={styles.prdViewer}>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 28,
            color: 'var(--brand-primary)',
            marginBottom: 8,
            margin: '0 0 8px 0',
          }}
        >
          {productName}
        </h1>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 32, margin: '0 0 32px 0' }}>
          Product Requirements Document
        </p>
        {sorted.map((frame) => (
          <div key={frame.sectionKey}>
            <h2 className={styles.prdSectionTitle}>{formatSectionTitle(frame.sectionKey)}</h2>
            <p className={styles.prdContent}>{frame.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
