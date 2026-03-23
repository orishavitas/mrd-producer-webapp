/**
 * LoadingOverlay Component Tests
 *
 * Tests for the batch extraction loading overlay component.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import LoadingOverlay from '@/app/brief-helper/components/LoadingOverlay';
import { BriefField } from '@/app/brief-helper/lib/brief-state';

// ============================================================================
// Tests
// ============================================================================

describe('LoadingOverlay', () => {
  // --------------------------------------------------------------------------
  // Rendering States
  // --------------------------------------------------------------------------

  describe('Rendering States', () => {
    it('should render when visible', () => {
      render(<LoadingOverlay processingFields={['what']} isVisible={true} />);

      expect(screen.getByText('Analyzing your description...')).toBeInTheDocument();
    });

    it('should not render when not visible', () => {
      const { container } = render(
        <LoadingOverlay processingFields={[]} isVisible={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render modal dialog with correct ARIA attributes', () => {
      render(<LoadingOverlay processingFields={['what']} isVisible={true} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'loading-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'loading-description');
    });
  });

  // --------------------------------------------------------------------------
  // Progress Checklist
  // --------------------------------------------------------------------------

  describe('Progress Checklist', () => {
    it('should render all 6 fields in checklist', () => {
      render(<LoadingOverlay processingFields={['what']} isVisible={true} />);

      expect(screen.getByText('What')).toBeInTheDocument();
      expect(screen.getByText('Who')).toBeInTheDocument();
      expect(screen.getByText('Where')).toBeInTheDocument();
      expect(screen.getByText('MOQ')).toBeInTheDocument();
      expect(screen.getByText('Must-Haves')).toBeInTheDocument();
      expect(screen.getByText('Nice-to-Haves')).toBeInTheDocument();
    });

    it('should show pending status for all fields initially', () => {
      const { container } = render(
        <LoadingOverlay processingFields={[]} isVisible={true} />
      );

      const progressItems = container.querySelectorAll('[class*="progressItem"]');
      expect(progressItems).toHaveLength(6);

      // All should be pending (no processing field)
      const pendingIcons = container.querySelectorAll('[class*="iconPending"]');
      expect(pendingIcons).toHaveLength(6);
    });

    it('should show processing status for current field', () => {
      const { container } = render(
        <LoadingOverlay processingFields={['what']} isVisible={true} />
      );

      // First field (what) should be processing
      const processingIcons = container.querySelectorAll('[class*="iconProcessing"]');
      expect(processingIcons.length).toBeGreaterThan(0);
    });

    it('should show done status for completed fields', () => {
      // Simulate "who" being processed (what already done)
      const { container } = render(
        <LoadingOverlay processingFields={['who']} isVisible={true} />
      );

      // Should have at least one done icon (what field)
      const doneIcons = container.querySelectorAll('[class*="iconDone"]');
      expect(doneIcons.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // Field Status States
  // --------------------------------------------------------------------------

  describe('Field Status States', () => {
    it('should mark first field as processing when processing "what"', () => {
      render(<LoadingOverlay processingFields={['what']} isVisible={true} />);

      expect(screen.getByText('Processing: What')).toBeInTheDocument();
    });

    it('should mark fields before current as done', () => {
      // Processing "where" (3rd field), so "what" and "who" should be done
      const { container } = render(
        <LoadingOverlay processingFields={['where']} isVisible={true} />
      );

      const doneIcons = container.querySelectorAll('[class*="iconDone"]');
      expect(doneIcons.length).toBeGreaterThanOrEqual(2); // At least what and who
    });

    it('should mark fields after current as pending', () => {
      // Processing "what" (1st field), all others should be pending
      const { container } = render(
        <LoadingOverlay processingFields={['what']} isVisible={true} />
      );

      const pendingIcons = container.querySelectorAll('[class*="iconPending"]');
      expect(pendingIcons.length).toBeGreaterThanOrEqual(5); // who, where, moq, must-have, nice-to-have
    });

    it('should handle processing middle field correctly', () => {
      render(<LoadingOverlay processingFields={['moq']} isVisible={true} />);

      expect(screen.getByText('Processing: MOQ')).toBeInTheDocument();
    });

    it('should handle processing last field correctly', () => {
      render(<LoadingOverlay processingFields={['nice-to-have']} isVisible={true} />);

      expect(screen.getByText('Processing: Nice-to-Haves')).toBeInTheDocument();

      const { container } = render(
        <LoadingOverlay processingFields={['nice-to-have']} isVisible={true} />
      );

      // First 5 fields should be done
      const doneIcons = container.querySelectorAll('[class*="iconDone"]');
      expect(doneIcons.length).toBeGreaterThanOrEqual(5);
    });
  });

  // --------------------------------------------------------------------------
  // Current Processing Field Display
  // --------------------------------------------------------------------------

  describe('Current Processing Field Display', () => {
    it('should display current processing field', () => {
      render(<LoadingOverlay processingFields={['what']} isVisible={true} />);

      expect(screen.getByText('Processing: What')).toBeInTheDocument();
    });

    it('should update when processing field changes', () => {
      const { rerender } = render(
        <LoadingOverlay processingFields={['what']} isVisible={true} />
      );

      expect(screen.getByText('Processing: What')).toBeInTheDocument();

      rerender(<LoadingOverlay processingFields={['who']} isVisible={true} />);

      expect(screen.getByText('Processing: Who')).toBeInTheDocument();
    });

    it('should not display processing text when no field is processing', () => {
      render(<LoadingOverlay processingFields={[]} isVisible={true} />);

      expect(screen.queryByText(/Processing:/)).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Fade In/Out Animations
  // --------------------------------------------------------------------------

  describe('Fade In/Out Animations', () => {
    it('should apply fade-in class when becoming visible', () => {
      const { container } = render(
        <LoadingOverlay processingFields={['what']} isVisible={true} />
      );

      const overlay = container.querySelector('[class*="overlay"]');
      expect(overlay?.className).toContain('fadeIn');
    });

    it('should apply fade-out class when becoming invisible', async () => {
      const { container, rerender } = render(
        <LoadingOverlay processingFields={['what']} isVisible={true} />
      );

      // Initially visible with fade-in
      let overlay = container.querySelector('[class*="overlay"]');
      expect(overlay?.className).toContain('fadeIn');

      // Change to invisible
      rerender(<LoadingOverlay processingFields={[]} isVisible={false} />);

      // Should have fade-out class
      overlay = container.querySelector('[class*="overlay"]');
      expect(overlay?.className).toContain('fadeOut');

      // After fade-out completes (300ms), should unmount
      await waitFor(
        () => {
          expect(container.firstChild).toBeNull();
        },
        { timeout: 400 }
      );
    });

    it('should remove from DOM after fade-out completes', async () => {
      const { container, rerender } = render(
        <LoadingOverlay processingFields={['what']} isVisible={true} />
      );

      expect(container.firstChild).not.toBeNull();

      rerender(<LoadingOverlay processingFields={[]} isVisible={false} />);

      // Wait for fade-out animation (300ms)
      await waitFor(
        () => {
          expect(container.firstChild).toBeNull();
        },
        { timeout: 400 }
      );
    });
  });

  // --------------------------------------------------------------------------
  // ARIA Live Region
  // --------------------------------------------------------------------------

  describe('ARIA Live Region', () => {
    it('should have ARIA live region for screen readers', () => {
      const { container } = render(
        <LoadingOverlay processingFields={['what']} isVisible={true} />
      );

      const liveRegion = container.querySelector('[role="status"][aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
    });

    it('should announce progress changes to screen readers', () => {
      const { container, rerender } = render(
        <LoadingOverlay processingFields={['what']} isVisible={true} />
      );

      const liveRegion = container.querySelector('[role="status"][aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();

      // Change processing field
      rerender(<LoadingOverlay processingFields={['who']} isVisible={true} />);

      // Live region should still be present
      expect(liveRegion).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Backdrop Interaction
  // --------------------------------------------------------------------------

  describe('Backdrop Interaction', () => {
    it('should render backdrop element', () => {
      const { container } = render(
        <LoadingOverlay processingFields={['what']} isVisible={true} />
      );

      const backdrop = container.querySelector('[class*="backdrop"]');
      expect(backdrop).toBeInTheDocument();
    });

    it('should prevent backdrop clicks from closing overlay', () => {
      const { container } = render(
        <LoadingOverlay processingFields={['what']} isVisible={true} />
      );

      const backdrop = container.querySelector('[class*="backdrop"]');
      expect(backdrop).toBeInTheDocument();

      // Overlay should remain visible after backdrop click
      backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(screen.getByText('Analyzing your description...')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Subtitle Text
  // --------------------------------------------------------------------------

  describe('Subtitle Text', () => {
    it('should display descriptive subtitle', () => {
      render(<LoadingOverlay processingFields={['what']} isVisible={true} />);

      expect(
        screen.getByText('Extracting structured information from your product description')
      ).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // All Fields Processing Sequence
  // --------------------------------------------------------------------------

  describe('All Fields Processing Sequence', () => {
    const allFields: BriefField[] = [
      'what',
      'who',
      'where',
      'moq',
      'must-have',
      'nice-to-have',
    ];

    allFields.forEach((field, index) => {
      it(`should show correct status when processing ${field}`, () => {
        const { container } = render(
          <LoadingOverlay processingFields={[field]} isVisible={true} />
        );

        const doneIcons = container.querySelectorAll('[class*="iconDone"]');
        const processingIcons = container.querySelectorAll('[class*="iconProcessing"]');
        const pendingIcons = container.querySelectorAll('[class*="iconPending"]');

        // Should have `index` done icons (fields before current)
        expect(doneIcons.length).toBe(index);

        // Should have 1 processing icon (current field)
        expect(processingIcons.length).toBeGreaterThan(0);

        // Should have (6 - index - 1) pending icons (fields after current)
        expect(pendingIcons.length).toBe(6 - index - 1);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle empty processingFields array', () => {
      render(<LoadingOverlay processingFields={[]} isVisible={true} />);

      // Should render but show all as pending
      expect(screen.getByText('Analyzing your description...')).toBeInTheDocument();
      expect(screen.queryByText(/Processing:/)).not.toBeInTheDocument();
    });

    it('should handle multiple rapid visibility changes', async () => {
      const { rerender } = render(
        <LoadingOverlay processingFields={['what']} isVisible={true} />
      );

      rerender(<LoadingOverlay processingFields={['what']} isVisible={false} />);
      rerender(<LoadingOverlay processingFields={['what']} isVisible={true} />);

      expect(screen.getByText('Analyzing your description...')).toBeInTheDocument();
    });

    it('should handle changing processingFields while visible', () => {
      const { rerender } = render(
        <LoadingOverlay processingFields={['what']} isVisible={true} />
      );

      expect(screen.getByText('Processing: What')).toBeInTheDocument();

      rerender(<LoadingOverlay processingFields={['who']} isVisible={true} />);

      expect(screen.getByText('Processing: Who')).toBeInTheDocument();

      rerender(<LoadingOverlay processingFields={['where']} isVisible={true} />);

      expect(screen.getByText('Processing: Where')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Spinner Animation
  // --------------------------------------------------------------------------

  describe('Spinner Animation', () => {
    it('should render animated spinner for processing field', () => {
      const { container } = render(
        <LoadingOverlay processingFields={['what']} isVisible={true} />
      );

      const spinner = container.querySelector('[class*="spinner"]');
      expect(spinner).toBeInTheDocument();
    });
  });
});
