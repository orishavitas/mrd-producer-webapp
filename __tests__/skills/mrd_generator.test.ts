import { generateMRD, MRDInput } from '@/skills/mrd_generator';
import * as gemini from '@/lib/gemini';

// Mock the gemini module
jest.mock('@/lib/gemini', () => ({
  isGeminiAvailable: jest.fn(),
  generateText: jest.fn(),
}));

describe('mrd_generator', () => {
  const mockIsGeminiAvailable = gemini.isGeminiAvailable as jest.Mock;
  const mockGenerateText = gemini.generateText as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateMRD', () => {
    const basicInput: MRDInput = {
      productConcept: 'AI Task Manager',
      targetMarket: 'Small business owners',
      researchFindings: [],
    };

    describe('template generation (when Gemini is unavailable)', () => {
      beforeEach(() => {
        mockIsGeminiAvailable.mockReturnValue(false);
      });

      it('should generate template MRD with basic input', async () => {
        const mrd = await generateMRD(basicInput);

        expect(mrd).toContain('# Market Requirements Document (MRD)');
        expect(mrd).toContain('AI Task Manager');
        expect(mrd).toContain('Small business owners');
        expect(mrd).toContain('## 1. Purpose & Vision');
        expect(mrd).toContain('## 2. Problem Statement');
        expect(mrd).toContain('## 3. Target Market & Use Cases');
      });

      it('should include additional details when provided', async () => {
        const input: MRDInput = {
          ...basicInput,
          additionalDetails: 'Must integrate with Slack',
        };

        const mrd = await generateMRD(input);

        expect(mrd).toContain('Must integrate with Slack');
      });

      it('should include research findings in Competition section', async () => {
        const input: MRDInput = {
          ...basicInput,
          researchFindings: [
            {
              title: 'Market Research Report',
              url: 'https://example.com/report',
              snippet: 'The market is growing rapidly',
            },
          ],
        };

        const mrd = await generateMRD(input);

        expect(mrd).toContain('Market Research Report');
        expect(mrd).toContain('https://example.com/report');
        expect(mrd).toContain('## 10. Competition to review');
      });

      it('should include clarifications when provided', async () => {
        const input: MRDInput = {
          ...basicInput,
          clarifications: [
            { question: 'Target price?', answer: '$20/month' },
            { question: 'Launch date?', answer: 'Q2 2025' },
          ],
        };

        const mrd = await generateMRD(input);

        expect(mrd).toContain('Target price?');
        expect(mrd).toContain('$20/month');
      });

      it('should handle empty research findings gracefully', async () => {
        const mrd = await generateMRD(basicInput);

        expect(mrd).toContain('Competitive analysis to be conducted');
      });

      it('should include all 12 required sections', async () => {
        const mrd = await generateMRD(basicInput);

        expect(mrd).toContain('## Product Name');
        expect(mrd).toContain('## 1. Purpose & Vision');
        expect(mrd).toContain('## 2. Problem Statement');
        expect(mrd).toContain('## 3. Target Market & Use Cases');
        expect(mrd).toContain('## 4. Target Users');
        expect(mrd).toContain('## 5. Product Description');
        expect(mrd).toContain('## 6. Key Requirements');
        expect(mrd).toContain('## 7. Design & Aesthetics');
        expect(mrd).toContain('## 8. Target Price');
        expect(mrd).toContain('## 9. Risks and Thoughts');
        expect(mrd).toContain('## 10. Competition to review');
        expect(mrd).toContain('## 11. Additional Considerations (Summary)');
        expect(mrd).toContain('## 12. Success Criteria');
      });

      it('should include requirements subsections', async () => {
        const mrd = await generateMRD(basicInput);

        expect(mrd).toContain('### 6.1 Functional Requirements');
        expect(mrd).toContain('### 6.2 Technical Requirements');
        expect(mrd).toContain('### 6.3 Compliance Requirements');
      });

      it('should include horizontal rules between sections', async () => {
        const mrd = await generateMRD(basicInput);

        // Count horizontal rules (should have multiple)
        const hrCount = (mrd.match(/---/g) || []).length;
        expect(hrCount).toBeGreaterThanOrEqual(12);
      });

      it('should include template disclaimer', async () => {
        const mrd = await generateMRD(basicInput);

        expect(mrd).toContain('This document was generated using a template');
        expect(mrd).toContain('GOOGLE_API_KEY');
      });
    });

    describe('AI generation (when Gemini is available)', () => {
      beforeEach(() => {
        mockIsGeminiAvailable.mockReturnValue(true);
      });

      it('should use Gemini for generation when available', async () => {
        const aiGeneratedMRD = '# AI Generated MRD\n\nThis is an AI-generated document.';
        mockGenerateText.mockResolvedValueOnce(aiGeneratedMRD);

        const mrd = await generateMRD(basicInput);

        expect(mockGenerateText).toHaveBeenCalledTimes(1);
        expect(mrd).toBe(aiGeneratedMRD);
      });

      it('should pass correct prompt structure to Gemini', async () => {
        mockGenerateText.mockResolvedValueOnce('Generated MRD');

        await generateMRD(basicInput);

        expect(mockGenerateText).toHaveBeenCalledWith(
          expect.stringContaining('**Product Concept:**'),
          expect.any(String),
          expect.objectContaining({
            maxTokens: 8192,
            temperature: 0.7,
          })
        );
      });

      it('should include research findings in AI prompt', async () => {
        mockGenerateText.mockResolvedValueOnce('Generated MRD');

        const input: MRDInput = {
          ...basicInput,
          researchFindings: [
            {
              title: 'Test Research',
              url: 'https://test.com',
              snippet: 'Test snippet',
            },
          ],
        };

        await generateMRD(input);

        expect(mockGenerateText).toHaveBeenCalledWith(
          expect.stringContaining('**Research Sources'),
          expect.any(String),
          expect.any(Object)
        );
        expect(mockGenerateText).toHaveBeenCalledWith(
          expect.stringContaining('Test Research'),
          expect.any(String),
          expect.any(Object)
        );
      });

      it('should fall back to template on AI error', async () => {
        mockGenerateText.mockRejectedValueOnce(new Error('API Error'));

        const mrd = await generateMRD(basicInput);

        expect(mrd).toContain('# Market Requirements Document (MRD)');
        expect(mrd).toContain('This document was generated using a template');
      });
    });
  });
});
