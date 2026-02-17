/**
 * StartPage Component Tests
 *
 * Tests for the MRD generator start page with product concept input,
 * character grading, and validation.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StartPage from '@/app/mrd-generator/components/StartPage';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('StartPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.clear();
  });

  // ========================================================================
  // Rendering Tests
  // ========================================================================

  describe('Rendering Tests', () => {
    it('should render page title', () => {
      render(<StartPage />);
      expect(screen.getByText('MRD Generator')).toBeInTheDocument();
    });

    it('should render subtitle with recommendations', () => {
      render(<StartPage />);
      expect(
        screen.getByText(/Describe your product concept/)
      ).toBeInTheDocument();
      expect(screen.getByText(/200\+ characters/)).toBeInTheDocument();
    });

    it('should render textarea with placeholder', () => {
      render(<StartPage />);
      const textarea = screen.getByLabelText('Product concept description');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute('placeholder');
      expect(textarea).toHaveAttribute('rows', '12');
    });

    it('should render character counter', () => {
      render(<StartPage />);
      expect(screen.getByText('0 chars')).toBeInTheDocument();
    });

    it('should render Generate MRD button', () => {
      render(<StartPage />);
      const button = screen.getByRole('button', { name: /Generate MRD/ });
      expect(button).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Character Counter Tests
  // ========================================================================

  describe('Character Counter', () => {
    it('should update counter as user types', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const textarea = screen.getByLabelText('Product concept description');
      await user.type(textarea, 'Hello');

      expect(screen.getByText('5 chars')).toBeInTheDocument();
    });

    it('should show counter at 0 initially', () => {
      render(<StartPage />);
      expect(screen.getByText('0 chars')).toBeInTheDocument();
    });

    it('should show counter for 50 characters', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const textarea = screen.getByLabelText('Product concept description');
      await user.type(textarea, 'a'.repeat(50));

      expect(screen.getByText('50 chars')).toBeInTheDocument();
    });

    it('should show counter up to MAX_CHARS limit', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const textarea = screen.getByLabelText('Product concept description');
      await user.type(textarea, 'a'.repeat(5000));

      expect(screen.getByText('5000 chars')).toBeInTheDocument();
    });

    it('should show green check badge when 200+ characters', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const textarea = screen.getByLabelText('Product concept description');
      await user.type(textarea, 'a'.repeat(200));

      expect(screen.getByText('✓ 200+')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Validation Tests
  // ========================================================================

  describe('Validation', () => {
    it('should require minimum 50 characters', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const button = screen.getByRole('button', { name: /Generate MRD/ });
      expect(button).toBeDisabled();

      const textarea = screen.getByLabelText('Product concept description');
      await user.type(textarea, 'a'.repeat(49));

      expect(button).toBeDisabled();
    });

    it('should enable button at exactly 50 characters', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const button = screen.getByRole('button', { name: /Generate MRD/ });
      const textarea = screen.getByLabelText('Product concept description');

      await user.type(textarea, 'a'.repeat(50));

      expect(button).not.toBeDisabled();
    });

    it('should show error when text is below minimum', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Enter at least 50 characters'
      );
    });

    it('should reject text over 5000 characters', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const textarea = screen.getByLabelText(
        'Product concept description'
      ) as HTMLTextAreaElement;
      const text = 'a'.repeat(5001);

      fireEvent.change(textarea, { target: { value: text } });
      const button = screen.getByRole('button', { name: /Generate MRD/ });
      await user.click(button);

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Maximum 5000 characters'
      );
    });

    it('should clear error when user corrects input', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const textarea = screen.getByLabelText('Product concept description');
      const button = screen.getByRole('button');

      // Trigger error
      await user.click(button);
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Fix error
      await user.type(textarea, 'a'.repeat(50));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should accept exactly 5000 characters', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const textarea = screen.getByLabelText(
        'Product concept description'
      ) as HTMLTextAreaElement;
      const text = 'a'.repeat(5000);

      fireEvent.change(textarea, { target: { value: text } });
      const button = screen.getByRole('button', { name: /Generate MRD/ });

      expect(button).not.toBeDisabled();
    });
  });

  // ========================================================================
  // Button State Tests
  // ========================================================================

  describe('Button State', () => {
    it('should disable button when text is too short', () => {
      render(<StartPage />);
      const button = screen.getByRole('button', { name: /Generate MRD/ });
      expect(button).toBeDisabled();
    });

    it('should enable button when text is valid length', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const textarea = screen.getByLabelText('Product concept description');
      await user.type(textarea, 'a'.repeat(50));

      const button = screen.getByRole('button', { name: /Generate MRD/ });
      expect(button).not.toBeDisabled();
    });

    it('should show character hint when below minimum', () => {
      render(<StartPage />);
      expect(screen.getByText('50 more characters needed')).toBeInTheDocument();
    });

    it('should not show hint when at minimum characters', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const textarea = screen.getByLabelText('Product concept description');
      await user.type(textarea, 'a'.repeat(50));

      expect(
        screen.queryByText('50 more characters needed')
      ).not.toBeInTheDocument();
    });

    it('should have proper aria-label on button', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const textarea = screen.getByLabelText('Product concept description');
      const button = screen.getByRole('button');

      // Initially disabled
      expect(button).toHaveAttribute('aria-label');

      // After typing
      await user.type(textarea, 'a'.repeat(50));
      expect(button).toHaveAttribute('aria-label', 'Generate MRD');
    });
  });

  // ========================================================================
  // SessionStorage Tests
  // ========================================================================

  describe('SessionStorage', () => {
    it('should save concept to sessionStorage on continue', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const textarea = screen.getByLabelText('Product concept description');
      await user.type(textarea, 'My test product concept');

      const button = screen.getByRole('button', { name: /Generate MRD/ });
      await user.click(button);

      expect(mockSessionStorage.getItem('mrd-generator-concept')).toBe(
        'My test product concept'
      );
    });

    it('should trim whitespace before saving', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const textarea = screen.getByLabelText('Product concept description');
      await user.type(textarea, '  My product concept  ');

      const button = screen.getByRole('button', { name: /Generate MRD/ });
      await user.click(button);

      expect(mockSessionStorage.getItem('mrd-generator-concept')).toBe(
        'My product concept'
      );
    });

    it('should save multiline text correctly', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const textarea = screen.getByLabelText('Product concept description');
      const multilineText = 'Line 1\nLine 2\nLine 3 with lots more content to reach 50 chars';
      await user.type(textarea, multilineText);

      const button = screen.getByRole('button', { name: /Generate MRD/ });
      await user.click(button);

      expect(mockSessionStorage.getItem('mrd-generator-concept')).toBe(
        multilineText
      );
    });
  });

  // ========================================================================
  // Navigation Tests
  // ========================================================================

  describe('Navigation', () => {
    it('should navigate to /mrd-generator on valid submission', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const textarea = screen.getByLabelText('Product concept description');
      await user.type(textarea, 'a'.repeat(50));

      const button = screen.getByRole('button', { name: /Generate MRD/ });
      await user.click(button);

      expect(mockPush).toHaveBeenCalledWith('/mrd-generator');
    });

    it('should not navigate when validation fails', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should not navigate when text exceeds maximum', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const textarea = screen.getByLabelText(
        'Product concept description'
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'a'.repeat(5001) } });

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle rapid character additions', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const textarea = screen.getByLabelText('Product concept description');
      await user.type(textarea, 'a'.repeat(50), { delay: 1 });

      expect(screen.getByText('50 chars')).toBeInTheDocument();
    });

    it('should handle pasting content', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const textarea = screen.getByLabelText(
        'Product concept description'
      ) as HTMLTextAreaElement;
      const pastedText = 'Pasted product concept with enough text to be valid';

      await user.click(textarea);
      fireEvent.paste(textarea, {
        clipboardData: { getData: () => pastedText },
      });
      textarea.value = pastedText;
      fireEvent.change(textarea);

      expect(screen.getByText(`${pastedText.length} chars`)).toBeInTheDocument();
    });

    it('should handle special characters in text', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const textarea = screen.getByLabelText('Product concept description');
      const specialText = '™®©℠ Special characters test! @#$% 50+ characters total needed here';
      await user.type(textarea, specialText);

      const button = screen.getByRole('button', { name: /Generate MRD/ });
      expect(button).not.toBeDisabled();
    });

    it('should handle only whitespace rejection', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const textarea = screen.getByLabelText('Product concept description');
      await user.type(textarea, '     ');

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should handle emoji and unicode characters', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const textarea = screen.getByLabelText('Product concept description');
      const emojiText = 'Product with emoji 🎯📱💡 and unicode characters αβγ with good length';
      await user.type(textarea, emojiText);

      const button = screen.getByRole('button', { name: /Generate MRD/ });
      expect(button).not.toBeDisabled();
    });
  });

  // ========================================================================
  // Accessibility Tests
  // ========================================================================

  describe('Accessibility', () => {
    it('should have proper label for textarea', () => {
      render(<StartPage />);
      const textarea = screen.getByLabelText('Product concept description');
      expect(textarea).toBeInTheDocument();
    });

    it('should have role alert for error messages', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const button = screen.getByRole('button');
      await user.click(button);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('should have proper button aria-label states', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const button = screen.getByRole('button');

      // Disabled state
      expect(button).toHaveAttribute('aria-label');

      // Enabled state
      const textarea = screen.getByLabelText('Product concept description');
      await user.type(textarea, 'a'.repeat(50));

      expect(button).toHaveAttribute('aria-label', 'Generate MRD');
    });

    it('should have semantic heading hierarchy', () => {
      const { container } = render(<StartPage />);
      const h1 = container.querySelector('h1');
      expect(h1).toHaveTextContent('MRD Generator');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<StartPage />);

      const textarea = screen.getByLabelText('Product concept description');
      const button = screen.getByRole('button');

      // Tab to textarea
      await user.tab();
      expect(textarea).toHaveFocus();

      // Type content
      await user.keyboard('a'.repeat(50));

      // Tab to button
      await user.tab();
      expect(button).toHaveFocus();

      // Enter to submit
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/mrd-generator');
      });
    });
  });
});
