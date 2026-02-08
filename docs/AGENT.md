# AGENT.md - Agent Behavioral Contracts

This document defines the behavioral contracts, interfaces, and patterns for all agents in the MRD Producer multi-agent system.

---

## 1. Overview

The MRD Producer uses a **multi-agent architecture** where specialized agents coordinate to generate Market Requirements Documents. Each agent has a specific role and follows defined behavioral contracts.

### Architecture Principles

1. **Separation of Concerns**: Each agent handles one specific task
2. **Provider Agnostic**: Agents work with any AI provider through abstraction
3. **Composable**: Agents can be combined via orchestrators
4. **Configurable**: Behavior is tunable via YAML configuration
5. **Resilient**: Automatic fallback and retry on failures

---

## 2. Core Interfaces

### Agent Interface

Every agent must implement:

```typescript
interface Agent<TInput, TOutput> {
  // Identity
  readonly id: string;           // Unique identifier (e.g., 'gap-analyzer-agent')
  readonly name: string;         // Human-readable name
  readonly version: string;      // Semantic version (e.g., '1.0.0')
  readonly description: string;  // What this agent does

  // Optional schemas for validation
  readonly inputSchema?: object;
  readonly outputSchema?: object;
  readonly requiredCapabilities?: (keyof ProviderCapabilities)[];

  // Execution
  execute(input: TInput, context: ExecutionContext): Promise<AgentResult<TOutput>>;
  validateInput?(input: TInput): ValidationResult;
  cleanup?(context: ExecutionContext): Promise<void>;
}
```

### ExecutionContext

Agents receive context providing runtime services:

```typescript
interface ExecutionContext {
  requestId: string;              // Request tracking ID
  traceId: string;                // Distributed tracing ID

  getProvider(name?: string): AIProvider;  // Get AI provider
  getFallbackChain(): AIProvider[];        // Get fallback providers

  state: Map<string, unknown>;    // Shared state between agents
  log: LoggerFn;                  // Logging function
  emit: EventEmitterFn;           // Event emission
  config: AgentConfig;            // Configuration
  signal?: AbortSignal;           // Cancellation signal
  registry?: AgentRegistry;       // Agent registry for dependencies
}
```

### AgentResult

All agents return standardized results:

```typescript
interface AgentResult<T> {
  success: boolean;               // Did execution succeed?
  data?: T;                       // Result data (if successful)
  error?: string;                 // Error message (if failed)
  warnings?: string[];            // Non-fatal warnings
  metadata?: {
    executionTimeMs: number;      // How long it took
    providerUsed: string;         // Which AI provider was used
    tokensUsed?: number;          // Token consumption
  };
}
```

---

## 3. Agent Catalog

### Orchestrators

Orchestrators coordinate other agents and manage workflow.

| ID | Purpose | Sub-Agents |
|----|---------|------------|
| `mrd-orchestrator` | Main workflow coordination | parser, gap-analyzer, research-orchestrator, generation-orchestrator, quality-reviewer |
| `research-orchestrator` | Parallel research coordination | competitor-researcher, trend-researcher, pricing-researcher |
| `generation-orchestrator` | MRD section generation | market-section-generator, technical-section-generator, strategy-section-generator |

### Core Agents

| ID | Purpose | Input | Output |
|----|---------|-------|--------|
| `parser-agent` | Extract structured data from user input | Raw text input | `RequestData` |
| `gap-analyzer-agent` | Identify missing information | `RequestData` | `GapAssessment` |
| `mrd-generator-agent` | Generate complete MRD | `RequestData` + `ResearchData` | `MRDOutput` |

### Research Agents (Phase 4)

Research agents execute in parallel to gather market intelligence efficiently.

| ID | Purpose | Focus Areas | Output |
|----|---------|-------------|--------|
| `competitor-researcher` | Competitive analysis | pricing, features, market position, strengths/weaknesses | `CompetitorResearchData` |
| `trend-researcher` | Market trends | technology evolution, regulations, consumer behavior, market dynamics | `TrendResearchData` |
| `pricing-researcher` | Pricing research | pricing models, cost structures, margin analysis, competitive pricing | `PricingResearchData` |

