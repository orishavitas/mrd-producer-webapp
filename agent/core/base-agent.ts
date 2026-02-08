/**
 * Base Agent Implementation
 *
 * Abstract base class providing common functionality for all agents.
 * Extend this class to create specialized agents.
 */

import { AIProvider, ProviderCapabilities } from '@/lib/providers/types';
import {
  Agent,
  AgentResult,
  AgentMetadata,
  ExecutionContext,
  ValidationResult,
  DEFAULT_AGENT_CONFIG,
} from './types';

/**
 * Abstract base class for agents.
 * Provides common functionality like validation, error handling, and logging.
 */
export abstract class BaseAgent<TInput = unknown, TOutput = unknown>
  implements Agent<TInput, TOutput>
{
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly description: string;

  readonly inputSchema?: object;
  readonly outputSchema?: object;
  readonly requiredCapabilities?: (keyof ProviderCapabilities)[];

  /**
   * Execute the agent's core logic.
   * Subclasses must implement this method.
   */
  protected abstract executeCore(
    input: TInput,
    context: ExecutionContext
  ): Promise<TOutput>;

  /**
   * Execute the agent with error handling and metadata tracking.
   */
  async execute(
    input: TInput,
    context: ExecutionContext
  ): Promise<AgentResult<TOutput>> {
    const startTime = Date.now();
    const log = context.log;

    log('info', `[${this.id}] Starting execution`, { version: this.version });

    try {
      // Check for cancellation
      if (context.signal?.aborted) {
        return this.createFailureResult('Execution cancelled', startTime);
      }

      // Validate input
      if (this.validateInput) {
        const validation = this.validateInput(input);
        if (!validation.valid) {
          log('error', `[${this.id}] Input validation failed`, validation.errors);
          return this.createFailureResult(
            `Input validation failed: ${validation.errors?.join(', ')}`,
            startTime
          );
        }
      }

      // Check provider capabilities
      if (this.requiredCapabilities?.length) {
        const provider = context.getProvider();
        const missingCapabilities = this.requiredCapabilities.filter(
          (cap) => !provider.capabilities[cap]
        );
        if (missingCapabilities.length > 0) {
          log('warn', `[${this.id}] Provider missing capabilities`, {
            provider: provider.name,
            missing: missingCapabilities,
          });
          // Try to continue - fallback might be available
        }
      }

      // Execute with timeout if configured
      const config = { ...DEFAULT_AGENT_CONFIG, ...context.config };
      const result = await this.executeWithTimeout(
        () => this.executeCore(input, context),
        config.timeoutMs,
        context.signal
      );

      const executionTimeMs = Date.now() - startTime;
      log('info', `[${this.id}] Execution completed`, { executionTimeMs });

      return {
        success: true,
        data: result,
        metadata: this.createMetadata(context, executionTimeMs),
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      log('error', `[${this.id}] Execution failed`, { error: errorMessage });

      // Check if we should retry with fallback
      if (context.config.enableFallback) {
        const fallbackResult = await this.tryFallback(input, context, error);
        if (fallbackResult) {
          return fallbackResult;
        }
      }

      return this.createFailureResult(errorMessage, startTime, context);
    }
  }

  /**
   * Default input validation (always valid).
   * Override in subclasses for specific validation.
   */
  validateInput?(input: TInput): ValidationResult {
    return { valid: true };
  }

  /**
   * Default cleanup (no-op).
   * Override in subclasses if cleanup is needed.
   */
  async cleanup?(context: ExecutionContext): Promise<void> {
    // Default: no cleanup needed
  }

  /**
   * Execute with timeout.
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    signal?: AbortSignal
  ): Promise<T> {
    if (!timeoutMs || timeoutMs <= 0) {
      return operation();
    }

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      // Listen for abort signal
      const abortHandler = () => {
        clearTimeout(timeoutId);
        reject(new Error('Execution cancelled'));
      };
      signal?.addEventListener('abort', abortHandler);

      operation()
        .then((result) => {
          clearTimeout(timeoutId);
          signal?.removeEventListener('abort', abortHandler);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          signal?.removeEventListener('abort', abortHandler);
          reject(error);
        });
    });
  }

  /**
   * Attempt fallback execution with alternative providers.
   */
  private async tryFallback(
    input: TInput,
    context: ExecutionContext,
    originalError: unknown
  ): Promise<AgentResult<TOutput> | null> {
    const fallbackChain = context.getFallbackChain();
    const currentProvider = context.getProvider();

    // Filter to providers we haven't tried
    const remainingProviders = fallbackChain.filter(
      (p) => p.name !== currentProvider.name
    );

    if (remainingProviders.length === 0) {
      return null;
    }

    context.log('info', `[${this.id}] Attempting fallback`, {
      originalProvider: currentProvider.name,
      fallbackProviders: remainingProviders.map((p) => p.name),
    });

    for (const provider of remainingProviders) {
      try {
        // Create a new context with the fallback provider
        const fallbackContext = this.createFallbackContext(context, provider);
        const startTime = Date.now();

        const result = await this.executeCore(input, fallbackContext);
        const executionTimeMs = Date.now() - startTime;

        context.log('info', `[${this.id}] Fallback succeeded`, {
          provider: provider.name,
        });

        return {
          success: true,
          data: result,
          warnings: [
            `Fell back from ${currentProvider.name} to ${provider.name}: ${
              originalError instanceof Error
                ? originalError.message
                : 'Unknown error'
            }`,
          ],
          metadata: {
            executionTimeMs,
            providerUsed: provider.name,
            fallbackUsed: true,
          },
        };
      } catch (error) {
        context.log('warn', `[${this.id}] Fallback provider ${provider.name} failed`, {
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
    }

    return null;
  }

  /**
   * Create an execution context with a specific provider.
   */
  private createFallbackContext(
    original: ExecutionContext,
    provider: AIProvider
  ): ExecutionContext {
    return {
      ...original,
      getProvider: () => provider,
    };
  }

  /**
   * Create execution metadata.
   */
  private createMetadata(
    context: ExecutionContext,
    executionTimeMs: number
  ): AgentMetadata {
    return {
      executionTimeMs,
      providerUsed: context.getProvider().name,
    };
  }

  /**
   * Create a failure result.
   */
  private createFailureResult(
    error: string,
    startTime: number,
    context?: ExecutionContext
  ): AgentResult<TOutput> {
    return {
      success: false,
      error,
      metadata: {
        executionTimeMs: Date.now() - startTime,
        providerUsed: context?.getProvider().name || 'none',
      },
    };
  }
}

/**
 * Base class for orchestrator agents.
 * Provides parallel and sequential execution helpers.
 */
export abstract class BaseOrchestratorAgent<
  TInput = unknown,
  TOutput = unknown
> extends BaseAgent<TInput, TOutput> {
  /**
   * Get list of sub-agents this orchestrator manages.
   */
  abstract getSubAgents(): Agent[];

  /**
   * Execute multiple agents in parallel.
   */
  async executeParallel<T>(
    agents: Agent[],
    inputs: unknown[],
    context: ExecutionContext
  ): Promise<AgentResult<T>[]> {
    context.log('info', `[${this.id}] Executing ${agents.length} agents in parallel`);

    const results = await Promise.allSettled(
      agents.map((agent, i) => agent.execute(inputs[i], context))
    );

    return results.map((result, i) => {
      if (result.status === 'fulfilled') {
        return result.value as AgentResult<T>;
      }
      return {
        success: false,
        error: result.reason?.message || `Agent ${agents[i].id} failed`,
        metadata: {
          executionTimeMs: 0,
          providerUsed: 'none',
        },
      } as AgentResult<T>;
    });
  }

  /**
   * Execute agents in sequence with data passing.
   */
  async executeSequence<T>(
    agents: Agent[],
    initialInput: unknown,
    context: ExecutionContext
  ): Promise<AgentResult<T>> {
    context.log('info', `[${this.id}] Executing ${agents.length} agents in sequence`);

    let currentInput = initialInput;
    let lastResult: AgentResult<T> | null = null;

    for (const agent of agents) {
      const result = (await agent.execute(currentInput, context)) as AgentResult<T>;

      if (!result.success) {
        context.log('error', `[${this.id}] Sequence failed at agent ${agent.id}`);
        return result;
      }

      lastResult = result;
      currentInput = result.data;
    }

    if (!lastResult) {
      return {
        success: false,
        error: 'No agents executed',
        metadata: {
          executionTimeMs: 0,
          providerUsed: 'none',
        },
      };
    }

    return lastResult;
  }
}
