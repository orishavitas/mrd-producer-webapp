import React from 'react';
import { render, screen } from '@testing-library/react';
import { PRDViewer } from '@/app/prd/components/PRDViewer';
import { PRDFrame } from '@/agent/agents/prd/types';

const mockFrames: PRDFrame[] = [
  { sectionKey: 'overview', sectionOrder: 1, content: 'The EMV Bracket mounts payment terminals next to tablets.' },
  { sectionKey: 'goals', sectionOrder: 2, content: 'Secure placement\nCompatibility with Compulocks stands' },
];

describe('PRDViewer', () => {
  it('renders all sections', () => {
    render(<PRDViewer productName="EMV Bracket" frames={mockFrames} prdDocumentId="prd-1" />);
    expect(screen.getByText('Overview')).toBeTruthy();
    expect(screen.getByText('Goals')).toBeTruthy();
  });

  it('renders section content', () => {
    render(<PRDViewer productName="EMV Bracket" frames={mockFrames} prdDocumentId="prd-1" />);
    expect(screen.getByText(/mounts payment terminals/i)).toBeTruthy();
  });

  it('renders export buttons', () => {
    render(<PRDViewer productName="EMV Bracket" frames={mockFrames} prdDocumentId="prd-1" />);
    expect(screen.getByText('Export DOCX')).toBeTruthy();
    expect(screen.getByText('Export HTML')).toBeTruthy();
  });
});
