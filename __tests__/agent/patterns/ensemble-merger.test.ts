/**
 * Tests for Ensemble Merger
 */

import { EnsembleMerger, MRDCandidate } from '@/agent/patterns/ensemble-merger';

describe('EnsembleMerger', () => {
  let merger: EnsembleMerger;

  beforeEach(() => {
    merger = new EnsembleMerger();
  });

  describe('best-of-n strategy', () => {
    it('should select the candidate with highest overall score', () => {
      const candidates: MRDCandidate[] = [
        {
          id: 'candidate-1',
          sections: { 1: 'Section 1 v1', 2: 'Section 2 v1' },
          confidence: { 1: 70, 2: 60 },
          overallScore: 65,
          source: 'generator-1',
        },
        {
          id: 'candidate-2',
          sections: { 1: 'Section 1 v2', 2: 'Section 2 v2' },
          confidence: { 1: 85, 2: 90 },
          overallScore: 87.5,
          source: 'generator-2',
        },
        {
          id: 'candidate-3',
          sections: { 1: 'Section 1 v3', 2: 'Section 2 v3' },
          confidence: { 1: 75, 2: 70 },
          overallScore: 72.5,
          source: 'generator-3',
        },
      ];

      const result = merger.merge(candidates, { strategy: 'best-of-n' });

      expect(result.strategy).toBe('best-of-n');
      expect(result.overallConfidence).toBe(87.5);
      expect(result.sections[1]).toBe('Section 1 v2');
      expect(result.sections[2]).toBe('Section 2 v2');
      expect(result.winners[1]).toBe('candidate-2');
      expect(result.winners[2]).toBe('candidate-2');
    });
  });

  describe('section-voting strategy', () => {
    it('should vote on each section independently', () => {
      const candidates: MRDCandidate[] = [
        {
          id: 'candidate-1',
          sections: { 1: 'Section 1 v1', 2: 'Section 2 v1' },
          confidence: { 1: 90, 2: 50 },
          overallScore: 70,
          source: 'generator-1',
        },
        {
          id: 'candidate-2',
          sections: { 1: 'Section 1 v2', 2: 'Section 2 v2' },
          confidence: { 1: 70, 2: 95 },
          overallScore: 82.5,
          source: 'generator-2',
        },
      ];

      const result = merger.merge(candidates, { strategy: 'section-voting' });

      expect(result.strategy).toBe('section-voting');
      // Section 1 should come from candidate-1 (confidence 90)
      expect(result.sections[1]).toBe('Section 1 v1');
      expect(result.winners[1]).toBe('candidate-1');
      // Section 2 should come from candidate-2 (confidence 95)
      expect(result.sections[2]).toBe('Section 2 v2');
      expect(result.winners[2]).toBe('candidate-2');
      expect(result.votingDetails).toBeDefined();
      expect(result.votingDetails?.length).toBe(2);
    });

    it('should handle tie-breaking by content length', () => {
      const candidates: MRDCandidate[] = [
        {
          id: 'candidate-1',
          sections: { 1: 'Short content' },
          confidence: { 1: 80 },
          overallScore: 80,
          source: 'generator-1',
        },
        {
          id: 'candidate-2',
          sections: { 1: 'This is much longer content with more detail' },
          confidence: { 1: 80 },
          overallScore: 80,
          source: 'generator-2',
        },
      ];

      const result = merger.merge(candidates, {
        strategy: 'section-voting',
        enableTieBreaking: true,
      });

      // Should prefer the longer content in case of tie
      expect(result.sections[1]).toBe('This is much longer content with more detail');
    });
  });

  describe('confidence-weighted strategy', () => {
    it('should weight by confidence scores', () => {
      const candidates: MRDCandidate[] = [
        {
          id: 'candidate-1',
          sections: { 1: 'Section 1 v1' },
          confidence: { 1: 95 },
          overallScore: 95,
          source: 'generator-1',
        },
        {
          id: 'candidate-2',
          sections: { 1: 'Section 1 v2' },
          confidence: { 1: 60 },
          overallScore: 60,
          source: 'generator-2',
        },
      ];

      const result = merger.merge(candidates, { strategy: 'confidence-weighted' });

      expect(result.sections[1]).toBe('Section 1 v1');
      expect(result.confidence[1]).toBe(95);
    });
  });

  describe('quality-weighted strategy', () => {
    it('should combine quality and confidence scores', () => {
      const candidates: MRDCandidate[] = [
        {
          id: 'candidate-1',
          sections: { 1: 'Section 1 v1' },
          confidence: { 1: 90 },
          overallScore: 90,
          source: 'generator-1',
          qualityReview: {
            overallScore: 70,
            passed: true,
            dimensions: {
              completeness: 70,
              specificity: 70,
              structure: 70,
              research: 70,
              technical: 70,
            },
            sections: [],
            criticalIssues: [],
            suggestions: [],
            strengths: [],
          },
        },
        {
          id: 'candidate-2',
          sections: { 1: 'Section 1 v2' },
          confidence: { 1: 70 },
          overallScore: 70,
          source: 'generator-2',
          qualityReview: {
            overallScore: 95,
            passed: true,
            dimensions: {
              completeness: 95,
              specificity: 95,
              structure: 95,
              research: 95,
              technical: 95,
            },
            sections: [],
            criticalIssues: [],
            suggestions: [],
            strengths: [],
          },
        },
      ];

      const result = merger.merge(candidates, {
        strategy: 'quality-weighted',
        qualityWeight: 0.7,
      });

      // Candidate-2 should win due to higher quality score
      // (95 * 0.7 + 70 * 0.3 = 87.5) vs (70 * 0.7 + 90 * 0.3 = 76)
      expect(result.sections[1]).toBe('Section 1 v2');
    });
  });

  describe('single candidate', () => {
    it('should return single candidate as-is', () => {
      const candidates: MRDCandidate[] = [
        {
          id: 'only-candidate',
          sections: { 1: 'Section 1', 2: 'Section 2' },
          confidence: { 1: 80, 2: 85 },
          overallScore: 82.5,
          source: 'generator',
        },
      ];

      const result = merger.merge(candidates, { strategy: 'best-of-n' });

      expect(result.sections).toEqual(candidates[0].sections);
      expect(result.confidence).toEqual(candidates[0].confidence);
      expect(result.overallConfidence).toBe(82.5);
    });
  });

  describe('error cases', () => {
    it('should throw error for empty candidate list', () => {
      expect(() => {
        merger.merge([], { strategy: 'best-of-n' });
      }).toThrow('Cannot merge empty candidate list');
    });

    it('should throw error for unknown strategy', () => {
      const candidates: MRDCandidate[] = [
        {
          id: 'candidate-1',
          sections: { 1: 'Section 1' },
          confidence: { 1: 80 },
          overallScore: 80,
          source: 'generator',
        },
      ];

      expect(() => {
        merger.merge(candidates, { strategy: 'unknown' as any });
      }).toThrow('Unknown merge strategy');
    });
  });

  describe('helper methods', () => {
    it('should create candidate from section generator output', () => {
      const output = {
        sections: { 1: 'Section 1', 2: 'Section 2' },
        confidence: { 1: 80, 2: 90 },
        dataSources: { 1: ['user'], 2: ['research'] },
        gaps: [],
        domain: 'market',
      };

      const candidate = EnsembleMerger.createCandidate('test-id', output, 'test-source');

      expect(candidate.id).toBe('test-id');
      expect(candidate.source).toBe('test-source');
      expect(candidate.sections).toEqual(output.sections);
      expect(candidate.confidence).toEqual(output.confidence);
      expect(candidate.overallScore).toBe(85); // Average of 80 and 90
    });

    it('should combine sections from multiple generators', () => {
      const marketOutput = {
        sections: { 1: 'Section 1', 2: 'Section 2' },
        confidence: { 1: 80, 2: 85 },
        dataSources: { 1: ['user'], 2: ['user'] },
        gaps: [],
        domain: 'market',
      };

      const technicalOutput = {
        sections: { 5: 'Section 5', 6: 'Section 6' },
        confidence: { 5: 75, 6: 80 },
        dataSources: { 5: ['user'], 6: ['user'] },
        gaps: [],
        domain: 'technical',
      };

      const strategyOutput = {
        sections: { 8: 'Section 8', 9: 'Section 9' },
        confidence: { 8: 70, 9: 75 },
        dataSources: { 8: ['user'], 9: ['user'] },
        gaps: [],
        domain: 'strategy',
      };

      const combined = EnsembleMerger.combineSections(
        marketOutput,
        technicalOutput,
        strategyOutput
      );

      expect(Object.keys(combined).length).toBe(6);
      expect(combined[1]).toBe('Section 1');
      expect(combined[5]).toBe('Section 5');
      expect(combined[8]).toBe('Section 8');
    });
  });
});
