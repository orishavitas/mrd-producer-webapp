# Agents Directory

This directory contains specialized agents for the MRD Producer multi-agent system.

## Structure

```
agents/
├── generators/        # Section-specific MRD generators (Phase 5)
│   ├── base-section-generator.ts
│   ├── market-section-generator.ts
│   ├── technical-section-generator.ts
│   ├── strategy-section-generator.ts
│   └── index.ts
├── reviewers/         # Quality and ensemble review agents (Phase 5)
│   ├── quality-reviewer.ts
│   ├── ensemble-reviewer.ts
│   └── index.ts
├── research/          # Research agents (placeholder for Phase 4)
├── parser-agent.ts    # Request parsing (Phase 2)
├── gap-analyzer-agent.ts  # Gap detection and clarification (Phase 2)
└── mrd-generator-agent.ts # Monolithic MRD generator (Phase 2, legacy)
```

## Agent Categories

### Core Agents (Phase 2)

**ParserAgent**
- Extracts structured data from raw user input
- Identifies product category, technical requirements, pricing
- Flags scope concerns and initial gaps

**GapAnalyzerAgent**
- Analyzes extracted data for missing information
- Generates clarification questions
- Decides workflow path: clarify, proceed, or escalate

**MRDGeneratorAgent**
- Monolithic MRD generation agent
- Generates all 12 sections in a single pass
- Maintained for backward compatibility

### Section Generators (Phase 5)

**MarketSectionGenerator** (Domain: market)
- Sections 1-4: Purpose & Vision, Problem Statement, Target Market & Use Cases, Target Users
- Specializes in market analysis and user personas
- Confidence: 70-85% (template fallback)

**TechnicalSectionGenerator** (Domain: technical)
- Sections 5-7: Product Description, Key Requirements, Design & Aesthetics
- Specializes in technical specifications and requirements engineering
- Confidence: 70-80% (template fallback)

**StrategySectionGenerator** (Domain: strategy)
- Sections 8-12: Target Price, Risks, Competition, Additional Considerations, Success Criteria
- Specializes in business strategy and competitive analysis
- Confidence: 60-80% (template fallback)

### Reviewers (Phase 5)

**QualityReviewer**
- Assesses MRD quality across 5 dimensions
- Returns scores, issues, and improvement suggestions
- Passing threshold: 70/100

**EnsembleReviewer**
- Coordinates multiple generation attempts
- Implements voting strategies for section selection
- Future enhancement: true multi-generation ensemble

## Usage Patterns

### Using Section Generators

```typescript
import { GenerationOrchestrator } from '@/agent/orchestrators/generation-orchestrator';

const orchestrator = new GenerationOrchestrator();
const result = await orchestrator.execute(input, context);
// Coordinates all three section generators in parallel or sequential mode
```

### Using Quality Review

```typescript
import { QualityReviewer } from '@/agent/agents/reviewers';

const reviewer = new QualityReviewer();
const result = await reviewer.execute({
  mrdContent: '...',
  sources: [...],
  requestId: 'MRD-001',
}, context);

console.log(result.data.overallScore); // 0-100
console.log(result.data.passed); // true/false
```

### Using Legacy MRD Generator

```typescript
import { MRDGeneratorAgent } from '@/agent/agents/mrd-generator-agent';

const generator = new MRDGeneratorAgent();
const result = await generator.execute({
  productConcept: '...',
  targetMarket: '...',
  researchFindings: [...],
  requestId: 'MRD-001',
}, context);
```

## Development Guidelines

### Creating New Agents

1. Extend `BaseAgent<TInput, TOutput>` from `@/agent/core/base-agent`
2. Implement required properties: `id`, `name`, `version`, `description`
3. Implement `executeCore(input, context)` method
4. Override `validateInput(input)` for input validation
5. Add appropriate `requiredCapabilities` if using AI providers

### Testing Agents

- Create tests in `__tests__/agent/agents/`
- Use `createMockExecutionContext()` from `@/__tests__/mocks/agent-mocks`
- Test both success and failure cases
- Validate input/output schemas
- Check logging and error handling

### Agent Responsibilities

**DO:**
- Focus on single responsibility
- Log important events and metrics
- Handle errors gracefully
- Validate inputs thoroughly
- Return structured outputs

**DON'T:**
- Mix concerns (parsing + generation, etc.)
- Swallow errors silently
- Return unstructured strings (use typed interfaces)
- Skip input validation
- Make assumptions about provider availability

## See Also

- `agent/core/` - Base classes and types
- `agent/orchestrators/` - Workflow coordination agents
- `agent/patterns/` - Reusable patterns (ensemble merger, etc.)
- `docs/AGENT.md` - Agent behavioral contracts
- `docs/PHASE5_IMPLEMENTATION.md` - Phase 5 documentation
