/**
 * Parallel Executor Pattern
 *
 * Generic parallel execution utility for agents with advanced features:
 * - Configurable concurrency limits
 * - Fail-fast or graceful degradation
 * - Timeout handling
 * - Partial result collection
 * - Progress tracking
 * - Result aggregation strategies
 *
 * Used by orchestrators to execute multiple agents concurrently while
 * maintaining control over resource usage and error handling.
 */

import { Agent, AgentResult, ExecutionContext } from '@/agent/core/types';

/**
 * Options for parallel execution.
 */
export interface ParallelExecutionOptions {
  /**
   * Maximum number of concurrent executions.
   * Default: unlimited (all run in parallel)
   */
  maxConcurrency?: number;

  /**
   * Fail fast on first error.
   * If true, stops execution when first agent fails.
   * If false, collects all results regardless of failures.
   * Default: false
   */
  failFast?: boolean;

  /**
   * Timeout for entire parallel execution in milliseconds.
   * Default: 300000 (5 minutes)
   */
  timeout?: number;

  /**
   * Minimum successful agents required.
   * If set and not met, entire execution is considered failed.
   * Default: undefined (no minimum)
   */
  minSuccessful?: number;

  /**
   * Progress callback for tracking execution.
   * Called when each agent completes.
   */
  onProgress?: (completed: number, total: number, agentId: string) => void;

  /**
   * Error callback for handling individual agent failures.
   * Called when an agent fails (if not fail-fast).
   */
  onError?: (agentId: string, error: string) => void;
}

/**
 * Result from parallel execution.
 */
export interface ParallelExecutionResult<T = unknown> {
  /** Whether execution was successful overall */
  success: boolean;
  /** Individual results from each agent */
  results: AgentResult<T>[];
  /** Summary statistics */
  summary: {
    /** Total agents executed */
    total: number;
    /** Number of successful executions */
    successful: number;
    /** Number of failed executions */
    failed: number;
    /** Total execution time in milliseconds */
    executionTimeMs: number;
  };
  /** Overall error message (if failed) */
  error?: string;
}

/**
 * Task for parallel execution.
 */
interface ExecutionTask<T = unknown> {
  agent: Agent;
  input: unknown;
  index: number;
  promise?: Promise<AgentResult<T>>;
}

/**
 * Parallel Executor for agents.
 */
export class ParallelExecutor {
  /**
   * Execute multiple agents in parallel with specified inputs.
   *
   * @param agents - Array of agents to execute
   * @param inputs - Array of inputs (must match agents array length)
   * @param context - Execution context shared by all agents
   * @param options - Parallel execution options
   * @returns Parallel execution result
   */
  static async execute<T = unknown>(
    agents: Agent[],
    inputs: unknown[],
    context: ExecutionContext,
    options: ParallelExecutionOptions = {}
  ): Promise<ParallelExecutionResult<T>> {
    const startTime = Date.now();

    // Validate inputs
    if (agents.length !== inputs.length) {
      return this.createFailureResult(
        `Agent and input arrays must have same length (agents: ${agents.length}, inputs: ${inputs.length})`,
        startTime
      );
    }

    if (agents.length === 0) {
      return this.createFailureResult('No agents to execute', startTime);
    }

    // Apply defaults
    const {
      maxConcurrency = Infinity,
      failFast = false,
      timeout = 300000, // 5 minutes
      minSuccessful,
      onProgress,
      onError,
    } = options;

    context.log('info', '[ParallelExecutor] Starting parallel execution', {
      agentCount: agents.length,
      maxConcurrency,
      failFast,
      timeout,
    });

    // Create tasks
    const tasks: ExecutionTask<T>[] = agents.map((agent, index) => ({
      agent,
      input: inputs[index],
      index,
    }));

    // Execute with timeout
    try {
      const results = await this.executeWithTimeout(
        () => this.executeTasks<T>(tasks, context, maxConcurrency, failFast, onProgress, onError),
        timeout
      );

      const executionTimeMs = Date.now() - startTime;
      const summary = this.calculateSummary(results, executionTimeMs);

      context.log('info', '[ParallelExecutor] Parallel execution completed', summary);

      // Check minimum successful requirement
      if (minSuccessful !== undefined && summary.successful < minSuccessful) {
        return {
          success: false,
          results,
          summary,
          error: `Only ${summary.successful} of ${summary.total} agents succeeded (minimum ${minSuccessful} required)`,
        };
      }

      // Consider success if at least one agent succeeded (unless all failed)
      const success = summary.successful > 0;

      return {
        success,
        results,
        summary,
        error: success ? undefined : 'All agents failed',
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      context.log('error', '[ParallelExecutor] Parallel execution failed', {
        error: errorMessage,
      });

      return {
        success: false,
        results: [],
        summary: {
          total: agents.length,
          successful: 0,
          failed: agents.length,
          executionTimeMs,
        },
        error: errorMessage,
      };
    }
  }

  /**
   * Execute tasks with concurrency control.
   */
  private static async executeTasks<T>(
    tasks: ExecutionTask<T>[],
    context: ExecutionContext,
    maxConcurrency: number,
    failFast: boolean,
    onProgress?: (completed: number, total: number, agentId: string) => void,
    onError?: (agentId: string, error: string) => void
  ): Promise<AgentResult<T>[]> {
    const results: AgentResult<T>[] = new Array(tasks.length);
    let completed = 0;
    let failed = false;

    // If unlimited concurrency, run all at once
    if (maxConcurrency >= tasks.length) {
      const promises = tasks.map((task) =>
        this.executeTask<T>(task, context, onProgress, onError, completed, tasks.length)
      );

      const settledResults = await Promise.allSettled(promises);

      settledResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results[index] = result.value;
          if (!result.value.success && failFast) {
            failed = true;
          }
        } else {
          results[index] = {
            success: false,
            error: result.reason?.message || 'Unknown error',
            metadata: {
              executionTimeMs: 0,
              providerUsed: 'none',
            },
          };
          if (failFast) {
            failed = true;
          }
        }
      });

