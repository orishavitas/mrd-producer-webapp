# Phase 4: Parallel Research Agents - Implementation Guide

## Overview

Phase 4 implements a parallel research agent system that conducts comprehensive market research using web search grounding. The system consists of three specialized research agents that execute concurrently, gathering competitive intelligence, market trends, and pricing data.

## Architecture

### Components

```
agent/
├── agents/research/
│   ├── base-researcher.ts           # Abstract base class for all researchers
│   ├── competitor-researcher.ts     # Competitive analysis
│   ├── trend-researcher.ts          # Market trends & technology evolution
│   ├── pricing-researcher.ts        # Pricing strategy & cost analysis
│   └── index.ts                     # Exports for convenient imports
├── patterns/
│   └── parallel-executor.ts         # Generic parallel execution utility
└── orchestrators/
    └── research-orchestrator.ts     # Coordinates parallel research
```

## Research Agents

### 1. Base Researcher (`base-researcher.ts`)

**Purpose:** Abstract base class providing common research functionality.

**Key Features:**
- Validates research input (product concept, target market)
- Requires `searchGrounding` capability from AI provider
- Builds research prompts with focus areas
- Parses AI responses with source citations
- Assesses research quality and confidence
- Extracts structured data from grounded search results

**Methods:**
```typescript
// Abstract - must be implemented by subclasses
protected abstract buildResearchPrompt(input: ResearchInput): string;
protected abstract parseResearchData(text: string, sources: GroundedSource[]): T;
protected abstract assessQuality(data: T, sources: GroundedSource[]): QualityAssessment;

// Helper utilities
protected buildSystemPrompt(): string;
protected extractSourcesFromText(text: string): GroundedSource[];
protected parseJsonFromText<T>(text: string): T | null;
protected calculateConfidence(...): number;
```

**Input Schema:**
```typescript
interface ResearchInput {
  productConcept: string;        // Required
  targetMarket: string;          // Required
  additionalContext?: string;    // Optional
  guidingQueries?: string[];     // Optional
}
```

**Output Schema:**
```typescript
interface ResearchOutput<T> {
  researchId: string;
  conductedAt: string;
  researchType: string;
  data: T;                       // Agent-specific structured data
  sources: GroundedSource[];     // Citations from web search
  searchQueries: string[];       // Queries used
  quality: {
    confidence: number;          // 0-1
    meetsMinimum: boolean;
    gaps: string[];
  };
}
```

### 2. Competitor Researcher (`competitor-researcher.ts`)

**Purpose:** Identifies competitor products, analyzes pricing, features, and market positioning.

**Focus Areas:**
- Pricing strategies
- Product features and specifications
- Market positioning (premium, mid-range, budget)
- Competitive strengths and weaknesses

**Requirements:**
- Minimum 3 competitors
- Pricing data for at least some competitors
- Feature analysis for majority of competitors
- Strengths/weaknesses assessment

**Output Data Structure:**
```typescript
interface CompetitorResearchData {
  competitors: CompetitorInfo[];          // Array of competitor products
  marketOverview: {
    totalCompetitors: number;
    priceRange?: { min, max, median };
    commonFeatures: string[];
    marketGaps: string[];
  };
  positioning: {
    premiumTier: string[];
    midRangeTier: string[];
    budgetTier: string[];
    differentiationOpportunities: string[];
  };
  threats: string[];
  rawAnalysis: string;
}
```

**Example Usage:**
```typescript
const agent = new CompetitorResearcherAgent();
const result = await agent.execute({
  productConcept: "iPad mount for retail checkout",
  targetMarket: "Retail",
}, context);

if (result.success) {
  const data = result.data.data;
  console.log(`Found ${data.competitors.length} competitors`);
  console.log(`Price range: $${data.marketOverview.priceRange?.min}-$${data.marketOverview.priceRange?.max}`);
}
```

### 3. Trend Researcher (`trend-researcher.ts`)

**Purpose:** Analyzes market trends, technology evolution, regulatory changes, and consumer behavior.

**Focus Areas:**
- Market trends (emerging, growing, mature, declining)
- Technology evolution and adoption
- Regulatory changes and compliance requirements
- Consumer behavior shifts and preferences

**Requirements:**
- Minimum 3 market trends
- Supporting evidence for trends
- Technology evolution insights
- Strategic recommendations (opportunities, risks, innovation areas)

