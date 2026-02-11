# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MRD Producer is a Next.js web application with three complementary features:

1. **Main MRD Producer** (`/`) - Generates full 12-section Market Requirements Documents with AI-powered competitive research via Gemini's Google Search grounding. For new product concepts needing market validation.

2. **Progressive Intake** (`/intake`) - 4-topic structured intake flow for stand/enclosure products. Guides users through sequential topic approval with live research preview. (feature/progressive-intake branch)

3. **Brief Helper** (`/brief-helper`) - Quick 6-field capture tool for products past the research phase. Uses AI to extract structured data, detect gaps, and generate simplified briefs. (feature/brief-helper branch - IN PROGRESS)

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm run lint         # Run ESLint
npm test             # Run all tests
npm test -- path/to/test.ts  # Run single test file
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report (50% threshold)
```

## Architecture

The codebase follows a **multi-agent architecture** with provider abstraction:

```
app/                    # Next.js App Router - UI and API endpoints
├── /                   # Main MRD Producer (full research + 12-section MRD)
├── intake/             # Progressive 4-topic intake flow
├── brief-helper/       # Quick 6-field simplified brief (IN PROGRESS)
├── api/
│   ├── generate/       # Main MRD generation endpoint
│   ├── download/       # Document export (DOCX, HTML, PDF)
│   ├── intake/         # Intake flow endpoints
│   ├── brief/          # Brief Helper endpoints (IN PROGRESS)
│   └── workflow/       # Multi-stage stateful pipeline

agent/                  # Multi-agent orchestration system
├── core/               # Core infrastructure
│   ├── types.ts        # Agent, ExecutionContext interfaces
│   ├── base-agent.ts   # Abstract base class for agents
│   └── execution-context.ts  # Runtime context for agents
├── agents/             # Specialized agents
│   ├── parser-agent.ts      # Request parsing and extraction
│   ├── gap-analyzer-agent.ts # Information gap detection
│   ├── mrd-generator-agent.ts # MRD document generation
│   ├── research/       # Research agents (Phase 4)
│   │   ├── base-researcher.ts        # Abstract researcher base
│   │   ├── competitor-researcher.ts  # Competitive analysis
│   │   ├── trend-researcher.ts       # Market trends
│   │   └── pricing-researcher.ts     # Pricing research
│   ├── generators/     # Section specialists (Phase 5)
│   │   ├── base-section-generator.ts      # Abstract generator base
│   │   ├── market-section-generator.ts    # Sections 1-4
│   │   ├── technical-section-generator.ts # Sections 5-7
│   │   └── strategy-section-generator.ts  # Sections 8-12
│   ├── reviewers/      # Quality and ensemble reviewers (Phase 5)
│   │   ├── quality-reviewer.ts   # MRD quality validation
│   │   └── ensemble-reviewer.ts  # Multi-generation merger
│   └── brief/          # Brief Helper agents (IN PROGRESS - feature/brief-helper)
│       ├── types.ts    # Brief Helper types
│       ├── text-extraction-agent.ts  # Extract structured data from free text
│       ├── gap-detection-agent.ts    # Identify missing information
│       ├── expansion-agent.ts        # AI-powered text expansion
│       ├── brief-generator-agent.ts  # Generate simplified briefs
│       └── knowledge-base-agent.ts   # Learn patterns over time
├── orchestrators/      # Coordination agents
│   ├── mrd-orchestrator.ts        # Main workflow orchestrator
│   ├── research-orchestrator.ts   # Parallel research coordinator
│   ├── generation-orchestrator.ts # Section generation coordinator
│   └── brief-orchestrator.ts      # Brief Helper orchestrator (IN PROGRESS)
├── patterns/           # Reusable execution patterns
│   ├── parallel-executor.ts  # Parallel agent execution
│   └── ensemble-merger.ts    # Ensemble merging strategies
└── workflow.ts         # Legacy workflow (backward compatible)

