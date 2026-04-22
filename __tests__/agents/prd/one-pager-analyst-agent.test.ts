import { OnePagerAnalystAgent } from '@/agent/agents/prd/one-pager-analyst-agent';
import { OnePagerSummary } from '@/agent/agents/prd/types';

const mockContext = {
  log: jest.fn(),
  getProvider: jest.fn(),
  getFallbackChain: () => [],
  config: { timeoutMs: 30000, enableFallback: false, maxRetries: 0 },
};

describe('OnePagerAnalystAgent', () => {
  const agent = new OnePagerAnalystAgent();

  it('has correct id', () => {
    expect(agent.id).toBe('one-pager-analyst-agent');
  });

  it('validates that contentJson is required', () => {
    const result = agent.validateInput!({ contentJson: null as any });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('contentJson is required');
  });

  it('validates successfully with valid input', () => {
    const result = agent.validateInput!({
      contentJson: { productName: 'Test', description: 'A product' },
    });
    expect(result.valid).toBe(true);
  });

  it('normalises content_json into OnePagerSummary shape', () => {
    const summary = OnePagerAnalystAgent.normalise({
      productName: 'EMV Bracket',
      description: 'A bracket',
      expandedDescription: 'An expanded bracket',
      goal: 'Mount terminals',
      expandedGoal: '',
      useCases: 'Retail checkout',
      expandedUseCases: '',
      context: { environments: ['Retail'], industries: ['Hospitality'] },
      audience: { predefined: ['IT Manager'], custom: ['Buyer'] },
      features: { mustHave: ['VESA mount'], niceToHave: ['Quick release'] },
      commercials: { moq: '500', targetPrice: '$15' },
      competitors: [{ brand: 'Acme', productName: 'Bracket X', description: 'Old bracket', cost: '$20', status: 'done', photoUrls: [] }],
      customization: { paint: { finish: 'gloss', color: 'RAL 9005', description: '' }, logoColors: [] },
    });

    expect(summary.productName).toBe('EMV Bracket');
    expect(summary.mustHaveFeatures).toEqual(['VESA mount']);
    expect(summary.niceToHaveFeatures).toEqual(['Quick release']);
    expect(summary.environments).toEqual(['Retail']);
    expect(summary.competitors[0].brand).toBe('Acme');
    expect(summary.customization.paint).toBe('gloss / RAL 9005');
  });

  it('maps logoColors correctly', () => {
    const summary = OnePagerAnalystAgent.normalise({
      customization: {
        paint: {},
        logoColors: [{ mode: 'HEX', value: '#FF0000' }],
      },
    });
    expect(summary.customization.logoColors).toEqual(['HEX #FF0000']);
  });

  it('executes successfully via agent.execute()', async () => {
    const context = {
      log: jest.fn(),
      getProvider: jest.fn(() => ({ name: 'test-provider' })),
      getFallbackChain: () => [],
      config: { timeoutMs: 30000, enableFallback: false, maxRetries: 0 },
    };
    const result = await agent.execute({ contentJson: { productName: 'Test Product' } }, context as any);
    expect(result.success).toBe(true);
    expect((result.data as any).productName).toBe('Test Product');
  });
});
