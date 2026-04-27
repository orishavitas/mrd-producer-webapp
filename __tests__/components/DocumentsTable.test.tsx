import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DocumentsTable from '@/app/components/DocumentsTable';
import type { LibraryDocument } from '@/lib/db';

const onePager: LibraryDocument = {
  id: 'doc-1',
  title: 'EMV Bracket',
  toolType: 'one-pager',
  creatorName: 'Ori Shavit',
  creatorEmail: 'ori@compulocks.com',
  updatedAt: '2026-04-23T10:00:00Z',
  exportBaseUrl: '/api/documents/doc-1/export',
  deleteUrl: '/api/documents/doc-1',
  deleteMethod: 'DELETE',
};

const prdDoc: LibraryDocument = {
  id: 'prd-1',
  title: 'EMV PRD v1',
  toolType: 'prd',
  creatorName: null,
  creatorEmail: 'ori@compulocks.com',
  updatedAt: '2026-04-23T11:00:00Z',
  exportBaseUrl: '/api/pipeline/prd/prd-1/export',
  deleteUrl: '/api/pipeline/prd/prd-1/delete',
  deleteMethod: 'DELETE',
};

describe('DocumentsTable', () => {
  it('renders all documents under All tab', () => {
    render(<DocumentsTable documents={[onePager, prdDoc]} onDelete={jest.fn()} currentUserEmail="ori@compulocks.com" />);
    expect(screen.getByText('EMV Bracket')).toBeTruthy();
    expect(screen.getByText('EMV PRD v1')).toBeTruthy();
  });

  it('filters to One-Pager tab', () => {
    render(<DocumentsTable documents={[onePager, prdDoc]} onDelete={jest.fn()} currentUserEmail="ori@compulocks.com" />);
    // Click the tab button (first match is the tab, second is the badge)
    const onePagerButtons = screen.getAllByText('One-Pager');
    fireEvent.click(onePagerButtons[0]);
    expect(screen.getByText('EMV Bracket')).toBeTruthy();
    expect(screen.queryByText('EMV PRD v1')).toBeNull();
  });

  it('filters to PRD tab', () => {
    render(<DocumentsTable documents={[onePager, prdDoc]} onDelete={jest.fn()} currentUserEmail="ori@compulocks.com" />);
    // Click the tab button (first match is the tab, second is the badge)
    const prdButtons = screen.getAllByText('PRD');
    fireEvent.click(prdButtons[0]);
    expect(screen.queryByText('EMV Bracket')).toBeNull();
    expect(screen.getByText('EMV PRD v1')).toBeTruthy();
  });

  it('renders DOCX and HTML links with correct hrefs', () => {
    render(<DocumentsTable documents={[onePager]} onDelete={jest.fn()} currentUserEmail="ori@compulocks.com" />);
    const docxLink = screen.getByText('DOCX').closest('a');
    const htmlLink = screen.getByText('HTML').closest('a');
    expect(docxLink?.getAttribute('href')).toBe('/api/documents/doc-1/export?format=docx');
    expect(docxLink?.getAttribute('target')).toBe('_blank');
    expect(htmlLink?.getAttribute('href')).toBe('/api/documents/doc-1/export?format=html');
    expect(htmlLink?.getAttribute('target')).toBe('_blank');
  });

  it('hides PRD tab when no PRD documents', () => {
    render(<DocumentsTable documents={[onePager]} onDelete={jest.fn()} currentUserEmail="ori@compulocks.com" />);
    expect(screen.queryByText('PRD')).toBeNull();
  });

  it('shows empty state when no documents', () => {
    render(<DocumentsTable documents={[]} onDelete={jest.fn()} currentUserEmail="ori@compulocks.com" />);
    expect(screen.getByText(/No documents yet/)).toBeTruthy();
  });
});
