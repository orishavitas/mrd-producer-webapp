export const TOPICS = [
  { id: 'problem-market', name: 'Problem & Market', weight: 0.35 },
  { id: 'product-spec', name: 'Product Specification', weight: 0.30 },
  { id: 'business-pricing', name: 'Business & Pricing', weight: 0.20 },
  { id: 'differentiation', name: 'Differentiation', weight: 0.15 },
] as const;

export type TopicId = typeof TOPICS[number]['id'];
export type Topic = typeof TOPICS[number];
