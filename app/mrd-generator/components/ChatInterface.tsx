'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useMRD } from '../lib/mrd-context';
import type { MRDSection } from '../lib/mrd-state';
import styles from './ChatInterface.module.css';

interface ChatInterfaceProps {
  activeSectionId: MRDSection | null;
  onAcceptSuggestion?: (content: string) => void;
}

export default function ChatInterface({
  activeSectionId,
  onAcceptSuggestion,
}: ChatInterfaceProps) {
  const { state, dispatch } = useMRD();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatMessages]);

  const currentContent =
    activeSectionId && state.sections[activeSectionId]
      ? state.sections[activeSectionId].content
      : '';
  const gaps =
    activeSectionId && state.sections[activeSectionId]
      ? state.sections[activeSectionId].gaps ?? []
      : [];

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || !activeSectionId || isLoading) return;

    const msg = {
      role: 'user' as const,
      content: userMessage,
      timestamp: Date.now(),
    };
    dispatch({ type: 'APPEND_CHAT_MESSAGE', payload: { message: msg } });
    setInputValue('');
    setIsLoading(true);

    try {
      const history = state.chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/mrd/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: activeSectionId,
          currentContent,
          userMessage: userMessage.trim(),
          conversationHistory: history,
          initialConcept: state.initialConcept || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.details || 'Request failed');
      }

      const aiMsg = {
        role: 'assistant' as const,
        content: data.message || '',
        suggestedContent: data.suggestedContent,
        isFinalSuggestion: data.isFinalSuggestion,
        timestamp: Date.now(),
      };
      dispatch({ type: 'APPEND_CHAT_MESSAGE', payload: { message: aiMsg } });
    } catch (err) {
      const errMsg = {
        role: 'assistant' as const,
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: Date.now(),
      };
      dispatch({ type: 'APPEND_CHAT_MESSAGE', payload: { message: errMsg } });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const lastMessage = state.chatMessages[state.chatMessages.length - 1];
  const hasSuggestion =
    lastMessage?.role === 'assistant' && (lastMessage as { suggestedContent?: string }).suggestedContent;

  const handleAccept = () => {
    const sug = (lastMessage as { suggestedContent?: string })?.suggestedContent;
    if (sug && activeSectionId && onAcceptSuggestion) {
      onAcceptSuggestion(sug);
      dispatch({
        type: 'SET_SECTION_CONTENT',
        payload: { sectionId: activeSectionId, content: sug },
      });
    }
  };

  if (!activeSectionId) {
    return (
      <div className={styles.placeholder}>
        <p>Select a section from the sidebar to chat with AI and refine it.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.messages}>
        {state.chatMessages.length === 0 && (
          <p className={styles.hint}>
            Ask for help refining this section. You can request more detail, clarify tone, or ask for a rewrite.
          </p>
        )}
        {state.chatMessages.map((m, i) => (
          <div
            key={i}
            className={m.role === 'user' ? styles.userBubble : styles.assistantBubble}
          >
            <span className={styles.role}>{m.role === 'user' ? 'You' : 'AI'}</span>
            <p className={styles.content}>{m.content}</p>
            {(m as { suggestedContent?: string }).suggestedContent && (
              <div className={styles.suggestion}>
                <button
                  type="button"
                  className={styles.acceptButton}
                  onClick={handleAccept}
                >
                  Accept suggestion
                </button>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className={styles.assistantBubble}>
            <span className={styles.role}>AI</span>
            <p className={styles.content}>Thinking...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask to refine this section..."
          className={styles.input}
          disabled={isLoading}
          aria-label="Chat message"
        />
        <button type="submit" className={styles.sendButton} disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  );
}
