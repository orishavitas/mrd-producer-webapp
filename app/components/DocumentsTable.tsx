'use client';

import React, { useState } from 'react';
import type { LibraryDocument } from '@/lib/db';

interface DocumentsTableProps {
  documents: LibraryDocument[];
  onDelete?: (id: string) => void;
  currentUserEmail: string;
}

type TabType = 'all' | 'one-pager' | 'prd';

const TOOL_LABELS: Record<string, string> = {
  'one-pager': 'One-Pager',
  prd: 'PRD',
};

const BADGE_STYLES: Record<string, { background: string; color: string }> = {
  'one-pager': { background: 'var(--brand-highlight)', color: '#9bb' },
  prd: { background: '#1a2a1a', color: 'var(--brand-green-dark)' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function DocumentsTable({ documents, onDelete, currentUserEmail }: DocumentsTableProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const hasPRD = documents.some((d) => d.toolType === 'prd');

  const filtered = activeTab === 'all'
    ? documents
    : documents.filter((d) => d.toolType === activeTab);

  const handleDelete = async (doc: LibraryDocument) => {
    if (!confirm('Delete this document?')) return;
    setDeletingId(doc.id);
    try {
      await fetch(doc.deleteUrl, { method: doc.deleteMethod });
      onDelete?.(doc.id);
    } finally {
      setDeletingId(null);
    }
  };

  if (documents.length === 0) {
    return (
      <p style={{ color: 'var(--muted)', fontSize: '0.9rem', padding: '1rem 0' }}>
        No documents yet. Generate your first one above.
      </p>
    );
  }

  const tabStyle = (tab: TabType): React.CSSProperties => ({
    padding: '7px 16px 7px',
    fontSize: '0.8rem',
    fontWeight: activeTab === tab ? 600 : 400,
    color: activeTab === tab ? 'var(--foreground)' : 'var(--muted)',
    borderBottom: activeTab === tab ? '2px solid var(--brand-green-dark)' : '2px solid transparent',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  });

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
        <button style={tabStyle('all')} onClick={() => setActiveTab('all')}>All</button>
        <button style={tabStyle('one-pager')} onClick={() => setActiveTab('one-pager')}>One-Pager</button>
        {hasPRD && (
          <button style={tabStyle('prd')} onClick={() => setActiveTab('prd')}>PRD</button>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Title', 'Type', 'Creator', 'Updated', ''].map((h) => (
                <th key={h} style={{
                  textAlign: 'left', padding: '0.6rem 0.75rem', fontWeight: 600,
                  color: 'var(--muted)', fontSize: '0.75rem',
                  textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((doc) => {
              const badge = BADGE_STYLES[doc.toolType] ?? { background: 'var(--border)', color: 'var(--muted)' };
              return (
                <tr key={doc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.7rem 0.75rem', fontWeight: 500 }}>{doc.title}</td>
                  <td style={{ padding: '0.7rem 0.75rem' }}>
                    <span style={{
                      ...badge, fontSize: '0.72rem', fontWeight: 600,
                      padding: '0.15rem 0.55rem', borderRadius: '999px',
                    }}>
                      {TOOL_LABELS[doc.toolType] ?? doc.toolType}
                    </span>
                  </td>
                  <td style={{ padding: '0.7rem 0.75rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
                    {doc.creatorName || doc.creatorEmail || '—'}
                    {doc.creatorEmail === currentUserEmail && (
                      <span style={{
                        marginLeft: '0.4rem', fontSize: '0.7rem', fontWeight: 600,
                        color: 'var(--accent)', background: 'var(--accent-soft)',
                        padding: '0.1rem 0.35rem', borderRadius: '999px',
                      }}>you</span>
                    )}
                  </td>
                  <td style={{ padding: '0.7rem 0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                    {formatDate(doc.updatedAt)}
                  </td>
                  <td style={{ padding: '0.7rem 0.75rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <a
                        href={`${doc.exportBaseUrl}?format=docx`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: 'var(--brand-green-dark)', color: '#fff',
                          padding: '0.2rem 0.6rem', borderRadius: '4px',
                          fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none',
                        }}
                      >DOCX</a>
                      <a
                        href={`${doc.exportBaseUrl}?format=html`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: 'var(--brand-highlight)', color: '#9bb',
                          padding: '0.2rem 0.6rem', borderRadius: '4px',
                          fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none',
                        }}
                      >HTML</a>
                      <button
                        onClick={() => handleDelete(doc)}
                        disabled={deletingId === doc.id}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--muted)', fontSize: '0.8rem', padding: '0.2rem 0.3rem',
                        }}
                        aria-label="Delete document"
                      >
                        {deletingId === doc.id ? '...' : '✕'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