**Output Data Structure:**
```typescript
interface TrendResearchData {
  marketTrends: MarketTrend[];               // Current/emerging trends
  technologyEvolution: TechnologyEvolution[]; // Tech trajectory
  regulatoryChanges: RegulatoryChange[];     // Compliance requirements
  consumerBehavior: ConsumerBehavior[];      // Behavioral insights
  strategicRecommendations: {
    opportunities: string[];
    risks: string[];
    innovationAreas: string[];
  };
  rawAnalysis: string;
}
```

**Example Usage:**
```typescript
const agent = new TrendResearcherAgent();
const result = await agent.execute({
  productConcept: "Wireless charging station",
  targetMarket: "Corporate",
}, context);

if (result.success) {
  const data = result.data.data;
  console.log(`Identified ${data.marketTrends.length} market trends`);
  console.log(`Strategic opportunities:`, data.strategicRecommendations.opportunities);
}
```

### 4. Pricing Researcher (`pricing-researcher.ts`)

**Purpose:** Researches pricing models, cost structures, margins, and competitive pricing.

**Focus Areas:**
- Pricing models (tiered, subscription, one-time, freemium)
- Cost structures and components
- Margin analysis and profitability
- Competitive pricing benchmarks

**Requirements:**
- Minimum 2 pricing models
- Cost structure analysis
- Margin analysis data
- Competitive pricing benchmarks
- Pricing recommendations

**Output Data Structure:**
```typescript
interface PricingResearchData {
  pricingModels: PricingModel[];             // Available pricing models
  costStructure: {
    components: CostComponent[];
    totalCostRange?: { min, max };
    costDrivers: string[];
  };
  marginAnalysis: MarginAnalysis;            // Profitability metrics
  competitivePricing: {
    benchmarks: CompetitivePricingBenchmark[];
    marketPriceRange?: { min, max, median };
  };
  valuePricing: {
    insights: ValueBasedPricingInsight[];
    priceElasticity?: string;
  };
  recommendations: {
    recommendedModel: string;
    recommendedRange?: { min, max, target };
    strategy: string;
    considerations: string[];
  };
  rawAnalysis: string;
}
```

**Example Usage:**
```typescript
const agent = new PricingResearcherAgent();
const result = await agent.execute({
  productConcept: "Smart lock system",
  targetMarket: "Hospitality",
}, context);

if (result.success) {
  const data = result.data.data;
  console.log(`Recommended model: ${data.recommendations.recommendedModel}`);
  console.log(`Target price: $${data.recommendations.recommendedRange?.target}`);
}
```

## Parallel Execution Pattern

### Parallel Executor (`parallel-executor.ts`)

**Purpose:** Generic utility for executing multiple agents concurrently with advanced control.

**Features:**
- Configurable concurrency limits
- Fail-fast or graceful degradation
- Timeout handling
- Progress tracking callbacks
- Partial result collection
- Error handling per agent

**Options:**
```typescript
interface ParallelExecutionOptions {
  maxConcurrency?: number;        // Default: unlimited
  failFast?: boolean;             // Default: false (collect all results)
  timeout?: number;               // Default: 300000ms (5 minutes)
  minSuccessful?: number;         // Default: undefined (no minimum)
  onProgress?: (completed, total, agentId) => void;
  onError?: (agentId, error) => void;
}
```

**Usage:**
```typescript
const result = await ParallelExecutor.execute(
  [agent1, agent2, agent3],
  [input1, input2, input3],
  context,
  {
    maxConcurrency: 3,
    failFast: false,
    timeout: 180000,  // 3 minutes
    onProgress: (completed, total, agentId) => {
      console.log(`Progress: ${completed}/${total} - ${agentId} completed`);
    },
  }
);

console.log(`Success: ${result.summary.successful}/${result.summary.total}`);
```

## Research Orchestrator

### Research Orchestrator (`research-orchestrator.ts`)

**Purpose:** Coordinates parallel execution of all research agents and merges results.

**Responsibilities:**
1. Execute all three research agents in parallel
2. Handle partial failures gracefully
3. Merge and deduplicate sources
4. Consolidate search queries
5. Assess overall research quality
6. Track execution metadata

**Configuration:**
```yaml
# config/agents/default.yaml
agents:
  - id: research-orchestrator
    config:
      maxConcurrency: 3      # Run all three in parallel
      minSuccessful: 1       # At least one must succeed
```

