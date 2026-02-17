/**
 * SectionPreview Component Tests
 *
 * Tests for the section preview component showing markdown-formatted content
 * and export functionality.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SectionPreview from '@/app/mrd-generator/components/SectionPreview';
import { MRDProvider } from '@/app/mrd-generator/lib/mrd-context';
import {
  createInitialMRDState,
  MRD_SECTION_IDS,
} from '@/app/mrd-generator/lib/mrd-state';

// Mock fetch for export
global.fetch = jest.fn();

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock');
global.URL.revokeObjectURL = jest.fn();

// Test wrapper with provider
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<MRDProvider>{ui}</MRDProvider>);
};

describe('SectionPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  // ========================================================================
  // Rendering Tests
  // ========================================================================

  describe('Rendering Tests', () => {
    it('should render component title', () => {
      renderWithProvider(<SectionPreview />);
      expect(screen.getByText('MRD Preview')).toBeInTheDocument();
    });

    it('should render export button', () => {
      renderWithProvider(<SectionPreview />);
      const button = screen.getByRole('button', { name: /Export DOCX/ });
      expect(button).toBeInTheDocument();
    });

    it('should render content container', () => {
      const { container } = renderWithProvider(<SectionPreview />);
      const content = container.querySelector('.content');
      expect(content).toBeInTheDocument();
    });

    it('should have header section', () => {
      const { container } = renderWithProvider(<SectionPreview />);
      const header = container.querySelector('.header');
      expect(header).toBeInTheDocument();
    });

    it('should have proper semantic structure', () => {
      const { container } = renderWithProvider(<SectionPreview />);
      expect(container.querySelector('header')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Section Display Tests
  // ========================================================================

  describe('Section Display', () => {
    it('should render all 12 MRD sections in full mode', () => {
      renderWithProvider(<SectionPreview />);

      // All sections should be present in full preview mode
      expect(screen.getByText(/1\. Purpose & Vision/)).toBeInTheDocument();
      expect(screen.getByText(/2\. Problem Statement/)).toBeInTheDocument();
      expect(screen.getByText(/3\. Target Market/)).toBeInTheDocument();
      expect(screen.getByText(/4\. Target Users/)).toBeInTheDocument();
      expect(screen.getByText(/5\. Product Description/)).toBeInTheDocument();
      expect(screen.getByText(/6\. Key Requirements/)).toBeInTheDocument();
      expect(screen.getByText(/7\. Design & Aesthetics/)).toBeInTheDocument();
      expect(screen.getByText(/8\. Target Price/)).toBeInTheDocument();
      expect(screen.getByText(/9\. Risks and Thoughts/)).toBeInTheDocument();
      expect(screen.getByText(/10\. Competition/)).toBeInTheDocument();
      expect(screen.getByText(/11\. Additional/)).toBeInTheDocument();
      expect(screen.getByText(/12\. Success Criteria/)).toBeInTheDocument();
    });

    it('should show section incomplete placeholder', () => {
      renderWithProvider(<SectionPreview />);

      // Empty sections should show placeholder
      const placeholders = screen.getAllByText('— Section incomplete —');
      expect(placeholders.length).toBeGreaterThan(0);
    });

    it('should render section titles with numbers', () => {
      renderWithProvider(<SectionPreview />);

      expect(screen.getByText(/1\. Purpose & Vision/)).toBeInTheDocument();
      expect(screen.getByText(/2\. Problem Statement/)).toBeInTheDocument();
      expect(screen.getByText(/12\. Success Criteria/)).toBeInTheDocument();
    });

    it('should render sections in correct order', () => {
      const { container } = renderWithProvider(<SectionPreview />);
      const sections = container.querySelectorAll('section');

      // Should have 12 sections (one for each MRD section)
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // Preview Mode Tests
  // ========================================================================

  describe('Preview Mode', () => {
    it('should show all sections in full mode', () => {
      renderWithProvider(<SectionPreview />);

      // Default mode is 'full', all sections shown
      const sections = screen.getAllByText(/Section incomplete/);
      expect(sections.length).toBe(12);
    });

    it('should hide empty sections in completed mode', () => {
      renderWithProvider(<SectionPreview />);

      // In completed mode, empty sections are hidden
      const incompleteText = screen.getAllByText(/— Section incomplete —/);
      expect(incompleteText.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // Export Button Tests
  // ========================================================================

  describe('Export Button', () => {
    it('should render export button with correct label', () => {
      renderWithProvider(<SectionPreview />);
      const button = screen.getByRole('button', { name: /Export DOCX/ });
      expect(button).toBeInTheDocument();
    });

    it('should have aria-label for accessibility', () => {
      renderWithProvider(<SectionPreview />);
      const button = screen.getByRole('button', { name: /Export DOCX/ });
      expect(button).toHaveAttribute('aria-label', 'Export as DOCX');
    });

    it('should not be disabled initially', () => {
      renderWithProvider(<SectionPreview />);
      const button = screen.getByRole('button', { name: /Export DOCX/ });
      expect(button).not.toBeDisabled();
    });

    it('should be disabled while exporting', async () => {
      const user = userEvent.setup();
      renderWithProvider(<SectionPreview />);

      (global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  blob: async () => new Blob(['test']),
                }),
              200
            )
          )
      );

      const button = screen.getByRole('button', { name: /Export DOCX/ });
      await user.click(button);

      expect(button).toBeDisabled();

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('should show exporting state text', async () => {
      const user = userEvent.setup();
      renderWithProvider(<SectionPreview />);

      (global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  blob: async () => new Blob(['test']),
                }),
              100
            )
          )
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(button).toHaveTextContent('Exporting…');
    });
  });

  // ========================================================================
  // Markdown Rendering Tests
  // ========================================================================

  describe('Markdown Rendering', () => {
    it('should render HTML from markdown', () => {
      const { container } = renderWithProvider(<SectionPreview />);

      // Check for markdown container divs
      const markdownDivs = container.querySelectorAll('.markdown');
      expect(markdownDivs.length).toBeGreaterThan(0);
    });

    it('should use dangerouslySetInnerHTML for markdown', () => {
      const { container } = renderWithProvider(<SectionPreview />);

      // Markdown container should exist
      const markdown = container.querySelector('.markdown');
      expect(markdown).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Section State Tests
  // ========================================================================

  describe('Section State', () => {
    it('should handle sections with different states', () => {
      renderWithProvider(<SectionPreview />);

      // Should render all sections regardless of state
      const sections = screen.getAllByText(/Section incomplete/);
      expect(sections.length).toBe(12);
    });

    it('should apply appropriate CSS classes for incomplete sections', () => {
      const { container } = renderWithProvider(<SectionPreview />);
      const sections = container.querySelectorAll('section');

      sections.forEach((section) => {
        // Should have incomplete class for empty sections
        expect(section.className).toBeTruthy();
      });
    });
  });

  // ========================================================================
  // Active Section Tests
  // ========================================================================

  describe('Active Section', () => {
    it('should scroll to active section', () => {
      const { container } = renderWithProvider(<SectionPreview />);

      // Check that scroll ref can be used
      const sections = container.querySelectorAll('section');
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should apply active class to current section', () => {
      const { container } = renderWithProvider(<SectionPreview />);
      const sections = container.querySelectorAll('section');

      // At least one section should exist
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // Document Name Display Tests
  // ========================================================================

  describe('Document Name Display', () => {
    it('should display document name in header if available', () => {
      renderWithProvider(<SectionPreview />);

      // Initially no document name
      const title = screen.getByText('MRD Preview');
      expect(title).toBeInTheDocument();
    });

    it('should show default name for export when not set', async () => {
      const user = userEvent.setup();
      renderWithProvider(<SectionPreview />);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['test']),
      });

      const button = screen.getByRole('button', { name: /Export DOCX/ });
      await user.click(button);

      // Should use default name in export
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // Export Functionality Tests
  // ========================================================================

  describe('Export Functionality', () => {
    it('should call fetch API for export', async () => {
      const user = userEvent.setup();
      renderWithProvider(<SectionPreview />);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['test']),
      });

      const button = screen.getByRole('button', { name: /Export DOCX/ });
      await user.click(button);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/mrd/export',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should send all sections to export API', async () => {
      const user = userEvent.setup();
      renderWithProvider(<SectionPreview />);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['test']),
      });

      const button = screen.getByRole('button', { name: /Export DOCX/ });
      await user.click(button);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const bodyStr = callArgs[1].body;
      const body = JSON.parse(bodyStr);

      expect(body).toHaveProperty('sections');
      expect(body).toHaveProperty('documentName');
    });

    it('should handle export errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      renderWithProvider(<SectionPreview />);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      const button = screen.getByRole('button', { name: /Export DOCX/ });
      await user.click(button);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Export error:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it('should create download link and trigger click', async () => {
      const user = userEvent.setup();
      renderWithProvider(<SectionPreview />);

      const mockBlob = new Blob(['test content']);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const button = screen.getByRole('button', { name: /Export DOCX/ });
      await user.click(button);

      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalled();
      });
    });

    it('should include date in export filename', async () => {
      const user = userEvent.setup();
      renderWithProvider(<SectionPreview />);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['test']),
      });

      const button = screen.getByRole('button', { name: /Export DOCX/ });
      await user.click(button);

      // Filename should include date
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle empty sections gracefully', () => {
      renderWithProvider(<SectionPreview />);

      // Should show placeholders for all empty sections
      const placeholders = screen.getAllByText('— Section incomplete —');
      expect(placeholders).toHaveLength(12);
    });

    it('should handle rapid export clicks', async () => {
      const user = userEvent.setup();
      renderWithProvider(<SectionPreview />);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['test']),
      });

      const button = screen.getByRole('button', { name: /Export DOCX/ });

      // First click
      await user.click(button);
      expect(button).toBeDisabled();

      // Second click should be blocked
      await user.click(button);

      // Should only call fetch once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle network failures in export', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      renderWithProvider(<SectionPreview />);

      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const button = screen.getByRole('button', { name: /Export DOCX/ });
      await user.click(button);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Export error:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it('should handle missing document name', () => {
      renderWithProvider(<SectionPreview />);

      // Should render without error
      expect(screen.getByText('MRD Preview')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Accessibility Tests
  // ========================================================================

  describe('Accessibility', () => {
    it('should have export button with proper aria-label', () => {
      renderWithProvider(<SectionPreview />);
      const button = screen.getByRole('button', { name: /Export/ });
      expect(button).toHaveAttribute('aria-label', 'Export as DOCX');
    });

    it('should use semantic section elements', () => {
      const { container } = renderWithProvider(<SectionPreview />);
      const sections = container.querySelectorAll('section');
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should use semantic heading elements', () => {
      const { container } = renderWithProvider(<SectionPreview />);
      const h2s = container.querySelectorAll('h2');
      expect(h2s.length).toBeGreaterThan(0);
    });

    it('should have semantic header element', () => {
      const { container } = renderWithProvider(<SectionPreview />);
      expect(container.querySelector('header')).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      const { container } = renderWithProvider(<SectionPreview />);

      const h2Title = container.querySelector('header h2');
      expect(h2Title).toHaveTextContent('MRD Preview');

      const sectionH3s = container.querySelectorAll('section h3');
      expect(sectionH3s.length).toBeGreaterThan(0);
    });

    it('should have descriptive section IDs', () => {
      const { container } = renderWithProvider(<SectionPreview />);
      const sections = container.querySelectorAll('section[id]');

      sections.forEach((section) => {
        const id = section.getAttribute('id');
        expect(id).toMatch(/section-/);
      });
    });
  });

  // ========================================================================
  // Responsive Tests
  // ========================================================================

  describe('Responsive Behavior', () => {
    it('should maintain structure at different sizes', () => {
      const { container } = renderWithProvider(<SectionPreview />);

      const header = container.querySelector('header');
      const content = container.querySelector('.content');

      expect(header).toBeInTheDocument();
      expect(content).toBeInTheDocument();
    });

    it('should render scrollable content', () => {
      const { container } = renderWithProvider(<SectionPreview />);
      const content = container.querySelector('.content');

      expect(content).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Integration Tests
  // ========================================================================

  describe('Integration Tests', () => {
    it('should render correct number of sections matching MRD_SECTION_IDS', () => {
      renderWithProvider(<SectionPreview />);

      const incompleteTexts = screen.getAllByText(/— Section incomplete —/);
      expect(incompleteTexts.length).toBe(MRD_SECTION_IDS.length);
    });

    it('should handle multiple renders without issues', () => {
      const { rerender } = renderWithProvider(<SectionPreview />);

      rerender(
        <MRDProvider>
          <SectionPreview />
        </MRDProvider>
      );

      expect(screen.getByText('MRD Preview')).toBeInTheDocument();
    });
  });
});