lib/
├── providers/          # AI provider abstraction
│   ├── types.ts        # AIProvider interface
│   ├── gemini-provider.ts     # Google Gemini implementation
│   ├── anthropic-provider.ts  # Anthropic Claude implementation
│   ├── openai-provider.ts     # OpenAI GPT implementation
│   └── provider-chain.ts      # Fallback chain manager
├── gemini.ts           # Legacy Gemini client (preserved)
├── document-generator.ts    # DOCX/HTML generation
├── sanitize.ts         # Input sanitization
└── schemas.ts          # TypeScript interfaces

skills/                 # Atomic capabilities (pure functions)
├── mrd_generator.ts    # MRD generation with 12-section template
├── gap_analyzer.ts     # Information gap detection
└── web_search.ts       # Legacy search (deprecated)

config/
└── agents/
    └── default.yaml    # Agent configuration

references/             # Prompt templates and MRD specifications
├── 01_parse_request.md - 04_generate_mrd.md
└── mrd-template-reference.md
```

## Multi-Agent System

### Enabling Multi-Agent Mode

Set environment variable to use the new multi-agent system:
```bash
USE_MULTI_AGENT=true
```

When disabled (default), the legacy `workflow.ts` pipeline is used for backward compatibility.

### Core Concepts

**Agents** are autonomous units that perform specific tasks:
- **Core Agents**: `ParserAgent`, `GapAnalyzerAgent`, `MRDGeneratorAgent`
- **Research Agents**: `CompetitorResearcher`, `TrendResearcher`, `PricingResearcher`
- **Section Generators**: `MarketSectionGenerator`, `TechnicalSectionGenerator`, `StrategySectionGenerator`
- **Reviewers**: `QualityReviewer`, `EnsembleReviewer`
- **Orchestrators**: `MRDOrchestrator`, `ResearchOrchestrator`, `GenerationOrchestrator`

**Providers** are AI service abstractions:
- Implement `AIProvider` interface from `lib/providers/types.ts`
- Active: Gemini (with search grounding), Claude, OpenAI
- Automatic fallback chain for reliability

**ExecutionContext** provides runtime services:
- Provider access via `getProvider()` and `getFallbackChain()`
- Shared state via `state` Map
- Logging via `log(level, message, data)`
- Configuration via `config`

### Provider Chain (`lib/providers/provider-chain.ts`)

```typescript
import { getProviderChain } from '@/lib/providers/provider-chain';

const chain = getProviderChain();

// Execute with automatic fallback
const { result, providerUsed } = await chain.executeWithFallback(
  (provider) => provider.generateText(prompt, systemPrompt)
);
```

### Creating an Agent

```typescript
import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext } from '@/agent/core/types';

class MyAgent extends BaseAgent<MyInput, MyOutput> {
  readonly id = 'my-agent';
  readonly name = 'My Custom Agent';
  readonly version = '1.0.0';
  readonly description = 'Does something specific';

