import { jest } from '@jest/globals';

const mockGenerateText = jest.fn();
const fakeProvider = {
  name: 'fake',
  capabilities: { textGeneration: true },
  generateText: mockGenerateText,
};
const fakeContext = {
  requestId: 'test',
  config: {},
  log: jest.fn(),
  getProvider: () => fakeProvider,
  getFallbackChain: () => [fakeProvider],
} as any;

import { PRDGeneratorAgent } from '@/agent/agents/prd/prd-generator-agent';

const baseOnePager = {
  productName: 'Widget Enclosure',
  preparedBy: 'Ori Shavit',
  description: 'An outdoor enclosure',
  goal: 'Protect the device',
  useCases: 'EV charging',
  context: { environments: ['Outdoor'], industries: ['Logistics'] },
  audience: { predefined: ['Drivers'], custom: [] },
  features: { mustHave: ['House terminal', 'Lockable body'], niceToHave: ['Masonry screw pattern'] },
  commercials: { moq: '200', targetPrice: 'N/A' },
  numberOfSamples: '3',
  skippedSections: { commercials: false, competitors: true },
};

describe('PRDGeneratorAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateText.mockResolvedValue({ text: 'Generated section content.' });
  });

  it('generates all sections and marks enabled based on skippedSections defaults', async () => {
    const agent = new PRDGeneratorAgent();
    const result = await agent.execute({ onePagerContentJson: baseOnePager }, fakeContext);
    expect(result.success).toBe(true);
    const sections = result.data!;
    expect(sections).toHaveLength(11);
    const commercial = sections.find((s) => s.key === 'commercial_parameters');
    expect(commercial?.enabled).toBe(true); // skippedSections.commercials is false
  });

  it('derives the requirements table from mustHave/niceToHave with correct priorities', async () => {
    mockGenerateText.mockImplementation(async (userPrompt: string) => {
      if (userPrompt.includes('mustHaveFeatures')) {
        return {
          text: JSON.stringify([
            { id: 'FR-1', category: 'Device & Electrical', requirement: 'House terminal', priority: 'Must' },
            { id: 'FR-2', category: 'Mounting & Orientation', requirement: 'Masonry screw pattern', priority: 'Nice to have' },
          ]),
        };
      }
      return { text: 'Generated text section.' };
    });
    const agent = new PRDGeneratorAgent();
    const result = await agent.execute({ onePagerContentJson: baseOnePager }, fakeContext);
    const requirementsSection = result.data!.find((s) => s.key === 'requirements');
    expect(Array.isArray(requirementsSection?.content)).toBe(true);
    const rows = requirementsSection!.content as { id: string; priority: string }[];
    expect(rows[0]).toEqual(expect.objectContaining({ id: 'FR-1', priority: 'Must' }));
    expect(rows[1]).toEqual(expect.objectContaining({ id: 'FR-2', priority: 'Nice to have' }));
  });

  it('applies sectionOverrides on top of One-Pager skip defaults', async () => {
    const agent = new PRDGeneratorAgent();
    const result = await agent.execute(
      { onePagerContentJson: baseOnePager, sectionOverrides: { commercial_parameters: false } },
      fakeContext
    );
    const commercial = result.data!.find((s) => s.key === 'commercial_parameters');
    expect(commercial?.enabled).toBe(false);
  });

  it('fails validation when onePagerContentJson is missing', async () => {
    const agent = new PRDGeneratorAgent();
    const result = await agent.execute({ onePagerContentJson: undefined as any }, fakeContext);
    expect(result.success).toBe(false);
  });
});
