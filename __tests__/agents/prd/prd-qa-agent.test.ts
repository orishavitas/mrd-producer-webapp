import { PRDQAAgent } from '@/agent/agents/prd/prd-qa-agent';
import { PRDFrame, QAReport } from '@/agent/agents/prd/types';

const mockFrames: PRDFrame[] = [
  { sectionKey: 'overview', sectionOrder: 1, content: 'The EMV Bracket mounts payment terminals.' },
  { sectionKey: 'goals', sectionOrder: 2, content: 'Secure ergonomic placement.' },
];

describe('PRDQAAgent', () => {
  const agent = new PRDQAAgent();

  it('has correct id', () => {
    expect(agent.id).toBe('prd-qa-agent');
  });

  it('validates that frames array is required and non-empty', () => {
    expect(agent.validateInput!({ frames: null as any, productName: 'X' }).valid).toBe(false);
    expect(agent.validateInput!({ frames: [], productName: 'X' }).valid).toBe(false);
  });

  it('validates successfully', () => {
    expect(agent.validateInput!({ frames: mockFrames, productName: 'EMV Bracket' }).valid).toBe(true);
  });

  it('returns QAReport with score clamped 0-100 via mocked provider', async () => {
    const mockProvider = {
      generateText: jest.fn().mockResolvedValue({
        text: JSON.stringify({ score: 85, suggestions: [{ sectionKey: 'overview', note: 'Good' }] }),
      }),
      capabilities: { textGeneration: true },
    };
    const context = {
      log: jest.fn(),
      getProvider: () => mockProvider as any,
      getFallbackChain: () => [],
      config: { timeoutMs: 30000, enableFallback: false, maxRetries: 0 },
      state: new Map(),
      emit: jest.fn(),
      requestId: 'test-req',
      traceId: 'test-trace',
    };
    const result = await agent.execute({ frames: mockFrames, productName: 'EMV Bracket' }, context as any);
    if (!result.success) {
      console.log('Error:', result.error);
    }
    expect(result.success).toBe(true);
    const report = result.data as QAReport;
    expect(report.score).toBe(85);
    expect(report.suggestions).toHaveLength(1);
  });

  it('returns fallback QAReport when AI returns invalid JSON', async () => {
    const mockProvider = {
      generateText: jest.fn().mockResolvedValue({ text: 'not json' }),
      capabilities: { textGeneration: true },
    };
    const context = {
      log: jest.fn(),
      getProvider: () => mockProvider as any,
      getFallbackChain: () => [],
      config: { timeoutMs: 30000, enableFallback: false, maxRetries: 0 },
      state: new Map(),
      emit: jest.fn(),
      requestId: 'test-req',
      traceId: 'test-trace',
    };
    const result = await agent.execute({ frames: mockFrames, productName: 'EMV Bracket' }, context as any);
    expect(result.success).toBe(true);
    const report = result.data as QAReport;
    expect(report.score).toBe(0);
    expect(report.suggestions[0].sectionKey).toBe('general');
  });

  it('clamps score above 100 to 100', async () => {
    const mockProvider = {
      generateText: jest.fn().mockResolvedValue({
        text: JSON.stringify({ score: 150, suggestions: [] }),
      }),
      capabilities: { textGeneration: true },
    };
    const context = {
      log: jest.fn(),
      getProvider: () => mockProvider as any,
      getFallbackChain: () => [],
      config: { timeoutMs: 30000, enableFallback: false, maxRetries: 0 },
      state: new Map(),
      emit: jest.fn(),
      requestId: 'test-req',
      traceId: 'test-trace',
    };
    const result = await agent.execute({ frames: mockFrames, productName: 'EMV Bracket' }, context as any);
    expect(result.success).toBe(true);
    expect((result.data as QAReport).score).toBe(100);
  });
});