  protected async executeCore(
    input: MyInput,
    context: ExecutionContext
  ): Promise<MyOutput> {
    const provider = context.getProvider();
    const response = await provider.generateText(
      this.buildPrompt(input),
      this.getSystemPrompt()
    );
    return this.parseResponse(response);
  }
}
```

### Configuration (`config/agents/default.yaml`)

Agent behavior is configurable via YAML:
- Provider priority and settings
- Agent-specific configuration
- Execution patterns (parallel, sequential)
- Feature flags

## Key Integration Points

### AI Providers

| Provider | Search Grounding | Structured Output | Status |
|----------|-----------------|-------------------|--------|
| Gemini   | Yes (Google Search) | Yes | Active |
| Claude   | No              | Yes | Active |
| OpenAI   | No              | Yes | Active |

**Provider Chain**: Providers are tried in priority order (configurable in `config/agents/default.yaml`). The system automatically falls back to the next available provider on failure.

### MRD Template Structure

12 sections in order:
1. Purpose & Vision
2. Problem Statement
3. Target Market & Use Cases
4. Target Users
5. Product Description
6. Key Requirements (with subsections)
7. Design & Aesthetics
8. Target Price
9. Risks and Thoughts
10. Competition to review
11. Additional Considerations
12. Success Criteria

See `references/mrd-template-reference.md` for exact formatting specs.

### Document Export (`lib/document-generator.ts`)

- `docx` library for Word documents
- Print-ready HTML for PDF export
- Template specs: Arial font, US Letter, 1" margins

## Testing

Tests in `__tests__/` mirroring source structure. Jest with ts-jest preset.

```bash
npm test -- __tests__/lib/sanitize.test.ts    # Single file
npm test -- --testNamePattern="sanitize"       # Pattern match
```

Path alias `@/*` maps to project root.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Yes | Gemini API key |
| `ANTHROPIC_API_KEY` | No | Claude API key (Phase 3) |
| `OPENAI_API_KEY` | No | OpenAI API key (Phase 3) |
| `USE_MULTI_AGENT` | No | Enable new multi-agent system |

## Deployment

Deployed to Vercel. CI/CD via GitHub Actions (`.github/workflows/deploy.yml`).
Set environment variables in Vercel dashboard, not in code.

## Implementation Status

### Completed Phases

**Phase 1 - Foundation:**
- `lib/providers/types.ts` - AIProvider interface
- `lib/providers/gemini-provider.ts` - Gemini implementation
- `lib/providers/provider-chain.ts` - Fallback chain manager
- `agent/core/types.ts` - Agent, ExecutionContext interfaces
- `agent/core/base-agent.ts` - Abstract base class
- `agent/core/execution-context.ts` - Runtime context
- `config/agents/default.yaml` - Default configuration

**Phase 2 - Agent Refactoring:**
- `agent/agents/parser-agent.ts` - Request parsing
- `agent/agents/gap-analyzer-agent.ts` - Gap analysis
- `agent/agents/mrd-generator-agent.ts` - MRD generation
- `agent/orchestrators/mrd-orchestrator.ts` - Workflow orchestration
- `agent/workflow.ts` - Feature flag integration

**Phase 3 - Multi-Provider Support:**
- `lib/providers/anthropic-provider.ts` - Claude integration
- `lib/providers/openai-provider.ts` - OpenAI GPT integration
- `lib/providers/provider-chain.ts` - Automatic fallback system
- Multi-provider support with graceful fallback

**Phase 4 - Parallel Research Agents:**
- `agent/agents/research/base-researcher.ts` - Abstract researcher base
- `agent/agents/research/competitor-researcher.ts` - Competitive analysis
- `agent/agents/research/trend-researcher.ts` - Market trend research
- `agent/agents/research/pricing-researcher.ts` - Pricing strategy research
- `agent/orchestrators/research-orchestrator.ts` - Parallel execution coordinator
- `agent/patterns/parallel-executor.ts` - Parallel execution pattern
- `docs/PHASE_4_RESEARCH_AGENTS.md` - Phase 4 documentation

**Phase 5 - Section Specialists and Ensemble Voting:**
- `agent/agents/generators/base-section-generator.ts` - Abstract base for section generators
- `agent/agents/generators/market-section-generator.ts` - Market sections (1-4)
- `agent/agents/generators/technical-section-generator.ts` - Technical sections (5-7)
- `agent/agents/generators/strategy-section-generator.ts` - Strategy sections (8-12)
- `agent/agents/reviewers/quality-reviewer.ts` - Quality assessment agent
- `agent/agents/reviewers/ensemble-reviewer.ts` - Ensemble voting coordinator
- `agent/patterns/ensemble-merger.ts` - Merge strategies for ensemble outputs
- `agent/orchestrators/generation-orchestrator.ts` - Section generator coordinator
- `docs/PHASE5_IMPLEMENTATION.md` - Phase 5 documentation

**Phase 6 - Documentation and Comprehensive Tests:**
- `docs/PROVIDERS.md` - Complete provider implementation guide
- `docs/AGENT.md` - Updated with research agents and section generators
- `__tests__/lib/providers/gemini-provider.test.ts` - Provider tests
- `__tests__/lib/providers/provider-chain.test.ts` - Fallback chain tests
- `__tests__/agent/agents/parser-agent.test.ts` - Parser agent tests
- `__tests__/agent/patterns/ensemble-merger.test.ts` - Ensemble merger tests
- `__tests__/agent/agents/generators/market-section-generator.test.ts` - Section generator tests
- All 178 tests passing

## Quick Start

### Using the Multi-Agent System

```typescript
import { MRDOrchestratorAgent } from '@/agent/orchestrators/mrd-orchestrator';
import { createExecutionContext } from '@/agent/core/execution-context';
import { loadAgentConfig } from '@/agent/core/config-loader';

// Load configuration
const config = await loadAgentConfig();

// Create execution context
const context = createExecutionContext({
  requestId: 'req-123',
  config,
});

// Create orchestrator
const orchestrator = new MRDOrchestratorAgent();

// Execute workflow
const result = await orchestrator.execute(
  {
    productConcept: 'AI-powered smart thermostat',
    targetMarket: 'Residential homeowners',
    additionalDetails: 'Focus on energy savings',
  },
  context
);

if (result.success) {
  console.log('MRD generated:', result.data.mrd);
}
```

### Using Research Agents

```typescript
import { ResearchOrchestratorAgent } from '@/agent/orchestrators/research-orchestrator';
import { createExecutionContext } from '@/agent/core/execution-context';

const orchestrator = new ResearchOrchestratorAgent();

const result = await orchestrator.execute(
  {
    productConcept: 'Smart thermostat',
    targetMarket: 'Residential homeowners',
    clarifications: [],
  },
  context
);

// Access consolidated research
console.log('Competitors:', result.data.research.competitive);
console.log('Trends:', result.data.research.trends);
console.log('Pricing:', result.data.research.pricing);
console.log('Sources:', result.data.sources);
```

### Using Provider Chain

```typescript
import { getProviderChain } from '@/lib/providers/provider-chain';

const chain = getProviderChain();

// Execute with automatic fallback
const { result, providerUsed } = await chain.executeWithFallback(
  async (provider) => {
    return await provider.generateText(
      'Analyze the smart home market',
      'You are a market research analyst'
    );
  }
);

console.log('Used provider:', providerUsed);
console.log('Result:', result.text);
```

## Current Development

### Brief Helper (feature/brief-helper - IN PROGRESS)

**Purpose:** Quick 6-field capture tool for products past the research phase.

**Status:** Phase 1 Task 1 complete (project setup, design tokens)

**Implementation Plan:** `docs/plans/2026-02-11-simplified-brief-helper-implementation-plan.md`

**Key Documents:**
- PRD: `docs/plans/2026-02-11-simplified-brief-helper-PRD.md`
- Design System: `docs/plans/2026-02-11-simplified-brief-helper-design-system.md`
- Executive Brief: `docs/plans/2026-02-11-simplified-brief-helper-brief.md`

**6 Fields:**
1. What - Product description
2. Who - Target users/customers
3. Where - Use environment
4. MOQ - Minimum order quantity
5. Must-Have Features - Non-negotiable requirements
6. Nice-to-Have Features - Optional enhancements

**Design Tokens:** `styles/tokens/brief-helper.css` (311 lines, 8 component token sets, light/dark mode)

**Workflow:**
- User types → 2-3 sec pause → AI extracts structured bullet points
- Gap detection suggests missing info (e.g., "tablet stand" → placement, sizes, VESA)
- AI expansion chat for refinement
- Generate simplified brief (Markdown/HTML)

**Storage Strategy:**
- Redis: Hot cache for active sessions
- SQLite: Persistent knowledge base (learns patterns)
- Google Drive: Completed briefs (OAuth integration)

**Next Tasks:** State management (Task 2), SmartTextBox component (Task 3), page layout (Task 4)

---

## Documentation

- `docs/AGENT.md` - Agent behavioral contracts and patterns
- `docs/PROVIDERS.md` - AI provider implementation guide
- `docs/DESIGN_GUIDE.md` - Architecture principles
- `docs/PHASE_4_RESEARCH_AGENTS.md` - Research agents documentation
- `docs/PHASE5_IMPLEMENTATION.md` - Section generators and ensemble voting
- `references/README.md` - Pipeline stage documentation
