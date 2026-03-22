'use client';

import { DocumentWithCreator } from '@/lib/db';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DocumentsTableProps {
  documents: DocumentWithCreator[];
  onDelete?: (id: string) => void;
  currentUserEmail: string;
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

export default function DocumentsTable({ documents, onDelete, currentUserEmail }: DocumentsTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

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

  const handleTitleClick = (doc: DocumentWithCreator) => {
    if (doc.tool_type === 'one-pager') {
      router.push(`/one-pager/${doc.id}`);
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
            {['Title', 'Type', 'Creator', 'Status', 'Updated', ''].map((h) => (
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
              <td style={{ padding: '0.7rem 0.75rem', fontWeight: 500 }}>
                {doc.tool_type === 'one-pager' ? (
                  <button
                    onClick={() => handleTitleClick(doc)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: 'inherit',
                      color: 'var(--foreground)',
                      padding: 0,
                      textAlign: 'left',
                      textDecoration: 'underline',
                      textDecorationColor: 'var(--muted)',
                    }}
                  >
                    {doc.title}
                  </button>
                ) : (
                  doc.title
                )}
              </td>
              <td style={{ padding: '0.7rem 0.75rem', color: 'var(--muted)' }}>
                {TOOL_LABELS[doc.tool_type] ?? doc.tool_type}
              </td>
              <td style={{ padding: '0.7rem 0.75rem', color: 'var(--muted)' }}>
                {doc.creator_name || doc.creator_email || '—'}
                {doc.user_id === currentUserEmail && (
                  <span style={{
                    marginLeft: '0.4rem',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: 'var(--accent)',
                    background: 'var(--accent-soft)',
                    padding: '0.1rem 0.35rem',
                    borderRadius: '999px',
                  }}>
                    you
                  </span>
                )}
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