**Common Features**:
- Require search grounding capability
- Generate minimum confidence scores
- Return structured data with sources
- Quality self-assessment
- Graceful degradation on partial failure

**Input**: `ResearchInput` (product concept, target market, clarifications)
**Output**: `ResearchOutput<T>` (typed research data, sources, quality metrics)

### Section Generators (Phase 5)

Section generators specialize in specific MRD sections for higher quality output.

| ID | Sections | Focus | Expertise |
|----|----------|-------|-----------|
| `market-section-generator` | 1-4 | Purpose, Problem, Markets, Users | Market analysis, user research, positioning |
| `technical-section-generator` | 5-7 | Description, Requirements, Design | Product specs, technical feasibility, design principles |
| `strategy-section-generator` | 8-12 | Price, Risks, Competition, Criteria | Business strategy, competitive analysis, success metrics |

**Features**:
- Specialized prompts for each section category
- Context-aware generation based on earlier sections
- Consistent formatting and structure
- Integration with research data
- Quality validation per section

**Input**: `SectionGenerationInput` (sections to generate, context, research data)
**Output**: `SectionGenerationOutput` (generated sections, quality scores, metadata)

### Reviewers (Phase 5)

Reviewers assess and improve MRD quality through validation and ensemble techniques.

| ID | Purpose | Strategy | Checks |
|----|---------|----------|--------|
| `quality-reviewer` | Validate MRD quality | Multi-dimensional scoring | Completeness, specificity, sources, structure, clarity |
| `ensemble-reviewer` | Merge multiple generations | Best-of, merge, consensus voting | Cross-generation comparison, conflict resolution |

**Quality Reviewer**:
- Scores each section (0-1 scale)
- Validates all 12 sections present
- Checks for generic placeholders
- Verifies source citations
- Ensures actionable recommendations
- Returns overall quality score + section breakdown

**Ensemble Reviewer**:
- Coordinates multiple generation attempts
- Compares outputs using quality metrics
- Selects best generation or merges sections
- Resolves conflicts via voting
- Strategies: `best-of`, `merge`, `consensus`

**Input**: MRD content (single or multiple generations)
**Output**: Quality assessment + validated/merged MRD

---

## 4. Behavioral Rules

### 4.1 Gap Analyzer Agent

**Goal**: Identify missing information to ensure quality MRD generation.

**Rules**:
1. Classify gaps as: `BLOCKING` > `IMPORTANT` > `MINOR`
2. Maximum 5 questions per clarification round
3. Maximum 2 clarification rounds total
4. Never ask the same question twice

**Decision Logic**:
```
IF blocking_gaps > 0 AND round < max_rounds THEN clarify
ELSE IF important_gaps > 2 AND round < max_rounds THEN clarify
ELSE proceed
```

**Question Priority**:
1. target_markets (100)
2. use_cases (90)
3. target_price (80)
4. technical_requirements (70)
5. volume_expectation (60)
6. timeline (50)

### 4.2 Research Agents

**Goal**: Gather factual, verifiable market information.

**Rules**:
1. All claims must be backed by sources
2. Minimum 3 competitor products found
3. Prefer providers with search grounding (Gemini)
4. Acknowledge limitations explicitly

**Research Strategy**:
```
1. Broad search for market overview
2. Specific search for named competitors
3. Validation search for feature comparisons
```

### 4.3 MRD Generator Agent

**Goal**: Produce actionable, structured MRD documents.

**Rules**:
1. Follow exact 12-section structure
2. Use `---` horizontal rules between sections
3. Bold key specs, prices, and labels with `**`
4. Include source citations where available
5. Be specific - no generic placeholders

**Section Requirements**:
- Purpose & Vision: 50+ words, portfolio context
- Problem Statement: 75+ words, market gap
- Use Cases: 2+ scenarios with details
- Users: 1+ personas with context
- Requirements: 3+ functional, 2+ technical
- Success Criteria: 2+ measurable metrics

### 4.4 Research Agents

**Goal**: Gather verifiable, high-quality market intelligence.

**Rules**:
1. Always prefer providers with search grounding (Gemini)
2. Minimum 3 competitive products or 5 data points
3. All claims must include source citations
4. Self-assess quality and confidence
5. Acknowledge gaps explicitly

