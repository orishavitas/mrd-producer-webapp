import { loadPRDSectionsV2 } from '@/lib/prd-sections-loader';

describe('loadPRDSectionsV2', () => {
  it('loads all 11 sections from config/prd-sections-v2.yaml, sorted by order', () => {
    const sections = loadPRDSectionsV2();
    expect(sections).toHaveLength(11);
    expect(sections[0].key).toBe('overview');
    expect(sections[sections.length - 1].key).toBe('references');
    for (let i = 1; i < sections.length; i++) {
      expect(sections[i].order).toBeGreaterThan(sections[i - 1].order);
    }
  });

  it('marks the requirements section as type "requirements" and all others as "text"', () => {
    const sections = loadPRDSectionsV2();
    const requirements = sections.find((s) => s.key === 'requirements');
    expect(requirements?.type).toBe('requirements');
    const others = sections.filter((s) => s.key !== 'requirements');
    expect(others.every((s) => s.type === 'text')).toBe(true);
  });

  it('maps design_scope-adjacent sections to a One-Pager skip key where one exists', () => {
    const sections = loadPRDSectionsV2();
    const commercial = sections.find((s) => s.key === 'commercial_parameters');
    expect(commercial?.onePagerSkipKey).toBe('commercials');
    const overview = sections.find((s) => s.key === 'overview');
    expect(overview?.onePagerSkipKey).toBeNull();
  });
});
