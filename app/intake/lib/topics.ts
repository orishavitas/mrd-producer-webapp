export const TOPICS = [
  { id: 'problem-vision', name: 'Problem & Vision', weight: 0.20 },
  { id: 'market-users', name: 'Market & Users', weight: 0.20 },
  { id: 'product-definition', name: 'Product Definition', weight: 0.20 },
  { id: 'design-experience', name: 'Design & Experience', weight: 0.10 },
  { id: 'business-pricing', name: 'Business & Pricing', weight: 0.15 },
  { id: 'competitive-landscape', name: 'Competitive Landscape', weight: 0.15 },
] as const;

export type TopicId = typeof TOPICS[number]['id'];
export type Topic = typeof TOPICS[number];
