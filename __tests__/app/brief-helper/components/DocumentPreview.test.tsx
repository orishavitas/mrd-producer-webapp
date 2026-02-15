/**
 * DocumentPreview Component Tests
 *
 * Tests for the document preview component showing formatted brief.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import DocumentPreview from '@/app/brief-helper/components/DocumentPreview';
import { BriefProvider } from '@/app/brief-helper/lib/brief-context';
import { BriefState } from '@/app/brief-helper/lib/brief-state';

// ============================================================================
// Mock Data
// ============================================================================

const createMockState = (overrides?: Partial<BriefState>): BriefState => ({
  sessionId: 'test-session-123',
  startTime: Date.now(),
  lastUpdated: Date.now(),
  initialDescription: '',
  activeFieldId: null,
  previewMode: 'document',
  processingFields: [],
  collapsedFields: [],
  fields: {
    what: {
      rawText: '',
      bulletPoints: [],
      gaps: [],
      hiddenGaps: [],
      isAIProcessing: false,
      isComplete: false,
    },
    who: {
      rawText: '',
      bulletPoints: [],
      gaps: [],
      hiddenGaps: [],
      isAIProcessing: false,
      isComplete: false,
    },
    where: {
      rawText: '',
      bulletPoints: [],
      gaps: [],
      hiddenGaps: [],
      isAIProcessing: false,
      isComplete: false,
    },
    moq: {
      rawText: '',
      bulletPoints: [],
      gaps: [],
      hiddenGaps: [],
      isAIProcessing: false,
      isComplete: false,
    },
    'must-have': {
      rawText: '',
      bulletPoints: [],
      gaps: [],
      hiddenGaps: [],
      isAIProcessing: false,
      isComplete: false,
    },
    'nice-to-have': {
      rawText: '',
      bulletPoints: [],
      gaps: [],
      hiddenGaps: [],
      isAIProcessing: false,
      isComplete: false,
    },
  },
  ...overrides,
});

// ============================================================================
// Helper Components
// ============================================================================

interface TestWrapperProps {
  initialState?: Partial<BriefState>;
  children: React.ReactNode;
}

const TestWrapper = ({ initialState, children }: TestWrapperProps) => {
  const mockState = createMockState(initialState);

  return (
    <BriefProvider initialState={mockState}>
      {children}
    </BriefProvider>
  );
};

// ============================================================================
// Tests
// ============================================================================

describe('DocumentPreview', () => {
  // --------------------------------------------------------------------------
  // Document Header
  // --------------------------------------------------------------------------

  describe('Document Header', () => {
    it('should render document title', () => {
      render(
        <TestWrapper>
          <DocumentPreview />
        </TestWrapper>
      );

      expect(screen.getByText('Product Brief')).toBeInTheDocument();
    });

    it('should render current date', () => {
      render(
        <TestWrapper>
          <DocumentPreview />
        </TestWrapper>
      );

      const currentDate = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

      expect(screen.getByText(new RegExp(currentDate))).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Section Headers
  // --------------------------------------------------------------------------

  describe('Section Headers', () => {
    it('should render all 6 section headers', () => {
      render(
        <TestWrapper>
          <DocumentPreview />
        </TestWrapper>
      );

      expect(screen.getByText('What - Product Description')).toBeInTheDocument();
      expect(screen.getByText('Who - Target Users/Customers')).toBeInTheDocument();
      expect(screen.getByText('Where - Use Environment')).toBeInTheDocument();
      expect(screen.getByText('MOQ - Minimum Order Quantity')).toBeInTheDocument();
      expect(screen.getByText('Must-Have Features')).toBeInTheDocument();
      expect(screen.getByText('Nice-to-Have Features')).toBeInTheDocument();
    });

    it('should render sections in correct order', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentPreview />
        </TestWrapper>
      );

      const sections = container.querySelectorAll('section');
      expect(sections).toHaveLength(6);

      const sectionTitles = Array.from(sections).map(
        (section) => section.querySelector('h2')?.textContent
      );

      expect(sectionTitles).toEqual([
        'What - Product Description',
        'Who - Target Users/Customers',
        'Where - Use Environment',
        'MOQ - Minimum Order Quantity',
        'Must-Have Features',
        'Nice-to-Have Features',
      ]);
    });
  });

  // --------------------------------------------------------------------------
  // Em Dash Placeholder for Incomplete Fields
  // --------------------------------------------------------------------------

  describe('Em Dash Placeholder', () => {
    it('should show em dash for empty fields', () => {
      render(
        <TestWrapper>
          <DocumentPreview />
        </TestWrapper>
      );

      // All fields are empty, should show 6 em dashes
      const emDashes = screen.getAllByText('—');
      expect(emDashes).toHaveLength(6);
    });

    it('should not show em dash for completed fields', () => {
      const stateWithContent = createMockState({
        fields: {
          ...createMockState().fields,
          what: {
            rawText: 'Test',
            bulletPoints: ['iPad stand', 'Retail use'],
            gaps: [],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: true,
          },
        },
      });

      render(
        <TestWrapper initialState={stateWithContent}>
          <DocumentPreview />
        </TestWrapper>
      );

      // Should show 5 em dashes (6 fields - 1 completed)
      const emDashes = screen.getAllByText('—');
      expect(emDashes).toHaveLength(5);

      // WHAT field should show content
      expect(screen.getByText('iPad stand')).toBeInTheDocument();
      expect(screen.getByText('Retail use')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Bullet List Formatting
  // --------------------------------------------------------------------------

  describe('Bullet List Formatting', () => {
    it('should render bullets as unordered list', () => {
      const stateWithBullets = createMockState({
        fields: {
          ...createMockState().fields,
          what: {
            rawText: 'Test',
            bulletPoints: ['iPad stand', 'Retail environment', 'Adjustable height'],
            gaps: [],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: true,
          },
        },
      });

      const { container } = render(
        <TestWrapper initialState={stateWithBullets}>
          <DocumentPreview />
        </TestWrapper>
      );

      const bulletList = container.querySelector('ul');
      expect(bulletList).toBeInTheDocument();

      const listItems = bulletList?.querySelectorAll('li');
      expect(listItems).toHaveLength(3);
    });

    it('should render all bullet points for a field', () => {
      const stateWithBullets = createMockState({
        fields: {
          ...createMockState().fields,
          'must-have': {
            rawText: 'Test',
            bulletPoints: [
              'VESA 75/100 compatible',
              'Lockable security',
              'Cable routing',
              'Adjustable tilt',
            ],
            gaps: [],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: true,
          },
        },
      });

      render(
        <TestWrapper initialState={stateWithBullets}>
          <DocumentPreview />
        </TestWrapper>
      );

      expect(screen.getByText('VESA 75/100 compatible')).toBeInTheDocument();
      expect(screen.getByText('Lockable security')).toBeInTheDocument();
      expect(screen.getByText('Cable routing')).toBeInTheDocument();
      expect(screen.getByText('Adjustable tilt')).toBeInTheDocument();
    });

    it('should handle multiple fields with bullets', () => {
      const stateWithMultipleBullets = createMockState({
        fields: {
          ...createMockState().fields,
          what: {
            rawText: 'Test',
            bulletPoints: ['iPad stand', 'Aluminum construction'],
            gaps: [],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: true,
          },
          who: {
            rawText: 'Test',
            bulletPoints: ['Store managers', 'Cashiers'],
            gaps: [],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: true,
          },
          where: {
            rawText: 'Test',
            bulletPoints: ['Retail counters', 'Trade show booths'],
            gaps: [],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: true,
          },
        },
      });

      const { container } = render(
        <TestWrapper initialState={stateWithMultipleBullets}>
          <DocumentPreview />
        </TestWrapper>
      );

      const bulletLists = container.querySelectorAll('ul');
      expect(bulletLists).toHaveLength(3);

      // Verify content for each field
      expect(screen.getByText('iPad stand')).toBeInTheDocument();
      expect(screen.getByText('Store managers')).toBeInTheDocument();
      expect(screen.getByText('Retail counters')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Active Section Highlighting
  // --------------------------------------------------------------------------

  describe('Active Section Highlighting', () => {
    it('should highlight active section', () => {
      const stateWithActive = createMockState({
        activeFieldId: 'what',
      });

      const { container } = render(
        <TestWrapper initialState={stateWithActive}>
          <DocumentPreview />
        </TestWrapper>
      );

      const sections = container.querySelectorAll('section');
      const whatSection = sections[0]; // First section is WHAT

      expect(whatSection.className).toContain('activeSection');
    });

    it('should not highlight non-active sections', () => {
      const stateWithActive = createMockState({
        activeFieldId: 'what',
      });

      const { container } = render(
        <TestWrapper initialState={stateWithActive}>
          <DocumentPreview />
        </TestWrapper>
      );

      const sections = container.querySelectorAll('section');
      const whoSection = sections[1]; // Second section is WHO

      expect(whoSection.className).not.toContain('activeSection');
    });

    it('should handle no active section', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentPreview />
        </TestWrapper>
      );

      const sections = container.querySelectorAll('section');

      sections.forEach((section) => {
        expect(section.className).not.toContain('activeSection');
      });
    });
  });

  // --------------------------------------------------------------------------
  // Document Footer
  // --------------------------------------------------------------------------

  describe('Document Footer', () => {
    it('should render footer text', () => {
      render(
        <TestWrapper>
          <DocumentPreview />
        </TestWrapper>
      );

      expect(screen.getByText(/Generated with Brief Helper/)).toBeInTheDocument();
      expect(screen.getByText(/MRD Producer/)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Mixed Content States
  // --------------------------------------------------------------------------

  describe('Mixed Content States', () => {
    it('should handle mix of completed and incomplete fields', () => {
      const mixedState = createMockState({
        fields: {
          ...createMockState().fields,
          what: {
            rawText: 'Test',
            bulletPoints: ['iPad stand'],
            gaps: [],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: true,
          },
          who: {
            rawText: '',
            bulletPoints: [],
            gaps: [],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: false,
          },
          where: {
            rawText: 'Test',
            bulletPoints: ['Retail stores'],
            gaps: [],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: true,
          },
        },
      });

      render(
        <TestWrapper initialState={mixedState}>
          <DocumentPreview />
        </TestWrapper>
      );

      // Should show content for completed fields
      expect(screen.getByText('iPad stand')).toBeInTheDocument();
      expect(screen.getByText('Retail stores')).toBeInTheDocument();

      // Should show 4 em dashes for incomplete fields (who, moq, must-have, nice-to-have)
      const emDashes = screen.getAllByText('—');
      expect(emDashes).toHaveLength(4);
    });

    it('should show all content when all fields complete', () => {
      const allCompleteState = createMockState({
        fields: {
          what: {
            rawText: 'Test',
            bulletPoints: ['iPad stand'],
            gaps: [],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: true,
          },
          who: {
            rawText: 'Test',
            bulletPoints: ['Store managers'],
            gaps: [],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: true,
          },
          where: {
            rawText: 'Test',
            bulletPoints: ['Retail counters'],
            gaps: [],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: true,
          },
          moq: {
            rawText: 'Test',
            bulletPoints: ['1000 units'],
            gaps: [],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: true,
          },
          'must-have': {
            rawText: 'Test',
            bulletPoints: ['VESA compatible'],
            gaps: [],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: true,
          },
          'nice-to-have': {
            rawText: 'Test',
            bulletPoints: ['Quick release'],
            gaps: [],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: true,
          },
        },
      });

      render(
        <TestWrapper initialState={allCompleteState}>
          <DocumentPreview />
        </TestWrapper>
      );

      // No em dashes should be present
      const emDashes = screen.queryAllByText('—');
      expect(emDashes).toHaveLength(0);

      // All content should be visible
      expect(screen.getByText('iPad stand')).toBeInTheDocument();
      expect(screen.getByText('Store managers')).toBeInTheDocument();
      expect(screen.getByText('Retail counters')).toBeInTheDocument();
      expect(screen.getByText('1000 units')).toBeInTheDocument();
      expect(screen.getByText('VESA compatible')).toBeInTheDocument();
      expect(screen.getByText('Quick release')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle empty bullet points array', () => {
      const emptyBulletsState = createMockState({
        fields: {
          ...createMockState().fields,
          what: {
            rawText: 'Some text',
            bulletPoints: [],
            gaps: [],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: false,
          },
        },
      });

      render(
        <TestWrapper initialState={emptyBulletsState}>
          <DocumentPreview />
        </TestWrapper>
      );

      // Should show em dash for empty bullets
      const emDashes = screen.getAllByText('—');
      expect(emDashes.length).toBeGreaterThan(0);
    });

    it('should handle single bullet point', () => {
      const singleBulletState = createMockState({
        fields: {
          ...createMockState().fields,
          what: {
            rawText: 'Test',
            bulletPoints: ['Single bullet'],
            gaps: [],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: true,
          },
        },
      });

      const { container } = render(
        <TestWrapper initialState={singleBulletState}>
          <DocumentPreview />
        </TestWrapper>
      );

      const bulletList = container.querySelector('ul');
      const listItems = bulletList?.querySelectorAll('li');
      expect(listItems).toHaveLength(1);
      expect(screen.getByText('Single bullet')).toBeInTheDocument();
    });

    it('should handle long bullet points', () => {
      const longBulletState = createMockState({
        fields: {
          ...createMockState().fields,
          what: {
            rawText: 'Test',
            bulletPoints: [
              'This is a very long bullet point that contains a lot of detailed information about the product specifications and requirements',
            ],
            gaps: [],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: true,
          },
        },
      });

      render(
        <TestWrapper initialState={longBulletState}>
          <DocumentPreview />
        </TestWrapper>
      );

      expect(
        screen.getByText(/very long bullet point that contains/)
      ).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility
  // --------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('should use semantic HTML structure', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentPreview />
        </TestWrapper>
      );

      expect(container.querySelector('header')).toBeInTheDocument();
      expect(container.querySelectorAll('section')).toHaveLength(6);
      expect(container.querySelector('footer')).toBeInTheDocument();
    });

    it('should use proper heading hierarchy', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentPreview />
        </TestWrapper>
      );

      const h1 = container.querySelector('h1');
      expect(h1).toHaveTextContent('Product Brief');

      const h2s = container.querySelectorAll('h2');
      expect(h2s).toHaveLength(6);
    });
  });
});
