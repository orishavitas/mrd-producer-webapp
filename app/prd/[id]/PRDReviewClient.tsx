'use client';

import { useState } from 'react';
import { PRDDocument, PRDSection, PRDComment } from '@/agent/agents/prd/prd-document-types';
import SectionCard from './components/SectionCard';

interface DocumentEnvelopeLike {
  id: string;
  version: string;
  contentJson: PRDDocument;
}

// Shape of the raw envelope returned by the publish API — contentJson is untyped JSON
// on the wire, matching lib/gcs/documents.ts's DocumentEnvelope.contentJson.
interface RawDocumentEnvelope {
  id: string;
  version: string;
  contentJson: Record<string, unknown>;
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
  const [justSaved, setJustSaved] = useState(false);
  const [exporting, setExporting] = useState<'docx' | 'html' | 'pdf' | null>(null);

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
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function runExport(format: 'docx' | 'html' | 'pdf') {
    setExporting(format);
    setError(null);
    try {
      const response = await fetch(`/api/prd/${initialDocument.id}/export?format=${format}`);
      if (!response.ok) throw new Error('Export failed');

      if (format === 'pdf') {
        const data = await response.json();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(data.html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => printWindow.print(), 500);
        }
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prd-${initialDocument.id}.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  }

  async function publish() {
    setPublishing(true);
    setError(null);
    try {
      await save();
      const res = await fetch(`/api/prd/${initialDocument.id}/publish`, { method: 'POST' });
      if (!res.ok) throw new Error('Publish failed');
      const data = (await res.json()) as { document: RawDocumentEnvelope };
      setDoc(data.document.contentJson as unknown as PRDDocument);
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
        {justSaved && <span className="save-confirmation">Saved</span>}
        <button type="button" onClick={publish} disabled={publishing}>{publishing ? 'Publishing...' : 'Publish'}</button>
      </div>
      <div className="export-actions">
        <button type="button" onClick={() => runExport('docx')} disabled={exporting !== null}>
          {exporting === 'docx' ? 'Exporting...' : 'Export DOCX'}
        </button>
        <button type="button" onClick={() => runExport('html')} disabled={exporting !== null}>
          {exporting === 'html' ? 'Exporting...' : 'Export HTML'}
        </button>
        <button type="button" onClick={() => runExport('pdf')} disabled={exporting !== null}>
          {exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}
        </button>
      </div>
    </div>
  );
}
