/**
 * Research Mapper
 *
 * Transforms intake topic data into ResearchInput format for the ResearchOrchestratorAgent.
 * Maps the 4-topic intake structure to the research agent's expected input schema.
 */

import type { TopicData } from './intake-state';
import type { ResearchInput } from '@/agent/agents/research/base-researcher';

/**
 * Transform intake topics into ResearchInput for the research agents.
 *
 * Mapping strategy:
 * - productConcept: Topic 2 (product-spec) - mustHaveFeatures + productCategory + formFactor
 * - targetMarket: Topic 1 (problem-market) - marketSegment + geography + userRoles
 * - guidingQueries: Topic 4 (differentiation) - selected competitors
 * - additionalContext: Topic 1 problemDescription + Topic 3 priceRange + Topic 4 differentiators
 */
export function mapIntakeToResearchInput(topics: TopicData[]): ResearchInput {
  const topic1 = topics.find((t) => t.id === 'problem-market');
  const topic2 = topics.find((t) => t.id === 'product-spec');
  const topic3 = topics.find((t) => t.id === 'business-pricing');
  const topic4 = topics.find((t) => t.id === 'differentiation');

  // Build productConcept from product specification
  const productParts: string[] = [];

  if (topic2?.structuredData.mustHaveFeatures) {
    productParts.push(String(topic2.structuredData.mustHaveFeatures));
  }

  if (topic2?.structuredData.productCategory) {
    const cat = topic2.structuredData.productCategory;
    const categoryStr = Array.isArray(cat) ? cat.join(', ') : String(cat);
    productParts.push(categoryStr);
  }

  if (topic2?.structuredData.formFactor) {
    const ff = topic2.structuredData.formFactor;
    const formFactorStr = Array.isArray(ff) ? ff.join(', ') : String(ff);
    productParts.push(formFactorStr);
  }

  const productConcept = productParts.filter(Boolean).join(' ') || 'stand or enclosure product';

  // Build targetMarket from problem & market
  const marketParts: string[] = [];

  if (topic1?.structuredData.marketSegment) {
    const seg = topic1.structuredData.marketSegment;
    const segmentStr = Array.isArray(seg) ? seg.join(', ') : String(seg);
    marketParts.push(segmentStr);
  }

  if (topic1?.structuredData.geography) {
    const geo = topic1.structuredData.geography;
    const geoStr = Array.isArray(geo) ? geo.join(', ') : String(geo);
    marketParts.push(`geography: ${geoStr}`);
  }

  if (topic1?.structuredData.userRoles) {
    const roles = topic1.structuredData.userRoles;
    const rolesStr = Array.isArray(roles) ? roles.join(', ') : String(roles);
    marketParts.push(`users: ${rolesStr}`);
  }

  const targetMarket = marketParts.filter(Boolean).join(', ') || 'general market';

  // Build guidingQueries from selected competitors
  const guidingQueries: string[] = [];

  // Known competitors (multi-select)
  if (topic4?.structuredData.knownCompetitors) {
    const known = topic4.structuredData.knownCompetitors;
    const knownArray = Array.isArray(known) ? known : [known];
    knownArray.forEach((comp) => {
      guidingQueries.push(`${String(comp)} competitive analysis`);
    });
  }

  // Custom competitors (dynamic-list)
  if (topic4?.structuredData.customCompetitors) {
    const custom = topic4.structuredData.customCompetitors;
    const customArray = Array.isArray(custom) ? custom : [custom];
    customArray.forEach((comp) => {
      if (comp && String(comp).trim()) {
        guidingQueries.push(`${String(comp)} competitive analysis`);
      }
    });
  }

  // Build additionalContext
  const contextParts: string[] = [];

  if (topic1?.freetext.problemDescription) {
    contextParts.push(`Problem: ${topic1.freetext.problemDescription}`);
  }

  if (topic3?.structuredData.priceRange) {
    contextParts.push(`Price range: ${String(topic3.structuredData.priceRange)}`);
  }

  if (topic4?.structuredData.differentiators) {
    const diff = topic4.structuredData.differentiators;
    const diffStr = Array.isArray(diff) ? diff.join(', ') : String(diff);
    contextParts.push(`Differentiators: ${diffStr}`);
  }

  const additionalContext = contextParts.filter(Boolean).join('. ');

  return {
    productConcept,
    targetMarket,
    guidingQueries: guidingQueries.length > 0 ? guidingQueries : undefined,
    additionalContext: additionalContext || undefined,
  };
}

/**
 * Validate that intake data has sufficient information for research.
 * Returns an array of missing requirements.
 */
export function validateResearchReadiness(topics: TopicData[]): string[] {
  const gaps: string[] = [];

  const topic1 = topics.find((t) => t.id === 'problem-market');
  const topic2 = topics.find((t) => t.id === 'product-spec');

  // Must have product concept (from topic 2)
  if (!topic2?.structuredData.mustHaveFeatures) {
    gaps.push('Product specification is incomplete (must-have features required)');
  }

  // Must have target market (from topic 1)
  if (!topic1?.structuredData.marketSegment && !topic1?.structuredData.geography) {
    gaps.push('Market definition is incomplete (segment or geography required)');
  }

  return gaps;
}
