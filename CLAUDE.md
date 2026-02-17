# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MRD Producer is a Next.js web application with four complementary features:

1. **Main MRD Producer** (`/`) - Generates full 12-section Market Requirements Documents with AI-powered competitive research via Gemini's Google Search grounding. For new product concepts needing market validation.

2. **Progressive Intake** (`/intake`) - 4-topic structured intake flow for stand/enclosure products. Guides users through sequential topic approval with live research preview. (feature/progressive-intake branch)

3. **Brief Helper** (`/brief-helper`) - Quick 6-field capture tool for products past the research phase. Uses AI to extract structured data, detect gaps, and generate simplified briefs. (feature/brief-helper branch - Phases 1, 7-9, 13 complete; Phases 10-12 pending)

4. **MRD Chat Generator** (`/mrd-generator`) - Conversational MRD creation with batch extraction of all 12 sections from product concept. Chat-based refinement with live preview and DOCX export. (feature/mrd-generator branch - ALL 4 PHASES COMPLETE)

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
├── brief-helper/       # Quick 6-field simplified brief (Phases 1, 7-9, 13 complete)
├── mrd-generator/      # MRD Chat Generator (ALL 4 PHASES COMPLETE)
│   ├── components/     # StartPage, ChatInterface, ProgressSidebar, SectionPreview, LoadingOverlay
│   └── lib/            # mrd-state, mrd-context, section-definitions
├── api/
│   ├── generate/       # Main MRD generation endpoint
│   ├── download/       # Document export (DOCX, HTML, PDF)
│   ├── intake/         # Intake flow endpoints
│   ├── brief/          # Brief Helper endpoints (Phases 1, 7-9, 13 complete)
│   ├── mrd/            # MRD Chat Generator endpoints (ALL COMPLETE)
│   │   ├── batch-extract/ # Batch MRD extraction
│   │   ├── chat/       # Conversational refinement
│   │   └── export/     # DOCX export
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
│   ├── brief/          # Brief Helper agents (feature/brief-helper)
│   │   ├── types.ts    # Brief Helper types
│   │   ├── text-extraction-agent.ts  # Extract structured data from free text
│   │   ├── gap-detection-agent.ts    # Identify missing information
│   │   ├── expansion-agent.ts        # AI-powered text expansion
│   │   ├── brief-generator-agent.ts  # Generate simplified briefs
│   │   └── knowledge-base-agent.ts   # Learn patterns over time
│   └── mrd/            # MRD Chat Generator agents (ALL COMPLETE - feature/mrd-generator)
│       ├── types.ts    # MRD Chat Generator types
│       ├── batch-mrd-agent.ts  # Batch extraction of all 12 sections
│       ├── mrd-chat-agent.ts   # Conversational section refinement
│       └── mrd-gap-agent.ts    # AI-based gap detection
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
├── mrd/                # MRD Chat Generator utilities (ALL COMPLETE)
│   └── section-definitions.ts # YAML loader for mrd-doc-params.yaml
├── gemini.ts           # Legacy Gemini client (preserved)
├── document-generator.ts    # DOCX/HTML generation
├── sanitize.ts         # Input sanitization
└── schemas.ts          # TypeScript interfaces

skills/                 # Atomic capabilities (pure functions)
├── mrd_generator.ts    # MRD generation with 12-section template
├── gap_analyzer.ts     # Information gap detection
└── web_search.ts       # Legacy search (deprecated)

config/
├── agents/
│   └── default.yaml    # Agent configuration
└── mrd-doc-params.yaml # MRD section definitions (600+ lines)

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

### MRD Chat Generator (feature/mrd-generator - ALL PHASES COMPLETE ✅)

**Phase 1 - YAML Config & State Foundation:**
- `config/mrd-doc-params.yaml` - All 12 MRD section definitions (600+ lines)
- `lib/mrd/section-definitions.ts` - Server-side YAML loader with validation (173 lines)
- `app/mrd-generator/lib/mrd-state.ts` - State management with 13 reducer actions (309 lines)
- `app/mrd-generator/lib/mrd-context.tsx` - React Context with sessionStorage persistence (115 lines)
- Tests: 55 passing

