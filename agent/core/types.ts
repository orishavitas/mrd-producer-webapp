/**
 * Agent Core Type Definitions
 *
 * Defines the core interfaces for the multi-agent system.
 * All agents must implement the Agent interface.
 */

import { AIProvider, ProviderCapabilities } from '@/lib/providers/types';

/**
 * Agent execution status.
 */
export type AgentStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'waiting_input'
  | 'cancelled';

/**
 * Log levels for agent logging.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Result metadata from agent execution.
 */
export interface AgentMetadata {
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Provider used for AI operations */
  providerUsed: string;
  /** Tokens consumed (if available) */
  tokensUsed?: number;
  /** Additional provider-specific metadata */
  [key: string]: unknown;
}

/**
 * Result from agent execution.
 */
export interface AgentResult<T = unknown> {
  /** Whether execution succeeded */
  success: boolean;
  /** Result data (if successful) */
  data?: T;
  /** Error message (if failed) */
  error?: string;
  /** Warnings that don't prevent success */
  warnings?: string[];
  /** Execution metadata */
  metadata?: AgentMetadata;
}

/**
 * Agent configuration options.
 */
export interface AgentConfig {
  /** Maximum retry attempts */
  maxRetries: number;
  /** Timeout in milliseconds */
  timeoutMs: number;
  /** Enable fallback to other providers */
  enableFallback: boolean;
  /** Preferred provider name */
  preferredProvider?: string;
  /** Agent-specific custom settings */
  customSettings?: Record<string, unknown>;
}

/**
 * Default agent configuration.
 */
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  maxRetries: 3,
  timeoutMs: 60000,
  enableFallback: true,
};

/**
 * Logger function type.
 */
export type LoggerFn = (
  level: LogLevel,
  message: string,
  data?: unknown
) => void;

/**
 * Event emitter function type.
 */
export type EventEmitterFn = (event: string, data: unknown) => void;

/**
 * Shared execution context passed to all agents.
 */
export interface ExecutionContext {
  /** Request identification */
  requestId: string;
  /** Trace ID for distributed tracing */
  traceId: string;

  /**
   * Get a specific provider by name, or the default provider.
   */
  getProvider(name?: string): AIProvider;

  /**
   * Get the fallback chain of providers.
   */
  getFallbackChain(): AIProvider[];

  /**
   * Shared state between agents.
   */
  state: Map<string, unknown>;

  /**
   * Logging function.
   */
  log: LoggerFn;

  /**
   * Configuration for this execution.
   */
  config: AgentConfig;

  /**
   * Emit events for inter-agent communication.
   */
  emit: EventEmitterFn;

  /**
   * Abort signal for cancellation.
   */
  signal?: AbortSignal;

  /**
   * Agent registry for resolving dependencies.
   */
  registry?: AgentRegistry;

  /**
   * Parent agent ID (for nested orchestration).
   */
  parentAgentId?: string;
}

/**
 * Input validation result.
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Base agent interface.
 * All agents must implement this contract.
 */
export interface Agent<TInput = unknown, TOutput = unknown> {
  /** Unique agent identifier */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Semantic version */
  readonly version: string;
  /** Agent description */
  readonly description: string;

  /**
   * JSON schema for input validation (optional).
   */
  readonly inputSchema?: object;

  /**
   * JSON schema for output validation (optional).
   */
  readonly outputSchema?: object;

  /**
   * Required capabilities from AI provider (optional).
   */
  readonly requiredCapabilities?: (keyof ProviderCapabilities)[];

  /**
   * Execute the agent's task.
   *
   * @param input - Input data for the agent
   * @param context - Execution context with providers, state, logging
   * @returns Result with data or error
   */
  execute(input: TInput, context: ExecutionContext): Promise<AgentResult<TOutput>>;

  /**
   * Validate input before execution (optional).
   *
   * @param input - Input data to validate
   * @returns Validation result
   */
  validateInput?(input: TInput): ValidationResult;

  /**
   * Cleanup after execution (optional).
   *
   * @param context - Execution context
   */
  cleanup?(context: ExecutionContext): Promise<void>;
}

/**
 * Orchestrator agent that coordinates other agents.
 */
export interface OrchestratorAgent<TInput = unknown, TOutput = unknown>
  extends Agent<TInput, TOutput> {
  /**
   * Get list of sub-agents this orchestrator manages.
   */
  getSubAgents(): Agent[];

  /**
   * Execute multiple agents in parallel.
   *
   * @param agents - Agents to execute
   * @param inputs - Inputs for each agent
   * @param context - Execution context
   * @returns Results from all agents
   */
  executeParallel<T>(
    agents: Agent[],
    inputs: unknown[],
    context: ExecutionContext
  ): Promise<AgentResult<T>[]>;

  /**
   * Execute agents in sequence with data passing.
   *
   * @param agents - Agents to execute in order
   * @param initialInput - Input for the first agent
   * @param context - Execution context
   * @returns Result from the last agent
   */
  executeSequence<T>(
    agents: Agent[],
    initialInput: unknown,
    context: ExecutionContext
  ): Promise<AgentResult<T>>;
}

/**
 * Agent definition for dynamic loading from config.
 */
export interface AgentDefinition {
  /** Agent ID */
  id: string;
  /** Agent type (for factory resolution) */
  type: string;
  /** Agent configuration overrides */
  config?: Partial<AgentConfig>;
  /** Dependencies (other agent IDs) */
  dependencies?: string[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Registry for managing agents.
 */
export interface AgentRegistry {
  /**
   * Register an agent.
   */
  registerAgent(agent: Agent): void;

  /**
   * Get an agent by ID.
   */
  getAgent<T extends Agent>(id: string): T | undefined;

  /**
   * Get all registered agents.
   */
  getAllAgents(): Agent[];

  /**
   * Check if an agent is registered.
   */
  hasAgent(id: string): boolean;

  /**
   * Resolve agent dependencies.
   */
  resolveDependencies(agentId: string): Agent[];

  /**
   * Load agents from configuration.
   */
  loadFromConfig(definitions: AgentDefinition[]): Promise<void>;
}

/**
 * Factory for creating agents from definitions.
 */
export interface AgentFactory {
  /**
   * Create an agent from a definition.
   */
  create(definition: AgentDefinition, registry: AgentRegistry): Promise<Agent>;

  /**
   * Check if this factory supports the given type.
   */
  supports(type: string): boolean;
}

/**
 * Parallel execution options.
 */
export interface ParallelOptions {
  /** Maximum concurrent executions */
  maxConcurrency?: number;
  /** Fail fast on first error */
  failFast?: boolean;
  /** Timeout for entire parallel execution */
  timeout?: number;
}

/**
 * Merge strategy for combining results.
 */
export type MergeStrategy = 'first-success' | 'best-quality' | 'consensus' | 'union';

/**
 * Options for merging results from multiple agents.
 */
export interface MergeOptions {
  strategy: MergeStrategy;
  qualityEvaluator?: (result: unknown) => number;
}
