import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ProgressRing from '@/app/one-pager/components/ProgressRing';
import ExportMenu from '@/app/one-pager/components/ExportMenu';
import OverflowMenu from '@/app/one-pager/components/OverflowMenu';
import PreviewFab from '@/app/one-pager/components/PreviewFab';
import SplitLayout from '@/app/one-pager/components/SplitLayout';
import type { CompletionSection } from '@/app/one-pager/lib/one-pager-state';

const sections: CompletionSection[] = [
  { key: 'documentInfo', label: 'Document Info', done: true, skippable: false },
  { key: 'goal', label: 'Goal', done: false, skippable: true },
];

describe('one-pager top bar controls', () => {
  it('opens the progress ring panel and dispatches N/A toggles', () => {
    const onToggleSkip = jest.fn();
    render(
      <ProgressRing
        sections={sections}
        skippedSections={{}}
        version="0.3"
        isPublished={false}
        onToggleSkip={onToggleSkip}
        onTogglePaintSkip={jest.fn()}
        onToggleLogoSkip={jest.fn()}
        paintSkipped={false}
        logoSkipped={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /50% complete/i }));
    fireEvent.click(screen.getByRole('button', { name: 'N/A' }));

    expect(screen.getByText('Section Status')).toBeTruthy();
    expect(onToggleSkip).toHaveBeenCalledWith('goal');
  });

  it('routes export and publish actions through the export menu', () => {
    const onExport = jest.fn();
    const onPublish = jest.fn();
    render(
      <ExportMenu
        onExport={onExport}
        onPublish={onPublish}
        onUnpublish={jest.fn()}
        isPublished={false}
        isWorking={false}
        exportingFormat={null}
        isPublishing={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /download docx/i }));
    expect(onExport).toHaveBeenCalledWith('docx');

    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /^publish$/i }));
    expect(onPublish).toHaveBeenCalledTimes(1);
  });

  it('shows overflow actions and gates version history behind admin document state', () => {
    const onReset = jest.fn();
    const onShowVersionHistory = jest.fn();
    render(
      <OverflowMenu
        onReset={onReset}
        isAdmin
        documentId="doc-1"
        onShowVersionHistory={onShowVersionHistory}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /more actions/i }));
    expect(screen.getByRole('menuitem', { name: /home/i }).getAttribute('href')).toBe('/');
    fireEvent.click(screen.getByRole('menuitem', { name: /reset form/i }));
    expect(onReset).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /more actions/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /version history/i }));
    expect(onShowVersionHistory).toHaveBeenCalledTimes(1);
  });

  it('prompts for preview mode on narrow screens and remembers split choice', () => {
    const onToggle = jest.fn();
    localStorage.clear();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });

    render(
      <PreviewFab
        previewOpen={false}
        onToggle={onToggle}
        getStateJson={() => '{"productName":"test"}'}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /preview/i }));
    expect(screen.getByText('How do you want to view the preview?')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /split view/i }));
    expect(localStorage.getItem('op-preview-mode')).toBe('split');
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders SplitLayout in horizontal mode without the preview panel when closed', () => {
    const { container } = render(
      <SplitLayout
        leftPanel={<div>Form</div>}
        rightPanel={<div>Preview</div>}
        previewOpen={false}
        splitDirection="horizontal"
        topBar={<div>Top</div>}
      />
    );

    expect(container.querySelector('[data-preview="closed"]')?.className).toContain('containerH');
    expect(screen.queryByText('Preview')).toBeNull();
  });
});
