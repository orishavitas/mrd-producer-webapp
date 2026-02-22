'use client';

import { Document } from '@/lib/db';
import { useState } from 'react';

interface DocumentsTableProps {
  documents: Document[];
  onDelete?: (id: string) => void;
}

const TOOL_LABELS: Record<string, string> = {
  mrd: 'MRD',
  'one-pager': 'One-Pager',
  brief: 'Brief',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DocumentsTable({ documents, onDelete }: DocumentsTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      onDelete?.(id);
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

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Title', 'Type', 'Status', 'Updated', ''].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: 'left',
                  padding: '0.6rem 0.75rem',
                  fontWeight: 600,
                  color: 'var(--muted)',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr
              key={doc.id}
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <td style={{ padding: '0.7rem 0.75rem', fontWeight: 500 }}>{doc.title}</td>
              <td style={{ padding: '0.7rem 0.75rem', color: 'var(--muted)' }}>
                {TOOL_LABELS[doc.tool_type] ?? doc.tool_type}
              </td>
              <td style={{ padding: '0.7rem 0.75rem' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  background: doc.status === 'complete' ? 'var(--accent-soft)' : 'rgba(0,0,0,0.06)',
                  color: doc.status === 'complete' ? 'var(--accent)' : 'var(--muted)',
                }}>
                  {doc.status}
                </span>
              </td>
              <td style={{ padding: '0.7rem 0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                {formatDate(doc.updated_at)}
              </td>
              <td style={{ padding: '0.7rem 0.75rem', textAlign: 'right' }}>
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                    fontSize: '0.8rem',
                    padding: '0.2rem 0.4rem',
                  }}
                  aria-label="Delete document"
                >
                  {deletingId === doc.id ? '...' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
