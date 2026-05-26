import React from 'react';
import { act, render, screen } from '@testing-library/react';
import SectionNavMenu from '@/app/one-pager/components/SectionNavMenu';
import type { CompletionSection } from '@/app/one-pager/lib/one-pager-state';

type ObserverRecord = {
  key: string;
  callback: IntersectionObserverCallback;
};

const observers: ObserverRecord[] = [];

beforeEach(() => {
  observers.length = 0;
  document.body.innerHTML = '';

  class MockIntersectionObserver {
    private callback: IntersectionObserverCallback;

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }

    observe(element: Element) {
      observers.push({
        key: element.id.replace('section-', ''),
        callback: this.callback,
      });
    }

    disconnect() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
  }

  global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
});

function addSectionElements() {
  [
    'documentInfo',
    'productDescription',
    'goal',
    'where',
    'who',
    'useCases',
    'features',
    'commercials',
    'competitors',
    'referencePhotos',
    'footnotes',
  ].forEach((key) => {
    const el = document.createElement('section');
    el.id = `section-${key}`;
    document.body.appendChild(el);
  });
}

const completionSections: CompletionSection[] = [
  { key: 'documentInfo', label: 'Document Info', done: false, skippable: false },
  { key: 'productDescription', label: 'Product', done: true, skippable: false },
  { key: 'goal', label: 'Goal', done: false, skippable: true },
  { key: 'where', label: 'Where', done: false, skippable: true },
  { key: 'who', label: 'Who', done: false, skippable: true },
  { key: 'useCases', label: 'Use Cases', done: false, skippable: true },
  { key: 'features', label: 'Features', done: true, skippable: true },
  { key: 'commercials', label: 'Commercials', done: false, skippable: true },
  { key: 'competitors', label: 'Competitors', done: false, skippable: true },
  { key: 'referencePhotos', label: 'Photos', done: false, skippable: true },
  { key: 'footnotes', label: 'Notes', done: false, skippable: true },
];

describe('SectionNavMenu', () => {
  it('renders only active plus neighbor sections as labeled pills and collapses the rest to circles', () => {
    addSectionElements();
    render(
      <SectionNavMenu
        skippedSections={{}}
        completionSections={completionSections}
      />
    );

    const goalObserver = observers.find((observer) => observer.key === 'goal');
    expect(goalObserver).toBeDefined();

    act(() => {
      goalObserver?.callback(
        [{ intersectionRatio: 1, target: document.getElementById('section-goal') } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(screen.getByRole('button', { name: /product/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /goal/i }).getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('button', { name: /where/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Go to section Features' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Features' })).toBeNull();
  });

  it('styles done pills and done circles with their done classes', () => {
    addSectionElements();
    render(
      <SectionNavMenu
        skippedSections={{}}
        completionSections={completionSections}
      />
    );

    const goalObserver = observers.find((observer) => observer.key === 'goal');
    act(() => {
      goalObserver?.callback(
        [{ intersectionRatio: 1, target: document.getElementById('section-goal') } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(screen.getByRole('button', { name: /product/i }).className).toContain('pillDone');
    expect(screen.getByRole('button', { name: 'Go to section Features' }).className).toContain('circDone');
  });
});
