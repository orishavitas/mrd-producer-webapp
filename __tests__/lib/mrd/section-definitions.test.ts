/**
 * MRD Section Definitions Tests
 */

import {
  loadMRDDocParams,
  getEnabledSections,
  getSectionById,
  getMarkdownHeading,
  getEnabledSectionIds,
  getEnabledSubsectionIds,
} from '@/lib/mrd/section-definitions';

describe('section-definitions', () => {
  describe('loadMRDDocParams', () => {
    it('loads YAML and returns sections array', () => {
      const params = loadMRDDocParams();
      expect(params.sections).toBeDefined();
      expect(Array.isArray(params.sections)).toBe(true);
      expect(params.sections.length).toBe(12);
    });

    it('each section has required fields', () => {
      const params = loadMRDDocParams();
      params.sections.forEach((s, i) => {
        expect(s.id).toBeDefined();
        expect(s.number).toBe(i + 1);
        expect(s.title).toBeDefined();
        expect(typeof s.enabled).toBe('boolean');
        expect(s.markdown_heading).toMatch(/^## \d+\./);
        expect(s.extraction_prompt).toBeDefined();
        expect(s.chat_context).toBeDefined();
      });
    });
  });

  describe('getEnabledSections', () => {
    it('returns only enabled sections', () => {
      const enabled = getEnabledSections();
      expect(enabled.length).toBeGreaterThan(0);
      expect(enabled.every((s) => s.enabled !== false)).toBe(true);
    });
  });

  describe('getSectionById', () => {
    it('returns section for valid id', () => {
      const section = getSectionById('purpose_vision');
      expect(section).toBeDefined();
      expect(section!.id).toBe('purpose_vision');
      expect(section!.markdown_heading).toBe('## 1. Purpose & Vision');
    });

    it('returns undefined for unknown id', () => {
      expect(getSectionById('unknown')).toBeUndefined();
    });
  });

  describe('getMarkdownHeading', () => {
    it('returns heading for section', () => {
      expect(getMarkdownHeading('purpose_vision')).toBe('## 1. Purpose & Vision');
      expect(getMarkdownHeading('success_criteria')).toBe('## 12. Success Criteria');
    });
  });

  describe('getEnabledSectionIds', () => {
    it('returns ids in order', () => {
      const ids = getEnabledSectionIds();
      expect(ids[0]).toBe('purpose_vision');
      expect(ids[ids.length - 1]).toBe('success_criteria');
    });
  });

  describe('getEnabledSubsectionIds', () => {
    it('returns subsections for target_market', () => {
      const ids = getEnabledSubsectionIds('target_market');
      expect(ids).toContain('primary_markets');
      expect(ids).toContain('core_use_cases');
    });

    it('returns subsections for key_requirements', () => {
      const ids = getEnabledSubsectionIds('key_requirements');
      expect(ids).toContain('functional_requirements');
      expect(ids.length).toBeGreaterThanOrEqual(1);
    });

    it('returns empty for section without subsections', () => {
      expect(getEnabledSubsectionIds('purpose_vision')).toEqual([]);
    });
  });
});
