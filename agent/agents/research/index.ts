/**
 * Research Agents Index
 *
 * Export all research agents and related types for convenient imports.
 */

// Base researcher
export {
  BaseResearcherAgent,
  type ResearchInput,
  type ResearchOutput,
} from './base-researcher';

// Competitor researcher
export {
  CompetitorResearcherAgent,
  type CompetitorInfo,
  type CompetitorResearchData,
} from './competitor-researcher';

// Trend researcher
export {
  TrendResearcherAgent,
  type MarketTrend,
  type TechnologyEvolution,
  type RegulatoryChange,
  type ConsumerBehavior,
  type TrendResearchData,
} from './trend-researcher';

// Pricing researcher
export {
  PricingResearcherAgent,
  type PricingModel,
  type CostComponent,
  type MarginAnalysis,
  type CompetitivePricingBenchmark,
  type ValueBasedPricingInsight,
  type PricingResearchData,
} from './pricing-researcher';