**Output Schema:**
```typescript
interface ResearchOrchestratorOutput {
  researchId: string;
  conductedAt: string;
  research: {
    competitive: CompetitorResearchData | null;
    trends: TrendResearchData | null;
    pricing: PricingResearchData | null;
  };
  sources: GroundedSource[];        // Deduplicated
  searchQueries: string[];          // Combined
  quality: {
    confidence: number;             // Overall (0-1)
    meetsMinimum: boolean;
    individual: {
      competitive?: number;
      trends?: number;
      pricing?: number;
    };
    gaps: string[];
  };
  execution: {
    successful: string[];           // e.g., ['competitor', 'pricing']
    failed: string[];               // e.g., ['trend']
    executionTimeMs: number;
  };
}
```

**Example Usage:**
```typescript
const orchestrator = new ResearchOrchestratorAgent();
const result = await orchestrator.execute({
  productConcept: "Tablet security enclosure",
  targetMarket: "Retail",
}, context);

if (result.success) {
  const output = result.data;

  console.log(`Research ID: ${output.researchId}`);
  console.log(`Overall confidence: ${output.quality.confidence}`);
  console.log(`Successful: ${output.execution.successful.join(', ')}`);
  console.log(`Sources found: ${output.sources.length}`);

  if (output.research.competitive) {
    console.log(`Competitors: ${output.research.competitive.competitors.length}`);
  }

  if (output.research.trends) {
    console.log(`Trends: ${output.research.trends.marketTrends.length}`);
  }

  if (output.research.pricing) {
    console.log(`Target price: $${output.research.pricing.recommendations.recommendedRange?.target}`);
  }
}
```

## Integration with MRD Orchestrator

The Research Orchestrator integrates into the main MRD generation workflow:

```typescript
// In mrd-orchestrator.ts (future integration)
const researchOrchestrator = new ResearchOrchestratorAgent();

const researchResult = await researchOrchestrator.execute({
  productConcept: requestData.rawInput.productConcept,
  targetMarket: requestData.rawInput.targetMarket,
  additionalContext: requestData.rawInput.additionalDetails,
}, context);

if (researchResult.success) {
  // Pass research data to MRD generator
  const researchFindings = convertToResearchSources(researchResult.data);
  // Continue with MRD generation...
}
```

## Quality Assessment

### Confidence Scoring

Each research agent calculates a confidence score (0-1) based on:
1. **Source Count** (up to 0.5): Ratio of sources found to minimum required
2. **Quantitative Data** (0.25): Presence of concrete numbers/statistics
3. **Recency** (0.25): Current, up-to-date information

### Minimum Requirements

Research quality gates:
- **Competitor**: ≥3 competitors, pricing data, feature analysis
- **Trend**: ≥3 trends, supporting evidence, strategic insights
- **Pricing**: ≥2 pricing models, cost/margin data, benchmarks

### Overall Quality

Research Orchestrator calculates overall quality:
- **Confidence**: Weighted average of individual confidences
- **Meets Minimum**: At least one research type successful and meets requirements
- **Gaps**: Aggregated list of all gaps/limitations across research types

## Configuration

### Agent Configuration (`config/agents/default.yaml`)

```yaml
agents:
  - id: competitor-researcher
    type: researcher
    config:
      focusAreas:
        - pricing
        - features
        - market_position
        - strengths_weaknesses
      requireSearchGrounding: true
      minCompetitors: 3

  - id: trend-researcher
    type: researcher
    config:
      focusAreas:
        - market_trends
        - technology_evolution
        - regulatory_changes
        - consumer_behavior
      requireSearchGrounding: true

  - id: pricing-researcher
    type: researcher
    config:
      focusAreas:
        - pricing_models
        - cost_structures
        - margin_analysis
        - competitive_pricing
      requireSearchGrounding: true

  - id: research-orchestrator
    type: orchestrator
    config:
      parallelExecution: true
      maxConcurrency: 3
      failFast: false

patterns:
  research:
    type: parallel
    maxConcurrency: 3
    failFast: false
    timeout: 120000  # 2 minutes

features:
  parallelResearch: true
```

## Error Handling

### Graceful Degradation

