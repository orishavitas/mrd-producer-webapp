'use client';

import { useState } from 'react';
import { PRDComment } from '@/agent/agents/prd/prd-document-types';

interface Props {
  prdId: string;
  sectionKey: string;
  comments: PRDComment[];
  currentUserEmail: string;
  onCommentsChange: (comments: PRDComment[]) => void;
}

export default function CommentPanel({ prdId, sectionKey, comments, currentUserEmail, onCommentsChange }: Props) {
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const sectionComments = comments.filter((c) => c.sectionKey === sectionKey);

  async function submit() {
    if (!draft.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/prd/${prdId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionKey, body: draft }),
      });
      if (res.ok) {
        const data = await res.json();
        onCommentsChange(data.comments);
        setDraft('');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleResolved(comment: PRDComment) {
    const res = await fetch(`/api/prd/${prdId}/comments/${comment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved: !comment.resolved }),
    });
    if (res.ok) {
      const data = await res.json();
      onCommentsChange(data.comments);
    }
  }

  return (
    <div className="comment-panel">
      {sectionComments.map((c) => (
        <div key={c.id} style={{ opacity: c.resolved ? 0.5 : 1 }}>
          <strong>{c.author}</strong>: {c.body}
          {(c.author === currentUserEmail) && (
            <button type="button" onClick={() => toggleResolved(c)}>
              {c.resolved ? 'Unresolve' : 'Resolve'}
            </button>
          )}
        </div>
      ))}
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a comment..." />
      <button type="button" onClick={submit} disabled={submitting || !draft.trim()}>Comment</button>
    </div>
  );
}
