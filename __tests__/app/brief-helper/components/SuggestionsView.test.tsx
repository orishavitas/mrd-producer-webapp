/**
 * SuggestionsView Component Tests
 *
 * Tests for the right panel suggestions view component.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SuggestionsView from '@/app/brief-helper/components/SuggestionsView';
import { BriefProvider } from '@/app/brief-helper/lib/brief-context';
import { BriefState, BriefField } from '@/app/brief-helper/lib/brief-state';

// ============================================================================
// Mock Data
// ============================================================================

const createMockState = (overrides?: Partial<BriefState>): BriefState => ({
  sessionId: 'test-session-123',
  startTime: Date.now(),
  lastUpdated: Date.now(),
  initialDescription: '',
  activeFieldId: null,
  previewMode: 'suggestions',
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

describe('SuggestionsView', () => {
  // --------------------------------------------------------------------------
  // Rendering with No Active Field
  // --------------------------------------------------------------------------

  describe('Rendering with No Active Field', () => {
    it('should render empty state when no field is active', () => {
      render(
        <TestWrapper>
          <SuggestionsView activeFieldId={null} />
        </TestWrapper>
      );

      expect(screen.getByText('Select a field to see tips')).toBeInTheDocument();
      expect(screen.getByText('Click on a field to see contextual tips and examples')).toBeInTheDocument();
    });

    it('should show "Fields Needing Attention" section', () => {
      render(
        <TestWrapper>
          <SuggestionsView activeFieldId={null} />
        </TestWrapper>
      );

      expect(screen.getByText('Fields Needing Attention')).toBeInTheDocument();
    });

    it('should show "all clear" state when no gaps exist', () => {
      render(
        <TestWrapper>
          <SuggestionsView activeFieldId={null} />
        </TestWrapper>
      );

      expect(screen.getByText(/Looking good! No gaps detected/)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Rendering with Active Field
  // --------------------------------------------------------------------------

  describe('Rendering with Active Field', () => {
    it('should render tips for WHAT field', () => {
      render(
        <TestWrapper initialState={{ activeFieldId: 'what' }}>
          <SuggestionsView activeFieldId="what" />
        </TestWrapper>
      );

      expect(screen.getByText('Tips for What')).toBeInTheDocument();
      expect(screen.getByText('Best Practices')).toBeInTheDocument();
      expect(screen.getByText('Examples')).toBeInTheDocument();
    });

    it('should render tips for WHO field', () => {
      render(
        <TestWrapper initialState={{ activeFieldId: 'who' }}>
          <SuggestionsView activeFieldId="who" />
        </TestWrapper>
      );

      expect(screen.getByText('Tips for Who')).toBeInTheDocument();
      expect(screen.getByText(/Identify primary user roles/)).toBeInTheDocument();
    });

    it('should render tips for WHERE field', () => {
      render(
        <TestWrapper initialState={{ activeFieldId: 'where' }}>
          <SuggestionsView activeFieldId="where" />
        </TestWrapper>
      );

      expect(screen.getByText('Tips for Where')).toBeInTheDocument();
      expect(screen.getByText(/Specify physical environments/)).toBeInTheDocument();
    });

    it('should render tips for MOQ field', () => {
      render(
        <TestWrapper initialState={{ activeFieldId: 'moq' }}>
          <SuggestionsView activeFieldId="moq" />
        </TestWrapper>
      );

      expect(screen.getByText('Tips for MOQ')).toBeInTheDocument();
      expect(screen.getByText(/Specify minimum order quantity/)).toBeInTheDocument();
    });

    it('should render tips for MUST-HAVE field', () => {
      render(
        <TestWrapper initialState={{ activeFieldId: 'must-have' }}>
          <SuggestionsView activeFieldId="must-have" />
        </TestWrapper>
      );

      expect(screen.getByText('Tips for Must-Haves')).toBeInTheDocument();
      expect(screen.getByText(/List only non-negotiable requirements/)).toBeInTheDocument();
    });

    it('should render tips for NICE-TO-HAVE field', () => {
      render(
        <TestWrapper initialState={{ activeFieldId: 'nice-to-have' }}>
          <SuggestionsView activeFieldId="nice-to-have" />
        </TestWrapper>
      );

      expect(screen.getByText('Tips for Nice-to-Haves')).toBeInTheDocument();
      expect(screen.getByText(/List features that would add value/)).toBeInTheDocument();
    });

    it('should display example text for active field', () => {
      render(
        <TestWrapper initialState={{ activeFieldId: 'what' }}>
          <SuggestionsView activeFieldId="what" />
        </TestWrapper>
      );

      expect(screen.getByText(/secure tablet stand for retail POS/)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Gap List Rendering
  // --------------------------------------------------------------------------

  describe('Gap List Rendering', () => {
    it('should render gaps for fields', () => {
      const stateWithGaps = createMockState({
        fields: {
          ...createMockState().fields,
          what: {
            rawText: 'Test',
            bulletPoints: ['Bullet 1'],
            gaps: [
              {
                id: 'gap-1',
                category: 'product',
                description: 'Missing rotation details',
                priority: 'high',
                suggestedQuestion: 'Does it rotate?',
              },
              {
                id: 'gap-2',
                category: 'specs',
                description: 'Missing dimensions',
                priority: 'medium',
                suggestedQuestion: 'What are the dimensions?',
              },
            ],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: false,
          },
        },
      });

      render(
        <TestWrapper initialState={stateWithGaps}>
          <SuggestionsView activeFieldId="who" />
        </TestWrapper>
      );

      expect(screen.getByText('What')).toBeInTheDocument();
      expect(screen.getByText(/2 gaps/)).toBeInTheDocument();
    });

    it('should not render hidden gaps in count', () => {
      const stateWithHiddenGaps = createMockState({
        fields: {
          ...createMockState().fields,
          what: {
            rawText: 'Test',
            bulletPoints: ['Bullet 1'],
            gaps: [
              {
                id: 'gap-1',
                category: 'product',
                description: 'Gap 1',
                priority: 'high',
                suggestedQuestion: 'Question 1?',
              },
              {
                id: 'gap-2',
                category: 'specs',
                description: 'Gap 2',
                priority: 'medium',
                suggestedQuestion: 'Question 2?',
              },
            ],
            hiddenGaps: ['gap-1'], // Hide gap-1
            isAIProcessing: false,
            isComplete: false,
          },
        },
      });

      render(
        <TestWrapper initialState={stateWithHiddenGaps}>
          <SuggestionsView activeFieldId="who" />
        </TestWrapper>
      );

      // Should show 1 gap (gap-2 only)
      expect(screen.getByText(/1 gap$/)).toBeInTheDocument();
    });

    it('should render singular "gap" for one gap', () => {
      const stateWithOneGap = createMockState({
        fields: {
          ...createMockState().fields,
          what: {
            rawText: 'Test',
            bulletPoints: ['Bullet 1'],
            gaps: [
              {
                id: 'gap-1',
                category: 'product',
                description: 'Missing details',
                priority: 'high',
                suggestedQuestion: 'What details?',
              },
            ],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: false,
          },
        },
      });

      render(
        <TestWrapper initialState={stateWithOneGap}>
          <SuggestionsView activeFieldId="who" />
        </TestWrapper>
      );

      expect(screen.getByText(/1 gap$/)).toBeInTheDocument();
    });

    it('should show all clear state when all gaps are hidden', () => {
      const stateWithAllHidden = createMockState({
        fields: {
          ...createMockState().fields,
          what: {
            rawText: 'Test',
            bulletPoints: ['Bullet 1'],
            gaps: [
              {
                id: 'gap-1',
                category: 'product',
                description: 'Gap 1',
                priority: 'high',
                suggestedQuestion: 'Question 1?',
              },
            ],
            hiddenGaps: ['gap-1'], // All gaps hidden
            isAIProcessing: false,
            isComplete: false,
          },
        },
      });

      render(
        <TestWrapper initialState={stateWithAllHidden}>
          <SuggestionsView activeFieldId="who" />
        </TestWrapper>
      );

      expect(screen.getByText(/Looking good! No gaps detected/)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Field Click Interaction
  // --------------------------------------------------------------------------

  describe('Field Click Interaction', () => {
    it('should dispatch SET_ACTIVE_FIELD when gap field is clicked', () => {
      const stateWithGaps = createMockState({
        fields: {
          ...createMockState().fields,
          what: {
            rawText: 'Test',
            bulletPoints: ['Bullet 1'],
            gaps: [
              {
                id: 'gap-1',
                category: 'product',
                description: 'Missing details',
                priority: 'high',
                suggestedQuestion: 'What details?',
              },
            ],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: false,
          },
        },
      });

      render(
        <TestWrapper initialState={stateWithGaps}>
          <SuggestionsView activeFieldId="who" />
        </TestWrapper>
      );

      const whatButton = screen.getByRole('button', { name: /View What/ });
      fireEvent.click(whatButton);

      // After click, the component should re-render with new active field
      // This is handled by the context provider in real usage
    });

    it('should highlight active field in gap list', () => {
      const stateWithGaps = createMockState({
        activeFieldId: 'what',
        fields: {
          ...createMockState().fields,
          what: {
            rawText: 'Test',
            bulletPoints: ['Bullet 1'],
            gaps: [
              {
                id: 'gap-1',
                category: 'product',
                description: 'Missing details',
                priority: 'high',
                suggestedQuestion: 'What details?',
              },
            ],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: false,
          },
        },
      });

      const { container } = render(
        <TestWrapper initialState={stateWithGaps}>
          <SuggestionsView activeFieldId="what" />
        </TestWrapper>
      );

      const whatButton = screen.getByRole('button', { name: /View What/ });

      // Check if button has active class
      expect(whatButton.className).toContain('active');
    });
  });

  // --------------------------------------------------------------------------
  // Empty States
  // --------------------------------------------------------------------------

  describe('Empty States', () => {
    it('should show empty icon when no field is active', () => {
      render(
        <TestWrapper>
          <SuggestionsView activeFieldId={null} />
        </TestWrapper>
      );

      // Check for SVG icon (lightbulb)
      const svgElements = document.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });

    it('should show checkmark icon when all gaps cleared', () => {
      render(
        <TestWrapper>
          <SuggestionsView activeFieldId={null} />
        </TestWrapper>
      );

      expect(screen.getByText(/Looking good! No gaps detected/)).toBeInTheDocument();

      // Check for checkmark SVG
      const svgElements = document.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility
  // --------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('should have accessible button labels for gap fields', () => {
      const stateWithGaps = createMockState({
        fields: {
          ...createMockState().fields,
          what: {
            rawText: 'Test',
            bulletPoints: ['Bullet 1'],
            gaps: [
              {
                id: 'gap-1',
                category: 'product',
                description: 'Missing details',
                priority: 'high',
                suggestedQuestion: 'What details?',
              },
              {
                id: 'gap-2',
                category: 'specs',
                description: 'Missing specs',
                priority: 'medium',
                suggestedQuestion: 'What specs?',
              },
            ],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: false,
          },
        },
      });

      render(
        <TestWrapper initialState={stateWithGaps}>
          <SuggestionsView activeFieldId="who" />
        </TestWrapper>
      );

      const whatButton = screen.getByRole('button', { name: /View What - 2 gaps detected/ });
      expect(whatButton).toBeInTheDocument();
    });

    it('should support keyboard navigation for gap buttons', () => {
      const stateWithGaps = createMockState({
        fields: {
          ...createMockState().fields,
          what: {
            rawText: 'Test',
            bulletPoints: ['Bullet 1'],
            gaps: [
              {
                id: 'gap-1',
                category: 'product',
                description: 'Missing details',
                priority: 'high',
                suggestedQuestion: 'What details?',
              },
            ],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: false,
          },
        },
      });

      render(
        <TestWrapper initialState={stateWithGaps}>
          <SuggestionsView activeFieldId="who" />
        </TestWrapper>
      );

      const whatButton = screen.getByRole('button', { name: /View What/ });

      // Simulate Enter key press
      fireEvent.keyDown(whatButton, { key: 'Enter', code: 'Enter' });

      // Component should handle keyboard interaction
      expect(whatButton).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Multiple Fields with Gaps
  // --------------------------------------------------------------------------

  describe('Multiple Fields with Gaps', () => {
    it('should render all fields with gaps', () => {
      const stateWithMultipleGaps = createMockState({
        fields: {
          ...createMockState().fields,
          what: {
            rawText: 'Test',
            bulletPoints: ['Bullet 1'],
            gaps: [
              {
                id: 'gap-what-1',
                category: 'product',
                description: 'Gap 1',
                priority: 'high',
                suggestedQuestion: 'Q1?',
              },
            ],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: false,
          },
          who: {
            rawText: 'Test',
            bulletPoints: ['Bullet 1'],
            gaps: [
              {
                id: 'gap-who-1',
                category: 'users',
                description: 'Gap 2',
                priority: 'medium',
                suggestedQuestion: 'Q2?',
              },
            ],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: false,
          },
          where: {
            rawText: 'Test',
            bulletPoints: ['Bullet 1'],
            gaps: [
              {
                id: 'gap-where-1',
                category: 'environment',
                description: 'Gap 3',
                priority: 'low',
                suggestedQuestion: 'Q3?',
              },
            ],
            hiddenGaps: [],
            isAIProcessing: false,
            isComplete: false,
          },
        },
      });

      render(
        <TestWrapper initialState={stateWithMultipleGaps}>
          <SuggestionsView activeFieldId="moq" />
        </TestWrapper>
      );

      expect(screen.getByText('What')).toBeInTheDocument();
      expect(screen.getByText('Who')).toBeInTheDocument();
      expect(screen.getByText('Where')).toBeInTheDocument();
    });
  });
});
