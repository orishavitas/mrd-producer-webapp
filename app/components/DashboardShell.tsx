'use client';

import { useState } from 'react';
import type { LibraryDocument } from '@/lib/db';
import DocumentsTable from './DocumentsTable';

interface DashboardShellProps {
  initialDocuments: LibraryDocument[];
  currentUserEmail: string;
}

export default function DashboardShell({ initialDocuments, currentUserEmail }: DashboardShellProps) {
  const [documents, setDocuments] = useState<LibraryDocument[]>(initialDocuments);

  const handleDelete = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
        Documents
      </h2>
      <DocumentsTable documents={documents} onDelete={handleDelete} currentUserEmail={currentUserEmail} />
    </div>
  );
}
