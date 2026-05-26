'use client';

import React, { useEffect, useState } from 'react';
import type { CompletionSection } from '../lib/one-pager-state';
import styles from './SectionNavMenu.module.css';

const NAV_SECTIONS = [
  { key: 'documentInfo', label: 'Doc Info', number: 'DI' },
  { key: 'productDescription', label: 'Product', number: '01' },
  { key: 'goal', label: 'Goal', number: '02' },
  { key: 'where', label: 'Where', number: '03' },
  { key: 'who', label: 'Who', number: '04' },
  { key: 'useCases', label: 'Use Cases', number: 'UC' },
  { key: 'features', label: 'Features', number: '05' },
  { key: 'commercials', label: 'Commercials', number: '06' },
  { key: 'competitors', label: 'Competitors', number: '07' },
  { key: 'referencePhotos', label: 'Photos', number: '08' },
  { key: 'footnotes', label: 'Notes', number: 'FN' },
] as const;

interface SectionNavMenuProps {
  skippedSections: Record<string, boolean>;
  completionSections: CompletionSection[];
}

export default function SectionNavMenu({ skippedSections, completionSections }: SectionNavMenuProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const visibilityMap: Record<string, number> = {};

    const observers: IntersectionObserver[] = NAV_SECTIONS.map(({ key }) => {
      const el = document.getElementById(`section-${key}`);
      if (!el) return null as unknown as IntersectionObserver;

      const observer = new IntersectionObserver(
        ([entry]) => {
          visibilityMap[key] = entry.intersectionRatio;
          let bestKey: string | null = null;
          let bestRatio = -1;
          for (const [mapKey, ratio] of Object.entries(visibilityMap)) {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              bestKey = mapKey;
            }
          }
          setActiveSection(bestKey);
        },
        { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0] }
      );
      observer.observe(el);
      return observer;
    }).filter(Boolean);

    return () => observers.forEach((observer) => observer.disconnect());
  }, []);

  function scrollTo(key: string) {
    const el = document.getElementById(`section-${key}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const doneKeys = new Set(
    completionSections.filter((section) => section.done).map((section) => section.key)
  );
  const activeIndex = NAV_SECTIONS.findIndex((section) => section.key === activeSection);

  return (
    <nav className={styles.nav} aria-label="Section navigation">
      <div className={styles.pills}>
        {NAV_SECTIONS.map(({ key, label, number }, index) => {
          const isActive = activeSection === key;
          const isDone = doneKeys.has(key);
          const isDimmed = !!skippedSections[key];
          const isNeighbor =
            activeIndex >= 0 &&
            (index === activeIndex - 1 || index === activeIndex + 1);
          const showAsPill = isActive || isNeighbor || activeIndex < 0;

          if (!showAsPill) {
            return (
              <button
                key={key}
                type="button"
                onClick={() => scrollTo(key)}
                className={isDimmed ? styles.circDimmed : isDone ? styles.circDone : styles.circ}
                aria-label={`Go to section ${label}`}
              >
                <span className={styles.circTooltip}>{label}</span>
                {number}
              </button>
            );
          }

          return (
            <button
              key={key}
              type="button"
              onClick={() => scrollTo(key)}
              aria-current={isActive ? 'true' : undefined}
              className={
                isDimmed
                  ? styles.pillDimmed
                  : isActive
                  ? styles.pillActive
                  : isDone
                  ? styles.pillDone
                  : styles.pill
              }
            >
              {number && <span className={styles.pillNumber}>{number}</span>}
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
