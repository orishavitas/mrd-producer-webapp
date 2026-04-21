import { loadPRDSections, PRDSectionConfig } from '@/lib/prd-sections-loader';

describe('prd-sections-loader', () => {
  it('loads 8 sections', () => {
    const sections = loadPRDSections();
    expect(sections).toHaveLength(8);
  });

  it('each section has required fields', () => {
    const sections = loadPRDSections();
    for (const s of sections) {
      expect(s.key).toBeTruthy();
      expect(s.title).toBeTruthy();
      expect(s.order).toBeGreaterThan(0);
      expect(s.systemPrompt).toBeTruthy();
      expect(s.userPromptTemplate).toBeTruthy();
    }
  });

  it('section keys are unique', () => {
    const sections = loadPRDSections();
    const keys = sections.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('sections are sorted by order', () => {
    const sections = loadPRDSections();
    for (let i = 1; i < sections.length; i++) {
      expect(sections[i].order).toBeGreaterThan(sections[i - 1].order);
    }
  });
});
