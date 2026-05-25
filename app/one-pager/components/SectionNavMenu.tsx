'use client';

import { useEffect, useState } from 'react';
import styles from './SectionNavMenu.module.css';

const NAV_SECTIONS = [
  { key: 'documentInfo',       label: 'Doc Info',    number: null },
  { key: 'productDescription', label: 'Product',     number: '01' },
  { key: 'goal',               label: 'Goal',        number: '02' },
  { key: 'where',              label: 'Where',       number: '03' },
  { key: 'who',                label: 'Who',         number: '04' },
  { key: 'useCases',           label: 'Use Cases',   number: null },
  { key: 'features',           label: 'Features',    number: '05' },
  { key: 'commercials',        label: 'Commercials', number: '06' },
  { key: 'competitors',        label: 'Competitors', number: '07' },
  { key: 'referencePhotos',    label: 'Photos',      number: '08' },
  { key: 'footnotes',          label: 'Notes',       number: null },
] as const;

interface SectionNavMenuProps {
  skippedSections: Record<string, boolean>;
}

export default function SectionNavMenu({ skippedSections }: SectionNavMenuProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const visibilityMap: Record<string, number> = {};

    const observers: IntersectionObserver[] = NAV_SECTIONS.map(({ key }) => {
      const el = document.getElementById(`section-${key}`);
      if (!el) return null as unknown as IntersectionObserver;

      const observer = new IntersectionObserver(
        ([entry]) => {
          visibilityMap[key] = entry.intersectionRatio;
          // Pick the section with highest visibility ratio
          let bestKey: string | null = null;
          let bestRatio = -1;
          for (const [k, r] of Object.entries(visibilityMap)) {
            if (r > bestRatio) { bestRatio = r; bestKey = k; }
          }
          setActiveSection(bestKey);
        },
        { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0] }
      );
      observer.observe(el);
      return observer;
    }).filter(Boolean);

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  function scrollTo(key: string) {
    const el = document.getElementById(`section-${key}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav className={styles.nav} aria-label="Section navigation">
      <div className={styles.pills}>
        {NAV_SECTIONS.map(({ key, label, number }) => {
          const isActive = activeSection === key;
          const isDimmed = !!skippedSections[key];
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