**Phase 2 - AI Agents:**
- `agent/agents/mrd/batch-mrd-agent.ts` - Batch extraction for all 12 sections (179 lines, temp 0.3)
- `agent/agents/mrd/mrd-chat-agent.ts` - Conversational refinement (154 lines, temp 0.6)
- `agent/agents/mrd/mrd-gap-agent.ts` - AI-based gap detection using YAML rules (107 lines, temp 0.2)
- Tests: 148 (108 passing, 40 skipped AI-dependent)

**Phase 3 - API Endpoints:**
- `app/api/mrd/batch-extract/route.ts` - Batch extraction (202 lines)
- `app/api/mrd/chat/route.ts` - Conversational refinement (272 lines)
- `app/api/mrd/export/route.ts` - DOCX export (239 lines)
- Tests: 73 passing

**Phase 4 - UI Components:**
- `app/mrd-generator/components/StartPage.tsx` - Character-graded input
- `app/mrd-generator/components/ChatInterface.tsx` - Multi-turn chat
- `app/mrd-generator/components/ProgressSidebar.tsx` - 12-section tracker
- `app/mrd-generator/components/SectionPreview.tsx` - Live markdown preview with amber highlights
- `app/mrd-generator/components/LoadingOverlay.tsx` - Batch progress checklist
- `app/mrd-generator/page.tsx` - Main integration page
- Tests: 152 (113 passing, 39 API-dependent)

**Total: 428 tests, 349 passing (82%), ~13,500 lines production code, zero TypeScript errors**

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

### MRD Chat Generator (feature/mrd-generator - ALL 4 PHASES COMPLETE ✅)

**Purpose:** Conversational MRD creation - user describes product concept, AI extracts all 12 MRD sections in one batch call, then chat-based refinement with live preview and DOCX export.

**Status:** Phases 1-4 complete (Feb 16, 2026). **Production ready.** 428 tests, 349 passing (82%).

**User Flow:**
1. Start page → Enter product concept (200+ chars recommended)
2. Batch extraction → Single AI call populates all 12 sections (progress checklist)
3. Split screen → Chat left, section preview right with amber highlights for gaps
4. Refine via chat → AI suggests content per section
5. Export → Template-compliant DOCX download

**Key Files:**
- `config/mrd-doc-params.yaml` - All 12 section definitions (prompts, gap rules)
- `app/mrd-generator/` - UI components + page
- `agent/agents/mrd/` - BatchMRDAgent, MRDChatAgent, MRDGapAgent
- `app/api/mrd/` - batch-extract, chat, export endpoints
- `lib/mrd/section-definitions.ts` - Server-side YAML loader (do NOT import in client components)

**Completion docs:** `docs/testing/2026-02-16-mrd-generator-phase-{1,2,3,4}-completion.md`

---

### Brief Helper V2 (feature/brief-helper - PHASES 1, 7-9 & 13 COMPLETE)

**Purpose:** Quick 6-field (What/Who/Where/MOQ/Must-Haves/Nice-to-Haves) capture tool with AI batch extraction and split-screen interface.

**Status:** Phases 1, 7-9, 13 complete (Feb 15, 2026). Phases 10-12 (UI components) pending.

**What's done:** Text extraction, gap detection, AI expansion agents + batch extract API + state management + tests.

**What's pending (Phases 10-12):**
- Start Page with character grading (50/100/150+ thresholds)
- Split screen: input fields left, AI suggestions/preview right
- Collapsible fields ("Done" → 80px summary card)
- Live document preview

**V2 Documentation:**
- Design: `docs/plans/2026-02-12-brief-helper-v2-design.md`
- Execution Plan: `docs/plans/2026-02-12-brief-helper-v2-execution.md`

**Next Steps:** Implement Phases 10-12 (V2 UI components)

---

## Documentation

- `docs/AGENT.md` - Agent behavioral contracts and patterns
- `docs/PROVIDERS.md` - AI provider implementation guide
- `docs/DESIGN_GUIDE.md` - Architecture principles
- `docs/PHASE_4_RESEARCH_AGENTS.md` - Research agents documentation
- `docs/PHASE5_IMPLEMENTATION.md` - Section generators and ensemble voting
- `references/README.md` - Pipeline stage documentation
- `docs/testing/2026-02-16-mrd-generator-phase-{1,2,3,4}-completion.md` - MRD Generator completion reports
