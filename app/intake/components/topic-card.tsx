'use client';

import { useRef, useEffect, useState } from 'react';
import styles from './topic-card.module.css';

interface TopicCardProps {
  title: string;
  description: string;
  topicId: string;
  status: 'active' | 'completed' | 'upcoming';
  completeness: number;
  summary?: string;
  onSubmit?: () => void;
  onExpand?: () => void;
  children?: React.ReactNode;
}

export default function TopicCard({
  title,
  description,
  topicId,
  status,
  completeness,
  summary,
  onSubmit,
  onExpand,
  children,
}: TopicCardProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  const isActive = status === 'active';
  const isCompleted = status === 'completed';
  const isUpcoming = status === 'upcoming';

  useEffect(() => {
    if (isActive && contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [isActive, children]);

  // Re-measure when children change
  useEffect(() => {
    if (isActive && contentRef.current) {
      const observer = new ResizeObserver(() => {
        if (contentRef.current) {
          setContentHeight(contentRef.current.scrollHeight);
        }
      });
      observer.observe(contentRef.current);
      return () => observer.disconnect();
    }
  }, [isActive]);

  const cardClassName = [
    styles.card,
    isActive ? styles.cardActive : '',
    isCompleted ? styles.cardCompleted : '',
    isUpcoming ? styles.cardUpcoming : '',
  ]
    .filter(Boolean)
    .join(' ');

  function handleCardClick() {
    if (isCompleted && onExpand) {
      onExpand();
    }
  }

  function handleCardKeyDown(e: React.KeyboardEvent) {
    if (isCompleted && onExpand && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onExpand();
    }
  }

  return (
    <div
      className={cardClassName}
      data-topic-id={topicId}
      role={isCompleted ? 'button' : undefined}
      tabIndex={isCompleted ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      aria-expanded={isActive}
    >
      {/* Card header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {isCompleted && (
            <span className={styles.checkmark} aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="8" fill="var(--success)" />
                <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
          <h3 className={styles.title}>{title}</h3>
        </div>
        {isCompleted && (
          <span className={styles.completenessTag}>
            {completeness}%
          </span>
        )}
      </div>

      {/* Active: show description, children, and submit button */}
      <div
        ref={contentRef}
        className={styles.expandable}
        style={{
          maxHeight: isActive ? (contentHeight ? `${contentHeight}px` : '2000px') : '0px',
          opacity: isActive ? 1 : 0,
        }}
      >
        <div className={styles.expandableInner}>
          <p className={styles.description}>{description}</p>
          {children && <div className={styles.content}>{children}</div>}
          {onSubmit && (
            <div className={styles.footer}>
              <button
                type="button"
                className={styles.submitButton}
                onClick={onSubmit}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Completed: show summary */}
      {isCompleted && summary && (
        <p className={styles.summary}>{summary}</p>
      )}

      {/* Upcoming: just the title is shown, rest is dimmed via CSS */}
    </div>
  );
}
