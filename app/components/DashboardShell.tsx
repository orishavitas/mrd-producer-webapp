'use client';

import { useState } from 'react';
import { Document } from '@/lib/db';
import DocumentsTable from './DocumentsTable';

interface DashboardShellProps {
  initialDocuments: Document[];
}

export default function DashboardShell({ initialDocuments }: DashboardShellProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);

  const handleDelete = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
        Recent Documents
      </h2>
      <DocumentsTable documents={documents} onDelete={handleDelete} />
    </div>
  );
}
