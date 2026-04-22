import { PRDWriterAgent } from '@/agent/agents/prd/prd-writer-agent';
import { OnePagerSummary, PRDSkeleton, PRDFrame } from '@/agent/agents/prd/types';

const mockSummary: OnePagerSummary = {
  productName: 'EMV Bracket',
  description: 'A mounting bracket for secure device placement',
  goal: 'Enable secure placement in retail environments',
  useCases: 'Retail point-of-sale security',
  environments: ['Retail', 'Hospitality'],
  industries: ['Retail', 'Hospitality'],
  audience: ['IT Manager', 'Security Officer'],
  mustHaveFeatures: ['VESA mount', 'Anti-theft mechanism'],
  niceToHaveFeatures: ['Cable management'],
  moq: '500',
  targetPrice: '$15',
  competitors: [
    {
      brand: 'CompetitorA',
      productName: 'Bracket X',
      description: 'Basic bracket',
      cost: '$10',
    },
  ],
  customization: {
    paint: 'Black',
    logoColors: ['#009966'],
  },
};

const mockSkeleton: PRDSkeleton = [
  {
    sectionKey: 'overview',
    sectionTitle: '1. Overview',
    strategy: 'Summarise product',
    writingDirective: 'Write 2-3 paragraphs describing the product overview',
  },
  {
    sectionKey: 'goals',
    sectionTitle: '2. Goals',
    strategy: 'List measurable goals',
    writingDirective: 'Write 4-7 concrete, measurable goals',
  },
];

describe('PRDWriterAgent', () => {
  const agent = new PRDWriterAgent();

  it('has correct id', () => {
    expect(agent.id).toBe('prd-writer-agent');
  });

  it('has correct metadata', () => {
    expect(agent.name).toBe('PRD Writer Agent');
    expect(agent.description).toContain('Writes');
  });

  it('validates that both summary and skeleton are required', () => {
    const resultNoSummary = agent.validateInput!({
      summary: null as any,
      skeleton: mockSkeleton,
    });
    expect(resultNoSummary.valid).toBe(false);
    expect(resultNoSummary.errors).toBeDefined();

    const resultNoSkeleton = agent.validateInput!({
      summary: mockSummary,
      skeleton: null as any,
    });
    expect(resultNoSkeleton.valid).toBe(false);
    expect(resultNoSkeleton.errors).toBeDefined();
  });

  it('validates successfully with valid input', () => {
    const result = agent.validateInput!({
      summary: mockSummary,
      skeleton: mockSkeleton,
    });
    expect(result.valid).toBe(true);
  });

  it('builds user prompt correctly for a section', () => {
    const prompt = PRDWriterAgent.buildUserPrompt('overview', mockSummary);
    expect(prompt).toContain('EMV Bracket');
    expect(prompt).toContain('mounting bracket');
  });

  it('replaces all template variables in user prompt', () => {
    const prompt = PRDWriterAgent.buildUserPrompt('requirements', mockSummary);
    expect(prompt).toContain('EMV Bracket');
    expect(prompt).toContain('VESA mount');
    expect(prompt).toContain('Cable management');
    expect(prompt).toContain('500');
    expect(prompt).toContain('$15');
  });

  it('writes sections in parallel with mocked provider', async () => {
    const mockProvider = {
      generateText: jest.fn().mockResolvedValue({ text: 'Section content here.' }),
      name: 'mock-provider',
      capabilities: { textGeneration: true },
    };
    const context = {
      log: jest.fn(),
      getProvider: () => mockProvider as any,
      getFallbackChain: () => [],
      config: {
        timeoutMs: 30000,
        enableFallback: false,
        maxRetries: 0,
      },
    };

    const result = await agent.execute(
      { summary: mockSummary, skeleton: mockSkeleton },
      context as any
    );

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect((result.data as PRDFrame[]).length).toBe(2);
    expect((result.data as PRDFrame[])[0].sectionKey).toBe('overview');
    expect((result.data as PRDFrame[])[0].content).toBe('Section content here.');
    expect((result.data as PRDFrame[])[0].sectionOrder).toBe(1);
  });

  it('calls onSectionDone callback for each completed frame', async () => {
    const mockProvider = {
      generateText: jest.fn().mockResolvedValue({ text: 'Content for section.' }),
      name: 'mock-provider',
      capabilities: { textGeneration: true },
    };
    const context = {
      log: jest.fn(),
      getProvider: () => mockProvider as any,
      getFallbackChain: () => [],
      config: {
        timeoutMs: 30000,
        enableFallback: false,
        maxRetries: 0,
      },
    };
    const onSectionDone = jest.fn();

    await agent.execute(
      { summary: mockSummary, skeleton: mockSkeleton, onSectionDone },
      context as any
    );

    expect(onSectionDone).toHaveBeenCalledTimes(2);
    expect(onSectionDone).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        sectionKey: 'overview',
        sectionOrder: 1,
        content: 'Content for section.',
      })
    );
    expect(onSectionDone).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        sectionKey: 'goals',
        sectionOrder: 2,
      })
    );
  });

  it('preserves section order in results', async () => {
    const mockProvider = {
      generateText: jest
        .fn()
        .mockResolvedValueOnce({ text: 'First.' })
        .mockResolvedValueOnce({ text: 'Second.' }),
      name: 'mock-provider',
      capabilities: { textGeneration: true },
    };
    const context = {
      log: jest.fn(),
      getProvider: () => mockProvider as any,
      getFallbackChain: () => [],
      config: {
        timeoutMs: 30000,
        enableFallback: false,
        maxRetries: 0,
      },
    };

    const result = await agent.execute(
      { summary: mockSummary, skeleton: mockSkeleton },
      context as any
    );

    const frames = result.data as PRDFrame[];
    expect(frames[0].sectionOrder).toBe(1);
    expect(frames[1].sectionOrder).toBe(2);
  });

  it('trims whitespace from provider response', async () => {
    const mockProvider = {
      generateText: jest
        .fn()
        .mockResolvedValue({ text: '  \n  Section with whitespace  \n  ' }),
      name: 'mock-provider',
      capabilities: { textGeneration: true },
    };
    const context = {
      log: jest.fn(),
      getProvider: () => mockProvider as any,
      getFallbackChain: () => [],
      config: {
        timeoutMs: 30000,
        enableFallback: false,
        maxRetries: 0,
      },
    };

    const result = await agent.execute(
      { summary: mockSummary, skeleton: mockSkeleton },
      context as any
    );

    const frames = result.data as PRDFrame[];
    expect(frames[0].content).toBe('Section with whitespace');
    expect(frames[0].content).not.toMatch(/^\s+/);
    expect(frames[0].content).not.toMatch(/\s+$/);
  });
});
