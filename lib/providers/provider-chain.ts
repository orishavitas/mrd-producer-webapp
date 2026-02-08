/**
 * Provider Chain & Registry
 *
 * Manages multiple AI providers with fallback support.
 * Provides a unified interface for accessing providers by priority.
 */

import {
  AIProvider,
  ProviderEntry,
  ProviderChainConfig,
  GenerationOptions,
  GenerationResponse,
} from './types';
import { GeminiProvider } from './gemini-provider';
import { AnthropicProvider } from './anthropic-provider';
import { OpenAIProvider } from './openai-provider';

/**
 * Default provider chain configuration.
 */
const DEFAULT_CONFIG: ProviderChainConfig = {
  priority: ['gemini', 'claude', 'openai'],
  maxAttempts: 3,
  retryDelayMs: 1000,
};

/**
 * Provider registry and fallback chain.
 */
export class ProviderChain {
  private providers: Map<string, ProviderEntry> = new Map();
  private config: ProviderChainConfig;

  constructor(config: Partial<ProviderChainConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a provider.
   *
   * @param provider - Provider instance
   * @param priority - Priority (lower = higher priority, default based on registration order)
   * @param enabled - Whether the provider is enabled
   */
  register(provider: AIProvider, priority?: number, enabled = true): void {
    const actualPriority =
      priority ?? this.config.priority.indexOf(provider.name);
    const finalPriority = actualPriority >= 0 ? actualPriority : this.providers.size;

    this.providers.set(provider.name, {
      provider,
      priority: finalPriority,
      enabled,
    });

    console.log(
      `[ProviderChain] Registered provider: ${provider.name} (priority: ${finalPriority}, enabled: ${enabled})`
    );
  }

  /**
   * Get a specific provider by name.
   */
  get(name: string): AIProvider | undefined {
    const entry = this.providers.get(name);
    return entry?.enabled ? entry.provider : undefined;
  }

  /**
   * Get the highest priority available provider.
   */
  getDefault(): AIProvider | undefined {
    return this.getAvailableProviders()[0];
  }

  /**
   * Get all available providers sorted by priority.
   */
  getAvailableProviders(): AIProvider[] {
    return Array.from(this.providers.values())
      .filter((entry) => entry.enabled && entry.provider.isAvailable())
      .sort((a, b) => a.priority - b.priority)
      .map((entry) => entry.provider);
  }

  /**
   * Get the fallback chain (all available providers in priority order).
   */
  getFallbackChain(): AIProvider[] {
    return this.getAvailableProviders();
  }

  /**
   * Check if any provider is available.
   */
  hasAvailableProvider(): boolean {
    return this.getAvailableProviders().length > 0;
  }

  /**
   * Execute an operation with automatic fallback.
   *
   * @param operation - Function that takes a provider and returns a result
   * @returns Result from the first successful provider
   */
  async executeWithFallback<T>(
    operation: (provider: AIProvider) => Promise<T>
  ): Promise<{ result: T; providerUsed: string }> {
    const providers = this.getAvailableProviders();
    const maxAttempts = Math.min(
      this.config.maxAttempts || providers.length,
      providers.length
    );

    const errors: Array<{ provider: string; error: Error }> = [];

    for (let i = 0; i < maxAttempts; i++) {
      const provider = providers[i];

      try {
        const result = await operation(provider);
        return { result, providerUsed: provider.name };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push({ provider: provider.name, error: err });

        console.warn(
          `[ProviderChain] Provider ${provider.name} failed: ${err.message}`
        );

        // Notify fallback callback
        if (i < maxAttempts - 1 && this.config.onFallback) {
          this.config.onFallback(provider.name, providers[i + 1]?.name || 'none', err);
        }

        // Delay before retry
        if (i < maxAttempts - 1 && this.config.retryDelayMs) {
          await this.delay(this.config.retryDelayMs);
        }
      }
    }

    throw new Error(
      `All providers failed:\n${errors
        .map((e) => `  ${e.provider}: ${e.error.message}`)
        .join('\n')}`
    );
  }

  /**
   * Generate text with automatic fallback.
   */
  async generateText(
    prompt: string,
    systemPrompt?: string,
    options?: GenerationOptions
  ): Promise<GenerationResponse & { providerUsed: string }> {
    const { result, providerUsed } = await this.executeWithFallback((provider) =>
      provider.generateText(prompt, systemPrompt, options)
    );
    return { ...result, providerUsed };
  }

  /**
   * Generate text with search grounding and automatic fallback.
   * Falls back to regular text generation if search grounding is not supported.
   */
  async generateWithSearch(
    prompt: string,
    systemPrompt?: string,
    options?: GenerationOptions
  ): Promise<GenerationResponse & { providerUsed: string }> {
    const { result, providerUsed } = await this.executeWithFallback(
      async (provider) => {
        if (provider.capabilities.searchGrounding && provider.generateWithSearch) {
          return provider.generateWithSearch(prompt, systemPrompt, options);
        }
        // Fall back to regular text generation
        console.log(
          `[ProviderChain] Provider ${provider.name} does not support search grounding, using text generation`
        );
        return provider.generateText(prompt, systemPrompt, options);
      }
    );
    return { ...result, providerUsed };
  }

  /**
   * Enable or disable a provider.
   */
  setEnabled(name: string, enabled: boolean): void {
    const entry = this.providers.get(name);
    if (entry) {
      entry.enabled = enabled;
      console.log(`[ProviderChain] Provider ${name} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Update provider priority.
   */
  setPriority(name: string, priority: number): void {
    const entry = this.providers.get(name);
    if (entry) {
      entry.priority = priority;
      console.log(`[ProviderChain] Provider ${name} priority set to ${priority}`);
    }
  }

  /**
   * Get provider statistics.
   */
  getStats(): {
    total: number;
    available: number;
    providers: Array<{
      name: string;
      available: boolean;
      enabled: boolean;
      priority: number;
      capabilities: string[];
    }>;
  } {
    const entries = Array.from(this.providers.values());
    return {
      total: entries.length,
      available: this.getAvailableProviders().length,
      providers: entries
        .sort((a, b) => a.priority - b.priority)
        .map((entry) => ({
          name: entry.provider.name,
          available: entry.provider.isAvailable(),
          enabled: entry.enabled,
          priority: entry.priority,
          capabilities: Object.entries(entry.provider.capabilities)
            .filter(([, v]) => v)
            .map(([k]) => k),
        })),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Global provider chain instance.
 */
let globalChain: ProviderChain | null = null;

/**
 * Get the global provider chain, initializing with default providers if needed.
 */
export function getProviderChain(): ProviderChain {
  if (!globalChain) {
    globalChain = createDefaultProviderChain();
  }
  return globalChain;
}

/**
 * Create a provider chain with default providers registered.
 */
export function createDefaultProviderChain(
  config?: Partial<ProviderChainConfig>
): ProviderChain {
  const chain = new ProviderChain(config);

  // Register providers in priority order
  // Priority 0: Gemini (primary - has search grounding)
  chain.register(new GeminiProvider(), 0);

  // Priority 1: Claude (fallback)
  chain.register(new AnthropicProvider(), 1);

  // Priority 2: OpenAI (fallback)
  chain.register(new OpenAIProvider(), 2);

  return chain;
}

/**
 * Reset the global provider chain (useful for testing).
 */
export function resetProviderChain(): void {
  globalChain = null;
}
