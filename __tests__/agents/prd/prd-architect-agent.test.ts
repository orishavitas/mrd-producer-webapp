import { PRDArchitectAgent } from '@/agent/agents/prd/prd-architect-agent';
import { OnePagerSummary, PRDSkeleton } from '@/agent/agents/prd/types';

const mockSummary: OnePagerSummary = {
  productName: 'EMV Bracket',
  description: 'A bracket for mounting payment terminals',
  goal: 'Provide secure ergonomic terminal placement',
  useCases: 'Retail checkout',
  environments: ['Retail'],
  industries: ['Hospitality'],
  audience: ['IT Manager'],
  mustHaveFeatures: ['VESA mount', 'Cable management'],
  niceToHaveFeatures: ['Quick release'],
  moq: '500',
  targetPrice: '$15',
  competitors: [],
  customization: { paint: 'gloss / RAL 9005', logoColors: [] },
};

describe('PRDArchitectAgent', () => {
  const agent = new PRDArchitectAgent();

  it('has correct id', () => {
    expect(agent.id).toBe('prd-architect-agent');
  });

  it('validates that summary is required', () => {
    const result = agent.validateInput!({ summary: null as any });
    expect(result.valid).toBe(false);
  });

  it('validates successfully with valid OnePagerSummary', () => {
    const result = agent.validateInput!({ summary: mockSummary });
    expect(result.valid).toBe(true);
  });

  it('generates skeleton via execute() with mocked provider', async () => {
    const mockProvider = {
      generateText: jest.fn().mockResolvedValue({
        text: JSON.stringify([
          {
            sectionKey: 'overview',
            sectionTitle: '1. Overview',
            strategy: 'Summarise the product',
            writingDirective: 'Write 2 paragraphs',
          },
        ]),
      }),
      name: 'mock-provider',
      capabilities: { textGeneration: true },
    };
    const context = {
      requestId: 'test-req',
      traceId: 'test-trace',
      log: jest.fn(),
      getProvider: () => mockProvider as any,
      getFallbackChain: () => [],
      state: new Map(),
      emit: jest.fn(),
      config: { timeoutMs: 30000, enableFallback: false, maxRetries: 0 },
    };
    const result = await agent.execute({ summary: mockSummary }, context as any);
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('falls back to YAML-derived skeleton when AI returns invalid JSON', async () => {
    const mockProvider = {
      generateText: jest.fn().mockResolvedValue({ text: 'not valid json {{' }),
      name: 'mock-provider',
      capabilities: { textGeneration: true },
    };
    const context = {
      requestId: 'test-req',
      traceId: 'test-trace',
      log: jest.fn(),
      getProvider: () => mockProvider as any,
      getFallbackChain: () => [],
      state: new Map(),
      emit: jest.fn(),
      config: { timeoutMs: 30000, enableFallback: false, maxRetries: 0 },
    };
    const result = await agent.execute({ summary: mockSummary }, context as any);
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect((result.data as any[]).length).toBe(8);
  });
});
