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

  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trimEnd();

    // Headings
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={key++} className={styles.heading3}>
          <InlineText text={trimmed.slice(4)} />
        </h4>
      );
      i++;
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={key++} className={styles.heading2}>
          <InlineText text={trimmed.slice(3)} />
        </h3>
      );
      i++;
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={key++} className={styles.heading1}>
          <InlineText text={trimmed.slice(2)} />
        </h2>
      );
      i++;
    }
    // Horizontal rule
    else if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(<hr key={key++} className={styles.hr} />);
      i++;
    }
    // Bullet list - collect consecutive items into <ul>
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items: React.ReactNode[] = [];
      while (i < lines.length) {
        const t = lines[i].trimEnd();
        if (t.startsWith('- ') || t.startsWith('* ')) {
          items.push(
            <li key={key++} className={styles.listItem}>
              <InlineText text={t.slice(2)} />
            </li>
          );
          i++;
        } else {
          break;
        }
      }
      elements.push(<ul key={key++} className={styles.list}>{items}</ul>);
    }
    // Numbered list - collect consecutive items into <ol>
    else if (/^\d+\.\s/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length) {
        const t = lines[i].trimEnd();
        if (/^\d+\.\s/.test(t)) {
          const text = t.replace(/^\d+\.\s/, '');
          items.push(
            <li key={key++} className={styles.listItem}>
              <InlineText text={text} />
            </li>
          );
          i++;
        } else {
          break;
        }
      }
      elements.push(<ol key={key++} className={styles.list}>{items}</ol>);
    }
    // Empty line
    else if (trimmed === '') {
      elements.push(<div key={key++} className={styles.spacer} />);
      i++;
    }
    // Regular paragraph
    else {
      elements.push(
        <p key={key++} className={styles.paragraph}>
          <InlineText text={trimmed} />
        </p>
      );
      i++;
    }
  }

  return <div className={styles.briefBody}>{elements}</div>;
}

/** Renders inline bold (**text**) and italic (*text* / _text_) markers */
function InlineText({ text }: { text: string }) {
  // Match bold (**text**) first, then italic (*text* or _text_)
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g);
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
        if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
          return (
            <em key={i} className={styles.italic}>
              {part.slice(1, -1)}
            </em>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
