'use client';

import { useState } from 'react';
import { PRDDocument, PRDSection, PRDComment } from '@/agent/agents/prd/prd-document-types';
import SectionCard from './components/SectionCard';

interface DocumentEnvelopeLike {
  id: string;
  version: string;
  contentJson: PRDDocument;
}

interface Props {
  initialDocument: DocumentEnvelopeLike;
  currentUserEmail: string;
}

export default function PRDReviewClient({ initialDocument, currentUserEmail }: Props) {
  const [doc, setDoc] = useState<PRDDocument>(initialDocument.contentJson);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateSection(updated: PRDSection) {
    setDoc((prev) => ({ ...prev, sections: prev.sections.map((s) => (s.key === updated.key ? updated : s)) }));
  }

  function updateComments(comments: PRDComment[]) {
    setDoc((prev) => ({ ...prev, comments }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/prd/${initialDocument.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: doc.sections }),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setPublishing(true);
    setError(null);
    try {
      await save();
      const res = await fetch(`/api/prd/${initialDocument.id}/publish`, { method: 'POST' });
      if (!res.ok) throw new Error('Publish failed');
      const data = await res.json();
      setDoc(data.document.contentJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="prd-review">
      <h1>{doc.productName} — PRD (v{doc.version})</h1>
      {error && <div className="error">{error}</div>}
      {doc.sections.map((section) => (
        <SectionCard
          key={section.key}
          prdId={initialDocument.id}
          section={section}
          comments={doc.comments}
          currentUserEmail={currentUserEmail}
          onSectionChange={updateSection}
          onCommentsChange={updateComments}
        />
      ))}
      <div className="actions">
        <button type="button" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        <button type="button" onClick={publish} disabled={publishing}>{publishing ? 'Publishing...' : 'Publish'}</button>
      </div>
    </div>
  );
}
