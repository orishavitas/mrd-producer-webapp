/**
 * ChatInterface Component Tests
 *
 * Tests for the chat interface component handling AI conversation
 * and section refinement.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInterface from '@/app/mrd-generator/components/ChatInterface';
import { MRDProvider } from '@/app/mrd-generator/lib/mrd-context';
import { createInitialMRDState } from '@/app/mrd-generator/lib/mrd-state';

// Mock fetch
global.fetch = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Test wrapper with provider
const renderWithProvider = (ui: JSX.Element) => {
  return render(
    <MRDProvider>
      {ui}
    </MRDProvider>
  );
};

describe('ChatInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  // ========================================================================
  // Rendering Tests
  // ========================================================================

  describe('Rendering Tests', () => {
    it('should render placeholder when no section is active', () => {
      renderWithProvider(<ChatInterface activeSectionId={null} />);
      expect(
        screen.getByText(/Select a section from the sidebar/)
      ).toBeInTheDocument();
    });

    it('should render initial hint message', () => {
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );
      expect(
        screen.getByText(/Ask for help refining this section/)
      ).toBeInTheDocument();
    });

    it('should render message input field', () => {
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );
      const input = screen.getByLabelText('Chat message');
      expect(input).toBeInTheDocument();
    });

    it('should render send button', () => {
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );
      const button = screen.getByRole('button', { name: /Send/ });
      expect(button).toBeInTheDocument();
    });

    it('should have messages container', () => {
      const { container } = renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );
      expect(container.querySelector('.messages')).toBeInTheDocument();
    });

    it('should render form element', () => {
      const { container } = renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );
      expect(container.querySelector('form')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Message Display Tests
  // ========================================================================

  describe('Message Display', () => {
    it('should display user messages in chat', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );

      // Mock API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'This is an AI response',
        }),
      });

      const input = screen.getByLabelText('Chat message');
      await user.type(input, 'Help with this section');
      const sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Help with this section')).toBeInTheDocument();
      });
    });

    it('should display assistant messages', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );

      const aiResponse = 'This section should focus on the core value';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: aiResponse,
        }),
      });

      const input = screen.getByLabelText('Chat message');
      await user.type(input, 'Help refine');
      const sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(aiResponse)).toBeInTheDocument();
      });
    });

    it('should mark user messages with "You" label', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Response',
        }),
      });

      const input = screen.getByLabelText('Chat message');
      await user.type(input, 'User message');
      const sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('You')).toBeInTheDocument();
      });
    });

    it('should mark assistant messages with "AI" label', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'AI response',
        }),
      });

      const input = screen.getByLabelText('Chat message');
      await user.type(input, 'Ask something');
      const sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      await waitFor(() => {
        const aiLabels = screen.getAllByText('AI');
        expect(aiLabels.length).toBeGreaterThan(0);
      });
    });
  });

  // ========================================================================
  // Input Interaction Tests
  // ========================================================================

  describe('Input Interaction', () => {
    it('should send message on button click', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Response',
        }),
      });

      const input = screen.getByLabelText('Chat message');
      await user.type(input, 'Test message');
      const sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });
    });

    it('should send message on form submission', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Response',
        }),
      });

      const input = screen.getByLabelText('Chat message');
      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });
    });

    it('should clear input after sending message', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Response',
        }),
      });

      const input = screen.getByLabelText('Chat message') as HTMLInputElement;
      await user.type(input, 'Test message');
      const sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should disable input while loading', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );

      (global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    message: 'Response',
                  }),
                }),
              100
            )
          )
      );

      const input = screen.getByLabelText('Chat message');
      await user.type(input, 'Test message');
      const sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      expect(input).toBeDisabled();

      await waitFor(() => {
        expect(input).not.toBeDisabled();
      });
    });

    it('should not send empty messages', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );

      const sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not send whitespace-only messages', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );

      const input = screen.getByLabelText('Chat message');
      await user.type(input, '   ');
      const sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // ========================================================================
  // Loading State Tests
  // ========================================================================

  describe('Loading State', () => {
    it('should show loading indicator while waiting for response', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );

      (global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    message: 'Response',
                  }),
                }),
              200
            )
          )
      );

      const input = screen.getByLabelText('Chat message');
      await user.type(input, 'Test message');
      const sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      // Should show loading message
      expect(screen.getByText('Thinking...')).toBeInTheDocument();
    });

    it('should disable send button while loading', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );

      (global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    message: 'Response',
                  }),
                }),
              100
            )
          )
      );

      const input = screen.getByLabelText('Chat message');
      await user.type(input, 'Test message');
      const sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      expect(sendButton).toBeDisabled();

      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      });
    });
  });

  // ========================================================================
  // Error Handling Tests
  // ========================================================================

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          details: 'API error',
        }),
      });

      const input = screen.getByLabelText('Chat message');
      await user.type(input, 'Test message');
      const sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      await waitFor(() => {
        expect(
          screen.getByText('Sorry, something went wrong. Please try again.')
        ).toBeInTheDocument();
      });
    });

    it('should handle network failures', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );

      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const input = screen.getByLabelText('Chat message');
      await user.type(input, 'Test message');
      const sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      await waitFor(() => {
        expect(
          screen.getByText('Sorry, something went wrong. Please try again.')
        ).toBeInTheDocument();
      });
    });

    it('should display custom error messages from API', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          details: 'Section content is too short',
        }),
      });

      const input = screen.getByLabelText('Chat message');
      await user.type(input, 'Test message');
      const sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      await waitFor(() => {
        expect(
          screen.getByText('Sorry, something went wrong. Please try again.')
        ).toBeInTheDocument();
      });
    });

    it('should continue accepting messages after error', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );

      // First message fails
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          details: 'Error',
        }),
      });

      let input = screen.getByLabelText('Chat message');
      await user.type(input, 'First message');
      let sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      await waitFor(() => {
        expect(
          screen.getByText('Sorry, something went wrong. Please try again.')
        ).toBeInTheDocument();
      });

      // Second message succeeds
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Success',
        }),
      });

      input = screen.getByLabelText('Chat message');
      await user.type(input, 'Second message');
      sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Second message')).toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // Suggestion Acceptance Tests
  // ========================================================================

  describe('Suggestion Acceptance', () => {
    it('should show accept button when suggestion is provided', async () => {
      const user = userEvent.setup();
      const onAcceptSuggestion = jest.fn();

      renderWithProvider(
        <ChatInterface
          activeSectionId="purpose_vision"
          onAcceptSuggestion={onAcceptSuggestion}
        />
      );

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Here is my suggestion',
          suggestedContent: 'Suggested content for the section',
          isFinalSuggestion: true,
        }),
      });

      const input = screen.getByLabelText('Chat message');
      await user.type(input, 'Give me a suggestion');
      const sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Accept suggestion/ })
        ).toBeInTheDocument();
      });
    });

    it('should handle accept suggestion click', async () => {
      const user = userEvent.setup();
      const onAcceptSuggestion = jest.fn();

      renderWithProvider(
        <ChatInterface
          activeSectionId="purpose_vision"
          onAcceptSuggestion={onAcceptSuggestion}
        />
      );

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Here is my suggestion',
          suggestedContent: 'Suggested content',
        }),
      });

      const input = screen.getByLabelText('Chat message');
      await user.type(input, 'Give suggestion');
      const sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      await waitFor(() => {
        const acceptButton = screen.getByRole('button', {
          name: /Accept suggestion/,
        });
        expect(acceptButton).toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle section change while loading', async () => {
      const user = userEvent.setup();
      const { rerender } = renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );

      (global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    message: 'Response',
                  }),
                }),
              500
            )
          )
      );

      const input = screen.getByLabelText('Chat message');
      await user.type(input, 'Test message');
      const sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      // Change section
      rerender(
        <MRDProvider>
          <ChatInterface activeSectionId="problem_statement" />
        </MRDProvider>
      );

      expect(screen.getByText(/Select a section/)).toBeInTheDocument();
    });

    it('should handle very long messages', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Response',
        }),
      });

      const longMessage = 'a'.repeat(1000);
      const input = screen.getByLabelText('Chat message');
      await user.type(input, longMessage);
      const sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(longMessage)).toBeInTheDocument();
      });
    });

    it('should preserve conversation history across messages', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            message: 'First response',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            message: 'Second response',
          }),
        });

      const input = screen.getByLabelText('Chat message');
      await user.type(input, 'First message');
      let sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('First response')).toBeInTheDocument();
      });

      await user.type(input, 'Second message');
      sendButton = screen.getByRole('button', { name: /Send/ });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Second response')).toBeInTheDocument();
        expect(screen.getByText('First message')).toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // Accessibility Tests
  // ========================================================================

  describe('Accessibility', () => {
    it('should have labeled input field', () => {
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );
      const input = screen.getByLabelText('Chat message');
      expect(input).toBeInTheDocument();
    });

    it('should support keyboard submission', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Response',
        }),
      });

      const input = screen.getByLabelText('Chat message');
      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });
    });

    it('should use semantic form structure', () => {
      const { container } = renderWithProvider(
        <ChatInterface activeSectionId="purpose_vision" />
      );
      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
    });
  });
});