The system handles partial failures gracefully:
1. Each research agent can fail independently
2. Orchestrator collects all results (success + failure)
3. Proceeds if minimum requirements met (≥1 successful)
4. Reports gaps for failed research types

**Example:**
```typescript
// Even if trend research fails, proceed with competitor + pricing
if (result.execution.successful.length >= 1) {
  console.log('Proceeding with partial research results');
  console.log('Available:', result.execution.successful);
  console.log('Gaps:', result.quality.gaps);
}
```

### Provider Fallback

If a provider lacks `searchGrounding`:
- Research agents will throw descriptive error
- Base agent fallback mechanism can try alternative provider
- If no provider supports search, research stage fails

## Testing

### Unit Tests (Future)

```typescript
// __tests__/agent/agents/research/competitor-researcher.test.ts
describe('CompetitorResearcherAgent', () => {
  it('should find minimum 3 competitors', async () => {
    const agent = new CompetitorResearcherAgent();
    const result = await agent.execute(mockInput, mockContext);
    expect(result.data.data.competitors.length).toBeGreaterThanOrEqual(3);
  });
});
```

### Integration Tests (Future)

```typescript
// __tests__/agent/orchestrators/research-orchestrator.test.ts
describe('ResearchOrchestratorAgent', () => {
  it('should execute all research agents in parallel', async () => {
    const orchestrator = new ResearchOrchestratorAgent();
    const result = await orchestrator.execute(mockInput, mockContext);
    expect(result.execution.successful.length).toBeGreaterThan(0);
  });
});
```

## Usage Example: End-to-End

```typescript
import { ResearchOrchestratorAgent } from '@/agent/orchestrators/research-orchestrator';
import { createExecutionContext } from '@/agent/core/execution-context';

// Create execution context
const context = createExecutionContext({
  requestId: 'MRD-20260207-1234',
  config: {
    maxRetries: 3,
    timeoutMs: 180000,
    enableFallback: true,
  },
});

// Execute research
const orchestrator = new ResearchOrchestratorAgent();
const result = await orchestrator.execute({
  productConcept: "Universal tablet mount with security lock for retail checkout counters",
  targetMarket: "Retail",
  additionalContext: "Focus on payment processing and high-traffic environments",
}, context);

// Process results
if (result.success) {
  const { research, sources, quality } = result.data;

  console.log(`\n=== Research Results ===`);
  console.log(`Confidence: ${(quality.confidence * 100).toFixed(1)}%`);
  console.log(`Sources: ${sources.length}`);

  if (research.competitive) {
    console.log(`\n--- Competitive Analysis ---`);
    console.log(`Competitors: ${research.competitive.competitors.length}`);
    console.log(`Price Range: $${research.competitive.marketOverview.priceRange?.min}-$${research.competitive.marketOverview.priceRange?.max}`);
    console.log(`Market Gaps:`, research.competitive.marketOverview.marketGaps);
  }

  if (research.trends) {
    console.log(`\n--- Market Trends ---`);
    research.trends.marketTrends.forEach(trend => {
      console.log(`- ${trend.name} (${trend.stage}, ${trend.impact} impact)`);
    });
  }

  if (research.pricing) {
    console.log(`\n--- Pricing Strategy ---`);
    console.log(`Recommended Model: ${research.pricing.recommendations.recommendedModel}`);
    console.log(`Target Price: $${research.pricing.recommendations.recommendedRange?.target}`);
  }

  if (quality.gaps.length > 0) {
    console.log(`\n--- Limitations ---`);
    quality.gaps.forEach(gap => console.log(`- ${gap}`));
  }
} else {
  console.error('Research failed:', result.error);
}
```

## Next Steps

### Phase 5: Section Specialists (Planned)
- Market section generator
- Technical section generator
- Strategy section generator
- Ensemble voting for quality

### Phase 6: Documentation & Testing (Planned)
- Comprehensive unit tests
- Integration tests
- E2E workflow tests
- Updated architecture documentation

## References

- Base Agent: `C:\users\orishavit\documents\github\mrd-producer-webapp\agent\core\base-agent.ts`
- Types: `C:\users\orishavit\documents\github\mrd-producer-webapp\agent\core\types.ts`
- Provider Types: `C:\users\orishavit\documents\github\mrd-producer-webapp\lib\providers\types.ts`
- Configuration: `C:\users\orishavit\documents\github\mrd-producer-webapp\config\agents\default.yaml`