**Quality Thresholds**:
- Confidence > 0.7 to meet minimum requirements
- At least 3 unique sources per research type
- No generic statements without evidence

**Example - Competitor Research**:
```typescript
// Good: Specific with sources
{
  competitors: [
    {
      name: "Nest Thermostat",
      pricing: "$129-249",
      features: ["Auto-scheduling", "Remote control"],
      marketPosition: "Premium",
      source: "https://store.google.com/nest"
    }
  ],
  confidence: 0.85
}

// Bad: Generic without sources
{
  competitors: [
    { name: "Various thermostats", pricing: "Varies" }
  ],
  confidence: 0.3
}
```

### 4.5 Section Generator Agents

**Goal**: Produce section-specific content with specialized expertise.

**Rules**:
1. Focus only on assigned sections
2. Use specialized prompts for domain expertise
3. Maintain consistent tone across sections
4. Reference research data when available
5. Follow MRD template formatting exactly

**Section-Specific Requirements**:

**Market Sections (1-4)**:
- Purpose: Strategic alignment with portfolio
- Problem: Quantify market gap with data
- Market: Segment by specific criteria
- Users: Define 1-3 detailed personas

**Technical Sections (5-7)**:
- Description: Specific features, not generic
- Requirements: 3+ functional, 2+ technical, 1+ compliance
- Design: Visual language, material choices

**Strategy Sections (8-12)**:
- Price: Specific range with justification
- Risks: Technical, market, regulatory
- Competition: Named competitors with comparison
- Criteria: 2+ measurable KPIs

### 4.6 Orchestrator Agents

**Goal**: Coordinate sub-agents efficiently.

**Rules**:
1. Validate inputs before dispatching to sub-agents
2. Handle partial failures gracefully
3. Aggregate results appropriately
4. Log all stage transitions
5. Track execution metrics

**Execution Patterns**:
- **Sequential**: Data flows from one agent to next
- **Parallel**: Independent agents run concurrently
- **Ensemble**: Multiple agents generate, results merged

**Research Orchestrator Rules**:
- Execute all research agents in parallel
- Require minimum 1 successful research type
- Deduplicate sources across agents
- Merge quality assessments
- Continue with partial results if minimum met

**Generation Orchestrator Rules**:
- Can execute sequentially or in parallel
- Pass shared context to all generators
- Merge sections in correct order (1-12)
- Validate section numbering
- Ensure no section gaps

---

## 5. Execution Patterns

### Sequential Execution

```typescript
// Data passes from agent to agent
const result = await orchestrator.executeSequence(
  [parserAgent, gapAgent, researchAgent, generatorAgent],
  initialInput,
  context
);
```

### Parallel Execution

```typescript
// Independent agents run concurrently
const results = await orchestrator.executeParallel(
  [competitorResearcher, trendResearcher, pricingResearcher],
  [input1, input2, input3],
  context
);
```

### Fallback Chain

```typescript
// Try providers in priority order
const { result, providerUsed } = await chain.executeWithFallback(
  (provider) => provider.generateText(prompt)
);
```

### Ensemble Voting

```typescript
// Multiple generations, best selected
const generations = await Promise.all(
  providers.map(p => generate(input, p))
);
const best = await ensembleReviewer.selectBest(generations);
```

---

## 6. Creating Custom Agents

### Step 1: Define Agent Class

```typescript
import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext } from '@/agent/core/types';

interface MyInput {
  topic: string;
  context?: string;
}

interface MyOutput {
  summary: string;
  sources: string[];
}

export class MyCustomAgent extends BaseAgent<MyInput, MyOutput> {
  readonly id = 'my-custom-agent';
  readonly name = 'My Custom Agent';
  readonly version = '1.0.0';
  readonly description = 'Performs custom analysis';

  readonly requiredCapabilities = ['textGeneration'] as const;

  protected async executeCore(
    input: MyInput,
    context: ExecutionContext
  ): Promise<MyOutput> {
    const provider = context.getProvider();

    const response = await provider.generateText(
      `Analyze: ${input.topic}\nContext: ${input.context || 'None'}`,
      'You are an expert analyst...'
    );

    return {
      summary: response.text,
      sources: response.sources?.map(s => s.url) || [],
    };
  }

  validateInput(input: MyInput): { valid: boolean; errors?: string[] } {
    if (!input.topic || input.topic.length < 10) {
      return { valid: false, errors: ['Topic must be at least 10 characters'] };
    }
    return { valid: true };
  }
}
```

