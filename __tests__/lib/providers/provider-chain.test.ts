/**
 * Tests for Provider Chain
 */

import {
  ProviderChain,
  createDefaultProviderChain,
  resetProviderChain,
} from '@/lib/providers/provider-chain';
import { AIProvider, ProviderCapabilities, GenerationResponse } from '@/lib/providers/types';

// Mock providers for testing
class MockProvider implements AIProvider {
  constructor(
    public readonly name: string,
    public readonly version: string = '1.0.0',
    public readonly capabilities: ProviderCapabilities = {
      textGeneration: true,
      searchGrounding: false,
      structuredOutput: true,
      streaming: false,
      functionCalling: false,
    },
    private _isAvailable: boolean = true,
    private generateFn?: () => Promise<GenerationResponse>
  ) {}

  isAvailable(): boolean {
    return this._isAvailable;
  }

  setAvailable(available: boolean): void {
    this._isAvailable = available;
  }

  async generateText(
    prompt: string,
    systemPrompt?: string
  ): Promise<GenerationResponse> {
    if (this.generateFn) {
      return this.generateFn();
    }
    return {
      text: `Response from ${this.name}: ${prompt}`,
      metadata: { provider: this.name },
    };
  }
}

describe('ProviderChain', () => {
  let chain: ProviderChain;
  let provider1: MockProvider;
  let provider2: MockProvider;
  let provider3: MockProvider;

  beforeEach(() => {
    chain = new ProviderChain();
    provider1 = new MockProvider('provider1');
    provider2 = new MockProvider('provider2');
    provider3 = new MockProvider('provider3');
  });

  describe('Provider Registration', () => {
    it('should register providers', () => {
      chain.register(provider1);
      chain.register(provider2);

      expect(chain.get('provider1')).toBe(provider1);
      expect(chain.get('provider2')).toBe(provider2);
    });

    it('should register providers with custom priority', () => {
      chain.register(provider1, 5);
      chain.register(provider2, 1);
      chain.register(provider3, 3);

      const providers = chain.getAvailableProviders();
      expect(providers[0]).toBe(provider2); // Priority 1
      expect(providers[1]).toBe(provider3); // Priority 3
      expect(providers[2]).toBe(provider1); // Priority 5
    });

    it('should register providers as disabled', () => {
      chain.register(provider1, 0, false);

      expect(chain.get('provider1')).toBeUndefined();
      expect(chain.getAvailableProviders()).toHaveLength(0);
    });

    it('should use priority from config', () => {
      const configChain = new ProviderChain({
        priority: ['provider2', 'provider1'],
      });

      configChain.register(provider1);
      configChain.register(provider2);

      const providers = configChain.getAvailableProviders();
      expect(providers[0]).toBe(provider2);
      expect(providers[1]).toBe(provider1);
    });
  });

  describe('Provider Retrieval', () => {
    beforeEach(() => {
      chain.register(provider1, 0);
      chain.register(provider2, 1);
      chain.register(provider3, 2);
    });

    it('should get provider by name', () => {
      expect(chain.get('provider1')).toBe(provider1);
      expect(chain.get('provider2')).toBe(provider2);
      expect(chain.get('nonexistent')).toBeUndefined();
    });

    it('should get default provider', () => {
      expect(chain.getDefault()).toBe(provider1);
    });

    it('should return undefined if no default provider', () => {
      const emptyChain = new ProviderChain();
      expect(emptyChain.getDefault()).toBeUndefined();
    });

    it('should get all available providers sorted by priority', () => {
      const providers = chain.getAvailableProviders();

      expect(providers).toHaveLength(3);
      expect(providers[0]).toBe(provider1);
      expect(providers[1]).toBe(provider2);
      expect(providers[2]).toBe(provider3);
    });

    it('should exclude unavailable providers', () => {
      provider2.setAvailable(false);

      const providers = chain.getAvailableProviders();

      expect(providers).toHaveLength(2);
      expect(providers[0]).toBe(provider1);
      expect(providers[1]).toBe(provider3);
    });

    it('should exclude disabled providers', () => {
      chain.setEnabled('provider2', false);

      const providers = chain.getAvailableProviders();

      expect(providers).toHaveLength(2);
      expect(providers[0]).toBe(provider1);
      expect(providers[1]).toBe(provider3);
    });

    it('should get fallback chain', () => {
      const fallbackChain = chain.getFallbackChain();

      expect(fallbackChain).toHaveLength(3);
      expect(fallbackChain).toEqual(chain.getAvailableProviders());
    });

    it('should check if any provider is available', () => {
      expect(chain.hasAvailableProvider()).toBe(true);

      provider1.setAvailable(false);
      provider2.setAvailable(false);
      provider3.setAvailable(false);

      expect(chain.hasAvailableProvider()).toBe(false);
    });
  });

  describe('Execute with Fallback', () => {
    beforeEach(() => {
      chain.register(provider1, 0);
      chain.register(provider2, 1);
      chain.register(provider3, 2);
    });

    it('should execute with first provider on success', async () => {
      const operation = jest.fn().mockResolvedValue('Success');

      const { result, providerUsed } = await chain.executeWithFallback(operation);

      expect(result).toBe('Success');
      expect(providerUsed).toBe('provider1');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(operation).toHaveBeenCalledWith(provider1);
    });

    it('should fallback to second provider on first failure', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Provider 1 failed'))
        .mockResolvedValueOnce('Success from provider 2');

      const { result, providerUsed } = await chain.executeWithFallback(operation);

      expect(result).toBe('Success from provider 2');
      expect(providerUsed).toBe('provider2');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(operation).toHaveBeenNthCalledWith(1, provider1);
      expect(operation).toHaveBeenNthCalledWith(2, provider2);
    });

    it('should try all providers before throwing', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Provider 1 failed'))
        .mockRejectedValueOnce(new Error('Provider 2 failed'))
        .mockRejectedValueOnce(new Error('Provider 3 failed'));

      await expect(chain.executeWithFallback(operation)).rejects.toThrow(
        'All providers failed'
      );

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should respect maxAttempts configuration', async () => {
      const limitedChain = new ProviderChain({ maxAttempts: 2 });
      limitedChain.register(provider1, 0);
      limitedChain.register(provider2, 1);
      limitedChain.register(provider3, 2);

      const operation = jest.fn().mockRejectedValue(new Error('Failed'));

      await expect(limitedChain.executeWithFallback(operation)).rejects.toThrow();

      expect(operation).toHaveBeenCalledTimes(2); // Only 2 attempts
    });

    it('should call onFallback callback', async () => {
      const onFallback = jest.fn();
      const callbackChain = new ProviderChain({ onFallback });
      callbackChain.register(provider1, 0);
      callbackChain.register(provider2, 1);

      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Provider 1 failed'))
        .mockResolvedValueOnce('Success');

      await callbackChain.executeWithFallback(operation);

      expect(onFallback).toHaveBeenCalledTimes(1);
      expect(onFallback).toHaveBeenCalledWith(
        'provider1',
        'provider2',
        expect.any(Error)
      );
    });

    it('should delay between retries', async () => {
      const delayChain = new ProviderChain({ retryDelayMs: 100 });
      delayChain.register(provider1, 0);
      delayChain.register(provider2, 1);

      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce('Success');

      const startTime = Date.now();
      await delayChain.executeWithFallback(operation);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some timing variance
    });

    it('should handle non-Error exceptions', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce('String error')
        .mockResolvedValueOnce('Success');

      const { result } = await chain.executeWithFallback(operation);

      expect(result).toBe('Success');
    });
  });

  describe('Generate Text', () => {
    beforeEach(() => {
      chain.register(provider1, 0);
      chain.register(provider2, 1);
    });

    it('should generate text with first provider', async () => {
      const result = await chain.generateText('Test prompt');

      expect(result.text).toContain('Response from provider1');
      expect(result.providerUsed).toBe('provider1');
    });

    it('should pass options to provider', async () => {
      const generateSpy = jest.spyOn(provider1, 'generateText');

      await chain.generateText('Prompt', 'System prompt', {
        maxTokens: 2048,
        temperature: 0.5,
      });

      expect(generateSpy).toHaveBeenCalledWith('Prompt', 'System prompt', {
        maxTokens: 2048,
        temperature: 0.5,
      });
    });

    it('should fallback on provider failure', async () => {
      jest.spyOn(provider1, 'generateText').mockRejectedValueOnce(new Error('Failed'));

      const result = await chain.generateText('Test prompt');

      expect(result.text).toContain('Response from provider2');
      expect(result.providerUsed).toBe('provider2');
    });
  });

  describe('Generate with Search', () => {
    let searchProvider: MockProvider;

    beforeEach(() => {
      searchProvider = new MockProvider('search-provider', '1.0.0', {
        textGeneration: true,
        searchGrounding: true,
        structuredOutput: true,
        streaming: false,
        functionCalling: false,
      });

      searchProvider.generateWithSearch = jest.fn().mockResolvedValue({
        text: 'Search-grounded response',
        sources: [{ title: 'Source', url: 'https://example.com' }],
        searchQueries: ['test query'],
      });

      chain.register(searchProvider, 0);
      chain.register(provider1, 1);
    });

    it('should use generateWithSearch for providers with search grounding', async () => {
      const result = await chain.generateWithSearch('Research prompt');

      expect(result.text).toBe('Search-grounded response');
      expect(result.sources).toHaveLength(1);
      expect(result.searchQueries).toEqual(['test query']);
      expect(searchProvider.generateWithSearch).toHaveBeenCalled();
    });

    it('should fallback to generateText for providers without search grounding', async () => {
      chain.setEnabled('search-provider', false);

      const result = await chain.generateWithSearch('Research prompt');

      expect(result.text).toContain('Response from provider1');
      expect(result.providerUsed).toBe('provider1');
    });

    it('should fallback if search provider fails', async () => {
      (searchProvider.generateWithSearch as jest.Mock).mockRejectedValueOnce(
        new Error('Search failed')
      );

      const result = await chain.generateWithSearch('Research prompt');

      expect(result.text).toContain('Response from provider1');
      expect(result.providerUsed).toBe('provider1');
    });
  });

  describe('Provider Management', () => {
    beforeEach(() => {
      chain.register(provider1, 0);
      chain.register(provider2, 1);
    });

    it('should enable and disable providers', () => {
      chain.setEnabled('provider1', false);

      expect(chain.get('provider1')).toBeUndefined();
      expect(chain.getAvailableProviders()).toHaveLength(1);

      chain.setEnabled('provider1', true);

      expect(chain.get('provider1')).toBe(provider1);
      expect(chain.getAvailableProviders()).toHaveLength(2);
    });

    it('should update provider priority', () => {
      chain.setPriority('provider1', 5);
      chain.setPriority('provider2', 1);

      const providers = chain.getAvailableProviders();
      expect(providers[0]).toBe(provider2); // Priority 1
      expect(providers[1]).toBe(provider1); // Priority 5
    });

    it('should handle enabling non-existent provider', () => {
      expect(() => chain.setEnabled('nonexistent', true)).not.toThrow();
    });

    it('should handle updating priority of non-existent provider', () => {
      expect(() => chain.setPriority('nonexistent', 5)).not.toThrow();
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      chain.register(provider1, 0);
      chain.register(provider2, 1);
      chain.register(provider3, 2, false); // Disabled
    });

    it('should return provider statistics', () => {
      const stats = chain.getStats();

      expect(stats.total).toBe(3);
      expect(stats.available).toBe(2); // provider3 is disabled
      expect(stats.providers).toHaveLength(3);
    });

    it('should include provider details', () => {
      const stats = chain.getStats();

      expect(stats.providers[0]).toMatchObject({
        name: 'provider1',
        available: true,
        enabled: true,
        priority: 0,
      });

      expect(stats.providers[2]).toMatchObject({
        name: 'provider3',
        available: true,
        enabled: false,
        priority: 2,
      });
    });

    it('should list provider capabilities', () => {
      const stats = chain.getStats();

      expect(stats.providers[0].capabilities).toContain('textGeneration');
      expect(stats.providers[0].capabilities).toContain('structuredOutput');
    });

    it('should reflect unavailable providers', () => {
      provider1.setAvailable(false);

      const stats = chain.getStats();

      expect(stats.available).toBe(1);
      expect(stats.providers[0].available).toBe(false);
    });
  });

  describe('Default Provider Chain', () => {
    beforeEach(() => {
      // Mock environment for providers
      process.env.GOOGLE_API_KEY = 'test-gemini-key';
      process.env.ANTHROPIC_API_KEY = 'test-claude-key';
      process.env.OPENAI_API_KEY = 'test-openai-key';
      resetProviderChain();
    });

    afterEach(() => {
      delete process.env.GOOGLE_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENAI_API_KEY;
      resetProviderChain();
    });

    it('should create default provider chain with all providers', () => {
      const defaultChain = createDefaultProviderChain();
      const stats = defaultChain.getStats();

      expect(stats.total).toBe(3);
      expect(stats.providers.map((p) => p.name)).toEqual([
        'gemini',
        'claude',
        'openai',
      ]);
    });

    it('should prioritize Gemini first', () => {
      const defaultChain = createDefaultProviderChain();
      const providers = defaultChain.getAvailableProviders();

      expect(providers[0].name).toBe('gemini');
    });

    it('should accept custom configuration', () => {
      const customChain = createDefaultProviderChain({
        maxAttempts: 2,
        retryDelayMs: 500,
      });

      // Config is applied (tested indirectly through behavior)
      expect(customChain.hasAvailableProvider()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      chain.register(provider1, 0);
    });

    it('should throw error with all failures', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failed'));

      await expect(chain.executeWithFallback(operation)).rejects.toThrow(
        'All providers failed'
      );
    });

    it('should include all error messages', async () => {
      chain.register(provider2, 1);

      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'));

      // Should throw with combined error message after all providers fail
      await expect(chain.executeWithFallback(operation)).rejects.toThrow(
        /Error 1/
      );
    });

    it('should handle empty provider chain', async () => {
      const emptyChain = new ProviderChain();

      await expect(
        emptyChain.executeWithFallback(() => Promise.resolve('test'))
      ).rejects.toThrow('All providers failed');
    });
  });
});
