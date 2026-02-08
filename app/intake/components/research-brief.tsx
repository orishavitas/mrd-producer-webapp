'use client';

import { useState } from 'react';
import styles from './research-brief.module.css';

interface ResearchBriefProps {
  briefContent: string;
  onRevisionRequest: (revision: string) => void;
  isRevising?: boolean;
}

/**
 * Displays the AI-generated research brief with markdown-like formatting.
 * Allows the user to request revisions via a text input.
 */
export default function ResearchBrief({
  briefContent,
  onRevisionRequest,
  isRevising = false,
}: ResearchBriefProps) {
  const [revision, setRevision] = useState('');

  function handleSubmitRevision() {
    const trimmed = revision.trim();
    if (trimmed) {
      onRevisionRequest(trimmed);
      setRevision('');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmitRevision();
    }
  }

  return (
    <div className={styles.container}>
      {/* Brief content */}
      <div className={styles.briefContent}>
        <BriefRenderer content={briefContent} />
      </div>

      {/* Revision input */}
      <div className={styles.revisionBar}>
        <input
          type="text"
          className={styles.revisionInput}
          value={revision}
          onChange={(e) => setRevision(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Request changes..."
          disabled={isRevising}
          aria-label="Request changes to the brief"
        />
        <button
          type="button"
          className={styles.revisionButton}
          onClick={handleSubmitRevision}
          disabled={!revision.trim() || isRevising}
        >
          {isRevising ? (
            <span className={styles.spinnerWrapper}>
              <span className={styles.spinner} aria-hidden="true" />
              Revising...
            </span>
          ) : (
            'Submit revision'
          )}
        </button>
      </div>
    </div>
  );
}

// --- Simple markdown renderer ---

function BriefRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    const trimmed = line.trimEnd();

    // Headings
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={key++} className={styles.heading3}>
          {trimmed.slice(4)}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={key++} className={styles.heading2}>
          {trimmed.slice(3)}
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={key++} className={styles.heading1}>
          {trimmed.slice(2)}
        </h2>
      );
    }
    // Bullet list items
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={key++} className={styles.listItem}>
          <InlineText text={trimmed.slice(2)} />
        </li>
      );
    }
    // Numbered list items
    else if (/^\d+\.\s/.test(trimmed)) {
      const text = trimmed.replace(/^\d+\.\s/, '');
      elements.push(
        <li key={key++} className={styles.listItem}>
          <InlineText text={text} />
        </li>
      );
    }
    // Empty line
    else if (trimmed === '') {
      elements.push(<div key={key++} className={styles.spacer} />);
    }
    // Regular paragraph
    else {
      elements.push(
        <p key={key++} className={styles.paragraph}>
          <InlineText text={trimmed} />
        </p>
      );
    }
  }

  return <div className={styles.briefBody}>{elements}</div>;
}

/** Renders inline bold markers (**text**) */
function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className={styles.bold}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
