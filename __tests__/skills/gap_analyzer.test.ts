import { analyzeGaps, mergeClarificationAnswers } from '@/skills/gap_analyzer';
import { RequestData, ClarificationAnswers } from '@/lib/schemas';

describe('gap_analyzer', () => {
  // Helper to create minimal valid RequestData
  const createRequestData = (overrides: Partial<RequestData> = {}): RequestData => ({
    requestId: 'TEST-001',
    sender: { email: null, name: 'Test', department: 'Test', inferredFrom: null },
    productConcept: {
      name: 'Test Product',
      summary: 'A comprehensive test product for market testing purposes',
      category: 'other',
    },
    rawInput: {
      productConcept: 'Test Product',
      targetMarket: 'Retail',
      additionalDetails: null,
    },
    extractedData: {
      targetMarkets: ['Retail'],
      useCases: ['Point of sale'],
      targetPrice: null,
      technicalRequirements: {
        deviceCompatibility: ['iPad'],
        vesaPattern: null,
        materials: [],
        other: [],
      },
      volumeExpectation: null,
      timeline: { urgency: 'medium', targetDate: null, notes: null },
      additionalContext: null,
    },
    gaps: { critical: [], optional: [] },
    scopeFlags: [],
    metadata: {
      parsedAt: new Date().toISOString(),
      parserVersion: '1.0.0',
      confidence: 0.8,
    },
    ...overrides,
  });

  describe('analyzeGaps', () => {
    describe('gap detection', () => {
      it('should detect blocking gap when no target markets', () => {
        const data = createRequestData({
          extractedData: {
            ...createRequestData().extractedData,
            targetMarkets: [],
          },
        });

        const result = analyzeGaps(data, 0);

        expect(result.gapAssessment.blocking).toContainEqual(
          expect.objectContaining({ field: 'target_markets' })
        );
      });

      it('should detect blocking gap when no use cases', () => {
        const data = createRequestData({
          extractedData: {
            ...createRequestData().extractedData,
            useCases: [],
          },
        });

        const result = analyzeGaps(data, 0);

        expect(result.gapAssessment.blocking).toContainEqual(
          expect.objectContaining({ field: 'use_cases' })
        );
      });

      it('should detect blocking gap when product concept too short', () => {
        const data = createRequestData({
          productConcept: {
            name: 'X',
            summary: 'Short',
            category: 'other',
          },
        });

        const result = analyzeGaps(data, 0);

        expect(result.gapAssessment.blocking).toContainEqual(
          expect.objectContaining({ field: 'product_concept' })
        );
      });

      it('should detect important gap when no price target', () => {
        const data = createRequestData();

        const result = analyzeGaps(data, 0);

        expect(result.gapAssessment.important).toContainEqual(
          expect.objectContaining({ field: 'target_price' })
        );
      });

      it('should detect important gap when no volume expectation', () => {
        const data = createRequestData();

        const result = analyzeGaps(data, 0);

        expect(result.gapAssessment.important).toContainEqual(
          expect.objectContaining({ field: 'volume_expectation' })
        );
      });
    });

    describe('decision making', () => {
      it('should decide to clarify when blocking gaps exist in round 0', () => {
        const data = createRequestData({
          extractedData: {
            ...createRequestData().extractedData,
            targetMarkets: [],
          },
        });

        const result = analyzeGaps(data, 0);

        expect(result.decision).toBe('clarify');
      });

      it('should decide to proceed when no blocking gaps and few important gaps', () => {
        const data = createRequestData({
          extractedData: {
            ...createRequestData().extractedData,
            targetPrice: { value: 500, type: 'approximate', min: null, max: null, currency: 'USD' },
            volumeExpectation: { quantity: 1000, period: 'annual', notes: null },
          },
        });

        const result = analyzeGaps(data, 0);

        expect(result.decision).toBe('proceed');
      });

      it('should decide to proceed after max clarification rounds', () => {
        const data = createRequestData({
          extractedData: {
            ...createRequestData().extractedData,
            targetMarkets: [],
          },
        });

        const result = analyzeGaps(data, 2);

        expect(result.decision).toBe('proceed');
      });
    });

    describe('question generation', () => {
      it('should generate questions for blocking gaps', () => {
        const data = createRequestData({
          extractedData: {
            ...createRequestData().extractedData,
            targetMarkets: [],
          },
        });

        const result = analyzeGaps(data, 0);

        expect(result.clarification).not.toBeNull();
        expect(result.clarification?.questions.length).toBeGreaterThan(0);
      });

      it('should not repeat questions from previous rounds', () => {
        const data = createRequestData();
        const previousQuestions = ['What price range are you targeting for this product?'];

        const result = analyzeGaps(data, 0, previousQuestions);

        const questions = result.clarification?.questions || [];
        const questionTexts = questions.map((q) => q.question);

        expect(questionTexts).not.toContain(previousQuestions[0]);
      });

      it('should limit questions to max 5', () => {
        const data = createRequestData({
          extractedData: {
            ...createRequestData().extractedData,
            targetMarkets: [],
            useCases: [],
            targetPrice: null,
            volumeExpectation: null,
            technicalRequirements: {
              deviceCompatibility: [],
              vesaPattern: null,
              materials: [],
              other: [],
            },
          },
        });

        const result = analyzeGaps(data, 0);

        expect(result.clarification?.questions.length).toBeLessThanOrEqual(5);
      });

      it('should prioritize questions by field priority', () => {
        const data = createRequestData({
          extractedData: {
            ...createRequestData().extractedData,
            targetMarkets: [],
            useCases: [],
            targetPrice: null,
          },
        });

        const result = analyzeGaps(data, 0);
        const questions = result.clarification?.questions || [];

        // Target markets should come before price
        const marketIndex = questions.findIndex((q) => q.field === 'target_markets');
        const priceIndex = questions.findIndex((q) => q.field === 'target_price');

        if (marketIndex !== -1 && priceIndex !== -1) {
          expect(marketIndex).toBeLessThan(priceIndex);
        }
      });
    });

    describe('proceed notes', () => {
      it('should include gaps to flag when proceeding', () => {
        const data = createRequestData();

        const result = analyzeGaps(data, 0);

        if (result.decision === 'proceed') {
          expect(result.proceedNotes).not.toBeNull();
          expect(result.proceedNotes?.gapsToFlag.length).toBeGreaterThan(0);
        }
      });

      it('should include assumptions when proceeding', () => {
        const data = createRequestData();

        const result = analyzeGaps(data, 0);

        if (result.decision === 'proceed') {
          expect(result.proceedNotes?.assumptionsToMake.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('mergeClarificationAnswers', () => {
    it('should merge price answer into extracted data', () => {
      const data = createRequestData();
      const answers: ClarificationAnswers = {
        round: 1,
        answers: [
          {
            question: 'What price range are you targeting for this product?',
            answer: '$200-$400',
          },
        ],
      };

      const result = mergeClarificationAnswers(data, answers);

      expect(result.extractedData.targetPrice).not.toBeNull();
      expect(result.extractedData.targetPrice?.type).toBe('range');
    });

    it('should merge volume answer into extracted data', () => {
      const data = createRequestData();
      const answers: ClarificationAnswers = {
        round: 1,
        answers: [
          {
            question: "What's the expected annual volume for this product?",
            answer: '2,000-10,000 units',
          },
        ],
      };

      const result = mergeClarificationAnswers(data, answers);

      expect(result.extractedData.volumeExpectation).not.toBeNull();
      expect(result.extractedData.volumeExpectation?.quantity).toBe(2000);
    });

    it('should merge market answer into extracted data', () => {
      const data = createRequestData({
        extractedData: {
          ...createRequestData().extractedData,
          targetMarkets: [],
        },
      });
      const answers: ClarificationAnswers = {
        round: 1,
        answers: [
          {
            question: 'Which market verticals are you targeting?',
            answer: 'Healthcare, Corporate',
          },
        ],
      };

      const result = mergeClarificationAnswers(data, answers);

      expect(result.extractedData.targetMarkets).toContain('Healthcare');
      expect(result.extractedData.targetMarkets).toContain('Corporate');
    });

    it('should re-assess gaps after merging', () => {
      const data = createRequestData({
        extractedData: {
          ...createRequestData().extractedData,
          targetMarkets: [],
        },
      });
      const answers: ClarificationAnswers = {
        round: 1,
        answers: [
          {
            question: 'Which market verticals are you targeting?',
            answer: 'Retail',
          },
        ],
      };

      const result = mergeClarificationAnswers(data, answers);

      // Should no longer have target_markets as critical gap
      expect(result.gaps.critical).not.toContainEqual(
        expect.objectContaining({ field: 'target_markets' })
      );
    });
  });
});