      if (failed && failFast) {
        throw new Error('Fail-fast triggered: One or more agents failed');
      }

      return results;
    }

    // Otherwise, execute with concurrency limit
    const queue = [...tasks];
    const executing: Promise<void>[] = [];

    while (queue.length > 0 || executing.length > 0) {
      // Check if we should stop (fail-fast)
      if (failed && failFast) {
        break;
      }

      // Start new tasks up to concurrency limit
      while (queue.length > 0 && executing.length < maxConcurrency) {
        const task = queue.shift()!;

        const execution = this.executeTask<T>(
          task,
          context,
          onProgress,
          onError,
          completed,
          tasks.length
        )
          .then((result) => {
            results[task.index] = result;
            completed++;

            if (!result.success) {
              if (onError) {
                onError(task.agent.id, result.error || 'Unknown error');
              }
              if (failFast) {
                failed = true;
              }
            }

            if (onProgress) {
              onProgress(completed, tasks.length, task.agent.id);
            }
          })
          .catch((error) => {
            results[task.index] = {
              success: false,
              error: error instanceof Error ? error.message : String(error),
              metadata: {
                executionTimeMs: 0,
                providerUsed: 'none',
              },
            };
            completed++;

            if (onError) {
              onError(task.agent.id, error instanceof Error ? error.message : String(error));
            }

            if (failFast) {
              failed = true;
            }

            if (onProgress) {
              onProgress(completed, tasks.length, task.agent.id);
            }
          });

        executing.push(execution);
      }

      // Wait for at least one to complete
      if (executing.length > 0) {
        await Promise.race(executing);
        // Remove completed executions
        for (let i = executing.length - 1; i >= 0; i--) {
          const isSettled = await Promise.race([
            executing[i].then(() => true),
            Promise.resolve(false),
          ]);
          if (isSettled) {
            executing.splice(i, 1);
          }
        }
      }
    }

    if (failed && failFast) {
      throw new Error('Fail-fast triggered: One or more agents failed');
    }

    return results;
  }

  /**
   * Execute a single task.
   */
  private static async executeTask<T>(
    task: ExecutionTask<T>,
    context: ExecutionContext,
    onProgress?: (completed: number, total: number, agentId: string) => void,
    onError?: (agentId: string, error: string) => void,
    completed?: number,
    total?: number
  ): Promise<AgentResult<T>> {
    try {
      const result = await task.agent.execute(task.input, context);
      return result as AgentResult<T>;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        metadata: {
          executionTimeMs: 0,
          providerUsed: 'none',
        },
      };
    }
  }

  /**
   * Execute with timeout.
   */
  private static async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Parallel execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Calculate execution summary.
   */
  private static calculateSummary(
    results: AgentResult<unknown>[],
    executionTimeMs: number
  ): ParallelExecutionResult['summary'] {
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      total: results.length,
      successful,
      failed,
      executionTimeMs,
    };
  }

  /**
   * Create a failure result.
   */
  private static createFailureResult<T = unknown>(
    error: string,
    startTime: number
  ): ParallelExecutionResult<T> {
    return {
      success: false,
      results: [],
      summary: {
        total: 0,
        successful: 0,
        failed: 0,
        executionTimeMs: Date.now() - startTime,
      },
      error,
    };
  }
}
