'use client';

/**
 * AI Expansion Panel Component
 *
 * Chat-like interface for conversational AI expansion.
 * Supports multi-turn conversation, suggested bullet points,
 * and accepting/rejecting AI suggestions.
 */

import React, { useState, useRef, useEffect } from 'react';
import { BriefField } from '../lib/brief-state';
import styles from './AIExpansionPanel.module.css';

// ============================================================================
// Types
// ============================================================================

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestedBullets?: string[];
  isFinalSuggestion?: boolean;
  timestamp: number;
}

export interface AIExpansionPanelProps {
  /** Field type being expanded */
  fieldType: BriefField;
  /** Current bullet points */
  currentBullets: string[];
  /** Identified gaps (optional) */
  gaps?: Array<{
    category: string;
    suggestedQuestion: string;
    exampleAnswer?: string;
  }>;
  /** Callback when user accepts AI suggestions */
  onAcceptSuggestions: (bullets: string[]) => void;
  /** Callback when panel should close */
  onClose: () => void;
}

// ============================================================================
// Component
// ============================================================================

export default function AIExpansionPanel({
  fieldType,
  currentBullets,
  gaps,
  onAcceptSuggestions,
  onClose,
}: AIExpansionPanelProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [latestSuggestions, setLatestSuggestions] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Send initial AI greeting
  useEffect(() => {
    if (messages.length === 0) {
      sendInitialMessage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------------------------------
  // API Calls
  // --------------------------------------------------------------------------

  const sendInitialMessage = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/brief/expand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fieldType,
          currentBullets,
          gaps,
          // No userMessage - triggers initial AI greeting
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.details || 'Failed to get AI response');
      }

      // Add AI message
      const aiMessage: ConversationMessage = {
        role: 'assistant',
        content: data.message || 'How can I help you expand this field?',
        suggestedBullets: data.suggestedBullets,
        isFinalSuggestion: data.isFinalSuggestion,
        timestamp: Date.now(),
      };

      setMessages([aiMessage]);

      if (data.suggestedBullets) {
        setLatestSuggestions(data.suggestedBullets);
      }
    } catch (error) {
      console.error('AI expansion error:', error);
      // Show error message
      setMessages([
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;

    // Add user message
    const userMsg: ConversationMessage = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build conversation history (exclude suggested bullets)
      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch('/api/brief/expand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fieldType,
          currentBullets,
          gaps,
          userMessage,
          conversationHistory: history,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.details || 'Failed to get AI response');
      }

      // Add AI response
      const aiMessage: ConversationMessage = {
        role: 'assistant',
        content: data.message || 'I apologize, I could not generate a response.',
        suggestedBullets: data.suggestedBullets,
        isFinalSuggestion: data.isFinalSuggestion,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (data.suggestedBullets) {
        setLatestSuggestions(data.suggestedBullets);
      }
    } catch (error) {
      console.error('AI expansion error:', error);
      // Show error message
      const errorMsg: ConversationMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Event Handlers
  // --------------------------------------------------------------------------

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleAccept = () => {
    if (latestSuggestions.length > 0) {
      onAcceptSuggestions(latestSuggestions);
      onClose();
    }
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <svg
              className={styles.headerIcon}
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M13 2L3 14H10L9 18L19 6H12L13 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h3 className={styles.headerTitle}>AI Expansion Assistant</h3>
          </div>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close AI expansion panel"
            type="button"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 5L5 15M5 5L15 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className={styles.messages}>
          {messages.map((msg, index) => (
            <div
              key={index}
              className={styles.messageWrapper}
              data-role={msg.role}
            >
              <div className={styles.message}>
                <div className={styles.messageContent}>{msg.content}</div>

                {/* Suggested bullets */}
                {msg.suggestedBullets && msg.suggestedBullets.length > 0 && (
                  <div className={styles.suggestedBullets}>
                    <p className={styles.suggestedBulletsTitle}>
                      {msg.isFinalSuggestion
                        ? 'Complete bullet points:'
                        : 'Suggested additions:'}
                    </p>
                    <ul className={styles.suggestedBulletsList}>
                      {msg.suggestedBullets.map((bullet, idx) => (
                        <li key={idx} className={styles.suggestedBullet}>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className={styles.messageWrapper} data-role="assistant">
              <div className={styles.message}>
                <div className={styles.loadingDots}>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input form */}
        <form className={styles.inputForm} onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="Ask a question or request changes..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className={styles.sendButton}
            disabled={!inputValue.trim() || isLoading}
            aria-label="Send message"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 2L9 11M18 2L12 18L9 11M18 2L2 8L9 11"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>

        {/* Actions */}
        {latestSuggestions.length > 0 && (
          <div className={styles.actions}>
            <button
              className={styles.actionButton}
              onClick={onClose}
              type="button"
            >
              Keep Editing
            </button>
            <button
              className={`${styles.actionButton} ${styles.primaryAction}`}
              onClick={handleAccept}
              type="button"
            >
              Accept Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