### Step 2: Register in Configuration

```yaml
# config/agents/custom-agents.yaml
agents:
  - id: my-custom-agent
    type: custom
    config:
      preferredProvider: gemini
      customSettings:
        maxLength: 500
```

### Step 3: Use in Orchestrator

```typescript
const myAgent = registry.getAgent<MyCustomAgent>('my-custom-agent');
const result = await myAgent.execute(
  { topic: 'Market analysis for tablets' },
  context
);
```

---

## 7. AI Provider Contract

All AI providers must implement:

```typescript
interface AIProvider {
  readonly name: string;           // e.g., 'gemini', 'claude', 'openai'
  readonly version: string;
  readonly capabilities: {
    textGeneration: boolean;       // Can generate text
    searchGrounding: boolean;      // Has web search built-in
    structuredOutput: boolean;     // Can output JSON
    streaming: boolean;            // Supports streaming
    functionCalling: boolean;      // Supports tools/functions
  };

  isAvailable(): boolean;
  generateText(prompt, systemPrompt?, options?): Promise<GenerationResponse>;
  generateWithSearch?(prompt, systemPrompt?, options?): Promise<GenerationResponse>;
  generateStructured?<T>(prompt, schema, systemPrompt?, options?): Promise<T>;
}
```

### Current Providers

| Provider | Search | Structured | Status |
|----------|--------|------------|--------|
| Gemini   | Yes    | Yes        | Active |
| Claude   | No     | Yes        | Active |
| OpenAI   | No     | Yes        | Active |

See [PROVIDERS.md](./PROVIDERS.md) for detailed provider documentation.

---

## 8. Configuration Reference

### Agent Configuration

```yaml
agents:
  - id: agent-id
    type: agent-type
    description: "What this agent does"
    config:
      maxRetries: 3
      timeoutMs: 60000
      enableFallback: true
      preferredProvider: gemini
      customSettings:
        key: value
```

### Execution Patterns

```yaml
patterns:
  research:
    type: parallel
    maxConcurrency: 3
    failFast: false
    timeout: 120000

  generation:
    type: sequential
    enableEnsemble: false

  fallback:
    enabled: true
    maxAttempts: 3
    retryDelayMs: 1000
```

### Feature Flags

```yaml
features:
  useMultiAgent: true       # Enable multi-agent system
  parallelResearch: true    # Run research agents in parallel
  sectionSpecialists: false # Use section-specific generators
  ensembleVoting: false     # Generate with multiple providers
  qualityReview: true       # Enable quality review step
```

---

## 9. Error Handling

### Retry Strategy

1. On failure, check if retries remaining
2. If `enableFallback`, try next provider in chain
3. Log all failures with context
4. Return partial results if possible

### Error Types

| Error | Handling |
|-------|----------|
| Provider unavailable | Use fallback chain |
| Timeout | Retry with extended timeout |
| Invalid input | Return validation error |
| Rate limit | Wait and retry |
| Parse error | Log and return raw text |

### Example Error Result

```typescript
{
  success: false,
  error: "Provider gemini failed: Rate limit exceeded",
  warnings: ["Attempted fallback to claude", "Claude not configured"],
  metadata: {
    executionTimeMs: 5234,
    providerUsed: "none"
  }
}
```

---

## 10. Observability

### Logging Levels

- `debug`: Detailed execution traces
- `info`: Stage transitions, success messages
- `warn`: Non-fatal issues, fallbacks
- `error`: Failures, exceptions

### Recommended Log Points

1. Agent execution start
2. Input validation result
3. Provider selection
4. AI request/response
5. Fallback attempts
6. Agent execution end

### Metrics to Track

- Execution time per agent
- Token consumption
- Provider success rates
- Fallback frequency
- Error rates by type
