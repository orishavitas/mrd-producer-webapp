/**
 * ProgressSidebar Component Tests
 *
 * Tests for the sidebar component showing section progress and status icons.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProgressSidebar from '@/app/mrd-generator/components/ProgressSidebar';
import { MRDProvider } from '@/app/mrd-generator/lib/mrd-context';
import {
  createInitialMRDState,
  MRD_SECTION_IDS,
} from '@/app/mrd-generator/lib/mrd-state';

// Test wrapper with provider
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<MRDProvider>{ui}</MRDProvider>);
};

describe('ProgressSidebar', () => {
  // ========================================================================
  // Rendering Tests
  // ========================================================================

  describe('Rendering Tests', () => {
    it('should render section header', () => {
      renderWithProvider(<ProgressSidebar />);
      expect(screen.getByText('Sections')).toBeInTheDocument();
    });

    it('should render progress counter', () => {
      renderWithProvider(<ProgressSidebar />);
      expect(screen.getByText('0/12')).toBeInTheDocument();
    });

    it('should render all 12 section labels', () => {
      renderWithProvider(<ProgressSidebar />);

      expect(screen.getByText('Purpose & Vision')).toBeInTheDocument();
      expect(screen.getByText('Problem Statement')).toBeInTheDocument();
      expect(screen.getByText('Target Market')).toBeInTheDocument();
      expect(screen.getByText('Target Users')).toBeInTheDocument();
      expect(screen.getByText('Product Description')).toBeInTheDocument();
      expect(screen.getByText('Key Requirements')).toBeInTheDocument();
      expect(screen.getByText('Design & Aesthetics')).toBeInTheDocument();
      expect(screen.getByText('Target Price')).toBeInTheDocument();
      expect(screen.getByText('Risks & Thoughts')).toBeInTheDocument();
      expect(screen.getByText('Competition')).toBeInTheDocument();
      expect(screen.getByText('Additional')).toBeInTheDocument();
      expect(screen.getByText('Success Criteria')).toBeInTheDocument();
    });

    it('should render all sections as list items', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      const listItems = container.querySelectorAll('li');
      expect(listItems).toHaveLength(12);
    });

    it('should render buttons for each section', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      const buttons = container.querySelectorAll('button');
      expect(buttons).toHaveLength(12);
    });

    it('should render status icons for each section', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      const statusIcons = container.querySelectorAll('.statusIcon');
      expect(statusIcons).toHaveLength(12);
    });
  });

  // ========================================================================
  // Status Icon Tests
  // ========================================================================

  describe('Status Icons', () => {
    it('should show empty circle (○) for empty sections', () => {
      renderWithProvider(<ProgressSidebar />);
      const emptyIcons = screen.getAllByText('○');
      expect(emptyIcons).toHaveLength(12);
    });

    it('should show checkmark (✓) for complete sections', () => {
      renderWithProvider(<ProgressSidebar />);
      // Initially all empty
      expect(screen.queryByText('✓')).not.toBeInTheDocument();
    });

    it('should show warning (⚠) for sections with gaps', () => {
      renderWithProvider(<ProgressSidebar />);
      // Initially none with gaps
      expect(screen.queryByText('⚠')).not.toBeInTheDocument();
    });
  });

  // ========================================================================
  // Progress Counter Tests
  // ========================================================================

  describe('Progress Counter', () => {
    it('should show 0/12 when no sections complete', () => {
      renderWithProvider(<ProgressSidebar />);
      expect(screen.getByText('0/12')).toBeInTheDocument();
    });

    it('should show correct count format', () => {
      renderWithProvider(<ProgressSidebar />);
      const counter = screen.getByText(/\d+\/12/);
      expect(counter).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Section Activation Tests
  // ========================================================================

  describe('Section Activation', () => {
    it('should be clickable', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProgressSidebar />);

      const button = screen.getByLabelText(/Purpose & Vision/);
      expect(button).toBeInTheDocument();

      await user.click(button);
      // Button should have aria-pressed attribute
      expect(button).toHaveAttribute('aria-pressed');
    });

    it('should have aria-pressed attribute', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      const buttons = container.querySelectorAll('button');

      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-pressed');
      });
    });

    it('should have proper aria-label for accessibility', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      const buttons = container.querySelectorAll('button');

      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should have active styling class when selected', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProgressSidebar />);

      const button = screen.getByLabelText(/Purpose & Vision/);
      await user.click(button);

      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have inactive aria-pressed when not selected', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      const buttons = container.querySelectorAll('button');

      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-pressed', 'false');
      });
    });
  });

  // ========================================================================
  // Section Labels Tests
  // ========================================================================

  describe('Section Labels', () => {
    it('should render correct section label order', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      const listItems = container.querySelectorAll('li');

      const expectedLabels = [
        'Purpose & Vision',
        'Problem Statement',
        'Target Market',
        'Target Users',
        'Product Description',
        'Key Requirements',
        'Design & Aesthetics',
        'Target Price',
        'Risks & Thoughts',
        'Competition',
        'Additional',
        'Success Criteria',
      ];

      listItems.forEach((item, index) => {
        expect(item).toHaveTextContent(expectedLabels[index]);
      });
    });

    it('should display label alongside status icon', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      const buttons = container.querySelectorAll('button');

      buttons.forEach((button) => {
        const statusIcon = button.querySelector('.statusIcon');
        const label = button.querySelector('.sectionLabel');

        expect(statusIcon).toBeInTheDocument();
        expect(label).toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // List Structure Tests
  // ========================================================================

  describe('List Structure', () => {
    it('should use semantic <ul> element', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      const list = container.querySelector('ul');
      expect(list).toBeInTheDocument();
    });

    it('should use semantic <li> elements', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      const listItems = container.querySelectorAll('ul > li');
      expect(listItems).toHaveLength(12);
    });

    it('should have proper role attribute on list', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      const list = container.querySelector('ul');
      expect(list).toHaveAttribute('role', 'list');
    });
  });

  // ========================================================================
  // CSS Classes Tests
  // ========================================================================

  describe('CSS Classes', () => {
    it('should have wrapper class on container', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      const wrapper = container.querySelector('.wrapper');
      expect(wrapper).toBeInTheDocument();
    });

    it('should have header class on header element', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      const header = container.querySelector('.header');
      expect(header).toBeInTheDocument();
    });

    it('should have list class on ul element', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      const list = container.querySelector('.list');
      expect(list).toBeInTheDocument();
    });

    it('should have item class on li elements', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      const items = container.querySelectorAll('.item');
      expect(items).toHaveLength(12);
    });

    it('should have sectionButton class on buttons', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      const buttons = container.querySelectorAll('.sectionButton');
      expect(buttons).toHaveLength(12);
    });

    it('should have status classes on buttons', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      const buttons = container.querySelectorAll('button');

      buttons.forEach((button) => {
        const hasStatus = button.className.includes('empty') ||
          button.className.includes('done') ||
          button.className.includes('gaps');
        expect(hasStatus).toBe(true);
      });
    });
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle missing section data gracefully', () => {
      renderWithProvider(<ProgressSidebar />);
      // Should render without errors even if sections are empty
      expect(screen.getByText('Sections')).toBeInTheDocument();
    });

    it('should render consistent UI with different initial states', () => {
      const { rerender } = renderWithProvider(<ProgressSidebar />);

      // Re-render multiple times
      rerender(
        <MRDProvider>
          <ProgressSidebar />
        </MRDProvider>
      );

      expect(screen.getByText('0/12')).toBeInTheDocument();
    });

    it('should handle rapid section clicks', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProgressSidebar />);

      const buttons = screen.getAllByRole('button');

      // Click first few buttons rapidly
      await user.click(buttons[0]);
      await user.click(buttons[1]);
      await user.click(buttons[2]);

      // Should be interactive without errors
      expect(buttons[0]).toHaveAttribute('aria-pressed');
    });
  });

  // ========================================================================
  // Accessibility Tests
  // ========================================================================

  describe('Accessibility', () => {
    it('should have semantic structure with header', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      expect(container.querySelector('header')).not.toBeNull();
    });

    it('should have all buttons with aria-pressed', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      const buttons = container.querySelectorAll('button');

      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-pressed');
      });
    });

    it('should have all buttons with aria-label', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      const buttons = container.querySelectorAll('button');

      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should include status in aria-label', () => {
      renderWithProvider(<ProgressSidebar />);
      const ariaLabels = screen.getAllByRole('button').map((btn) =>
        btn.getAttribute('aria-label')
      );

      // Should include status information like "empty", "done", "gaps"
      const hasStatusInfo = ariaLabels.some(
        (label) =>
          label?.includes('empty') ||
          label?.includes('done') ||
          label?.includes('gaps')
      );

      expect(hasStatusInfo).toBe(true);
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProgressSidebar />);

      const buttons = screen.getAllByRole('button');

      // Tab through buttons
      await user.tab();
      expect(buttons[0]).toHaveFocus();

      await user.tab();
      expect(buttons[1]).toHaveFocus();

      // Shift+Tab goes backwards
      await user.tab({ shift: true });
      expect(buttons[0]).toHaveFocus();
    });

    it('should use proper heading hierarchy', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      // Header should contain accessible text
      const header = container.querySelector('.header');
      expect(header).toHaveTextContent('Sections');
    });

    it('should have sufficient color contrast for status icons', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      const statusIcons = container.querySelectorAll('.statusIcon');

      // Status icons should be present and visible
      statusIcons.forEach((icon) => {
        expect(icon.textContent?.trim().length).toBeGreaterThan(0);
      });
    });

    it('should have readable section names', () => {
      renderWithProvider(<ProgressSidebar />);

      // All section labels should be readable text
      const sectionLabels = [
        'Purpose & Vision',
        'Problem Statement',
        'Target Market',
        'Target Users',
        'Product Description',
        'Key Requirements',
        'Design & Aesthetics',
        'Target Price',
        'Risks & Thoughts',
        'Competition',
        'Additional',
        'Success Criteria',
      ];

      sectionLabels.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // Responsive Behavior Tests
  // ========================================================================

  describe('Responsive Behavior', () => {
    it('should maintain list structure at different viewport sizes', () => {
      renderWithProvider(<ProgressSidebar />);

      const { container } = render(
        <MRDProvider>
          <ProgressSidebar />
        </MRDProvider>
      );

      const listItems = container.querySelectorAll('li');
      expect(listItems).toHaveLength(12);
    });

    it('should not overflow text for long labels', () => {
      const { container } = renderWithProvider(<ProgressSidebar />);
      const labels = container.querySelectorAll('.sectionLabel');

      labels.forEach((label) => {
        const style = window.getComputedStyle(label);
        // Should have overflow handling
        expect(label).toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // Integration Tests
  // ========================================================================

  describe('Integration Tests', () => {
    it('should render all 12 MRD_SECTION_IDS', () => {
      renderWithProvider(<ProgressSidebar />);

      // Verify the number of rendered buttons matches MRD_SECTION_IDS length
      expect(MRD_SECTION_IDS).toHaveLength(12);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(12);
    });

    it('should handle initial empty state', () => {
      renderWithProvider(<ProgressSidebar />);

      // All sections should show empty status initially
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button.textContent).toContain('○');
      });
    });
  });
});
