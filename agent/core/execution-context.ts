/**
 * Execution Context Implementation
 *
 * Provides the runtime context for agent execution including
 * provider access, state management, logging, and configuration.
 */

import { AIProvider } from '@/lib/providers/types';
import { ProviderChain, getProviderChain } from '@/lib/providers/provider-chain';
import {
  ExecutionContext,
  AgentConfig,
  AgentRegistry,
  LogLevel,
  LoggerFn,
  EventEmitterFn,
  DEFAULT_AGENT_CONFIG,
} from './types';

/**
 * Options for creating an execution context.
 */
export interface ExecutionContextOptions {
  /** Request ID (auto-generated if not provided) */
  requestId?: string;
  /** Trace ID for distributed tracing */
  traceId?: string;
  /** Provider chain to use */
  providerChain?: ProviderChain;
  /** Initial shared state */
  initialState?: Record<string, unknown>;
  /** Configuration overrides */
  config?: Partial<AgentConfig>;
  /** Agent registry */
  registry?: AgentRegistry;
  /** Parent agent ID (for nested execution) */
  parentAgentId?: string;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Custom logger */
  logger?: LoggerFn;
  /** Event handler */
  eventHandler?: EventEmitterFn;
}

/**
 * Generate a unique request ID.
 */
function generateRequestId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `REQ-${date}-${random}`;
}

/**
 * Generate a unique trace ID.
 */
function generateTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Default logger implementation.
 */
function defaultLogger(level: LogLevel, message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  switch (level) {
    case 'debug':
      console.debug(prefix, message, data ?? '');
      break;
    case 'info':
      console.log(prefix, message, data ?? '');
      break;
    case 'warn':
      console.warn(prefix, message, data ?? '');
      break;
    case 'error':
      console.error(prefix, message, data ?? '');
      break;
  }
}

/**
 * Default event handler (no-op).
 */
function defaultEventHandler(event: string, data: unknown): void {
  // Default: no event handling
}

/**
 * Concrete implementation of ExecutionContext.
 */
export class ExecutionContextImpl implements ExecutionContext {
  readonly requestId: string;
  readonly traceId: string;
  readonly state: Map<string, unknown>;
  readonly config: AgentConfig;
  readonly log: LoggerFn;
  readonly emit: EventEmitterFn;
  readonly signal?: AbortSignal;
  readonly registry?: AgentRegistry;
  readonly parentAgentId?: string;

  private providerChain: ProviderChain;

  constructor(options: ExecutionContextOptions = {}) {
    this.requestId = options.requestId || generateRequestId();
    this.traceId = options.traceId || generateTraceId();
    this.providerChain = options.providerChain || getProviderChain();
    this.config = { ...DEFAULT_AGENT_CONFIG, ...options.config };
    this.signal = options.signal;
    this.registry = options.registry;
    this.parentAgentId = options.parentAgentId;

    // Initialize state
    this.state = new Map();
    if (options.initialState) {
      for (const [key, value] of Object.entries(options.initialState)) {
        this.state.set(key, value);
      }
    }

    // Set up logging
    this.log = options.logger || defaultLogger;

    // Set up event handling
    this.emit = options.eventHandler || defaultEventHandler;

    this.log('debug', `ExecutionContext created`, {
      requestId: this.requestId,
      traceId: this.traceId,
    });
  }

  /**
   * Get a specific provider by name, or the default provider.
   */
  getProvider(name?: string): AIProvider {
    if (name) {
      const provider = this.providerChain.get(name);
      if (!provider) {
        throw new Error(`Provider '${name}' not found or not available`);
      }
      return provider;
    }

    // Try preferred provider first
    if (this.config.preferredProvider) {
      const preferred = this.providerChain.get(this.config.preferredProvider);
      if (preferred) {
        return preferred;
      }
      this.log('warn', `Preferred provider '${this.config.preferredProvider}' not available`);
    }

    // Fall back to default
    const defaultProvider = this.providerChain.getDefault();
    if (!defaultProvider) {
      throw new Error('No AI provider available');
    }
    return defaultProvider;
  }

  /**
   * Get the fallback chain of providers.
   */
  getFallbackChain(): AIProvider[] {
    return this.providerChain.getFallbackChain();
  }

  /**
   * Create a child context for nested execution.
   */
  createChildContext(
    parentAgentId: string,
    overrides?: Partial<ExecutionContextOptions>
  ): ExecutionContext {
    return new ExecutionContextImpl({
      requestId: this.requestId,
      traceId: this.traceId,
      providerChain: this.providerChain,
      initialState: Object.fromEntries(this.state),
      config: { ...this.config, ...overrides?.config },
      registry: this.registry,
      parentAgentId,
      signal: overrides?.signal || this.signal,
      logger: this.log,
      eventHandler: this.emit,
      ...overrides,
    });
  }
}

/**
 * Create an execution context with default settings.
 */
export function createExecutionContext(
  options?: ExecutionContextOptions
): ExecutionContext {
  return new ExecutionContextImpl(options);
}

/**
 * Create an execution context for testing.
 * Uses mock providers and captures logs.
 */
export function createTestExecutionContext(
  options?: ExecutionContextOptions & {
    capturedLogs?: Array<{ level: LogLevel; message: string; data?: unknown }>;
    capturedEvents?: Array<{ event: string; data: unknown }>;
  }
): ExecutionContext & {
  capturedLogs: Array<{ level: LogLevel; message: string; data?: unknown }>;
  capturedEvents: Array<{ event: string; data: unknown }>;
} {
  const capturedLogs: Array<{ level: LogLevel; message: string; data?: unknown }> =
    options?.capturedLogs || [];
  const capturedEvents: Array<{ event: string; data: unknown }> =
    options?.capturedEvents || [];

  const context = new ExecutionContextImpl({
    ...options,
    logger: (level, message, data) => {
      capturedLogs.push({ level, message, data });
    },
    eventHandler: (event, data) => {
      capturedEvents.push({ event, data });
    },
  });

  return Object.assign(context, { capturedLogs, capturedEvents });
}
