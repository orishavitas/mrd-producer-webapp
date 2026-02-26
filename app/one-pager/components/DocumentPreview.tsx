'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './DocumentPreview.module.css';
import { OnePagerState } from '../lib/one-pager-state';

interface DocumentPreviewProps {
  state: OnePagerState;
}

export default function DocumentPreview({ state }: DocumentPreviewProps) {
  const generateMarkdown = (): string => {
    const parts: string[] = ['# Product One-Pager', ''];

    if (state.description) {
      parts.push('## Product Description', '', state.description, '');
    }

    if (state.goal) {
      parts.push('## Goal', '', state.goal, '');
    }

    if (state.context.environments.length > 0 || state.context.industries.length > 0) {
      parts.push('## Where');
      if (state.context.environments.length > 0) {
        parts.push('', '**Environment:** ' + state.context.environments.join(', '));
      }
      if (state.context.industries.length > 0) {
        parts.push('', '**Industry:** ' + state.context.industries.join(', '));
      }
      parts.push('');
    }

    const allRoles = [...state.audience.predefined, ...state.audience.custom];
    if (allRoles.length > 0) {
      parts.push('## Who (Target Audience)', '', allRoles.map((r) => `- ${r}`).join('\n'), '');
    }

    if (state.features.mustHave.length > 0 || state.features.niceToHave.length > 0) {
      parts.push('## Features');
      if (state.features.mustHave.length > 0) {
        parts.push('', '**Must Have:**', state.features.mustHave.map((f) => `- ${f}`).join('\n'));
      }
      if (state.features.niceToHave.length > 0) {
        parts.push('', '**Nice to Have:**', state.features.niceToHave.map((f) => `- ${f}`).join('\n'));
      }
      parts.push('');
    }

    if (state.commercials.moq || state.commercials.targetPrice) {
      parts.push('## Commercials');
      if (state.commercials.moq) parts.push('', `**MOQ:** ${state.commercials.moq}`);
      if (state.commercials.targetPrice) parts.push('', `**Target Price:** ${state.commercials.targetPrice}`);
      parts.push('');
    }

    if (state.competitors.filter((c) => c.status === 'done').length > 0) {
      parts.push('## Competitors', '');
      for (const comp of state.competitors.filter((c) => c.status === 'done')) {
        parts.push(`### ${comp.brand} - ${comp.productName}`);
        if (comp.photoUrl) {
          parts.push(`![${comp.productName}](${comp.photoUrl})`, '');
        }
        if (comp.cost) parts.push(`**Price:** ${comp.cost}`);
        if (comp.description) parts.push(comp.description);
        parts.push(`[View product](${comp.url})`, '');
      }
    }

    return parts.join('\n');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Document Preview</h3>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/compulocks-logo.png"
          alt="Compulocks"
          className={styles.logo}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      </div>
      <div className={styles.content}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {generateMarkdown()}
        </ReactMarkdown>
      </div>
    </div>
  );
}
