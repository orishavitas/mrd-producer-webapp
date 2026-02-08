// --- Field Definition Types ---

export interface FieldDefinition {
  type: 'chips' | 'select' | 'multi-select' | 'text' | 'freetext' | 'dynamic-list';
  id: string;          // field key in structuredData or freetext
  label: string;
  options?: string[];        // for chips, select, multi-select
  allowCustom?: boolean;     // for chips with custom values
  placeholder?: string;      // for text/freetext inputs
  rows?: number;             // for freetext textareas
  required?: boolean;
}

export interface TopicDefinition {
  id: string;
  name: string;
  weight: number;
  description: string;       // shown at top of topic card
  fields: FieldDefinition[];
}

// --- Topic Definitions (4-topic structure for stands/enclosures) ---

export const TOPIC_DEFINITIONS: TopicDefinition[] = [
  // 1. Problem & Market
  {
    id: 'problem-market',
    name: 'Problem & Market',
    weight: 0.35,
    description: 'What problem exists in the market? Who are your target customers and where will they use this product?',
    fields: [
      {
        type: 'chips',
        id: 'problemCategories',
        label: 'Problem categories',
        options: ['Efficiency', 'Cost reduction', 'Safety', 'User experience', 'Compliance', 'Market gap'],
      },
      {
        type: 'text',
        id: 'problemDescription',
        label: 'Problem description',
        placeholder: 'What problem are you trying to solve?',
        required: true,
      },
      {
        type: 'freetext',
        id: 'additionalContext',
        label: 'Additional context',
        placeholder: 'Anything else about the problem or market need?',
        rows: 3,
      },
      {
        type: 'chips',
        id: 'marketSegment',
        label: 'Market segment',
        options: ['B2B', 'B2C', 'B2B2C', 'B2G'],
      },
      {
        type: 'multi-select',
        id: 'geography',
        label: 'Target geography',
        options: ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East & Africa', 'Global'],
      },
      {
        type: 'chips',
        id: 'userRoles',
        label: 'User roles',
        options: ['End users', 'IT admins', 'Facility managers', 'C-suite', 'Operations staff'],
        allowCustom: true,
      },
      {
        type: 'text',
        id: 'mainUseCases',
        label: 'Main use cases',
        placeholder: 'What are the primary use cases for this product?',
      },
    ],
  },

  // 2. Product Specification
  {
    id: 'product-spec',
    name: 'Product Specification',
    weight: 0.30,
    description: 'Define the physical product: form, materials, features, and technical requirements.',
    fields: [
      {
        type: 'chips',
        id: 'productCategory',
        label: 'Product category',
        options: ['Kiosk/Display', 'Tablet Mount', 'Floor Stand', 'Wall Mount', 'Desk Mount', 'Enclosure'],
        allowCustom: true,
      },
      {
        type: 'chips',
        id: 'formFactor',
        label: 'Form factor',
        options: ['Desktop', 'Floor-standing', 'Wall-mounted', 'Countertop', 'Mobile/Wheeled'],
      },
      {
        type: 'chips',
        id: 'keyFeatures',
        label: 'Key features',
        options: [],
        allowCustom: true,
        placeholder: 'Add key product features (e.g., "Cable management", "Adjustable height")',
      },
      {
        type: 'text',
        id: 'mustHaveFeatures',
        label: 'Must-have features',
        placeholder: 'What features are absolutely required?',
        required: true,
      },
      {
        type: 'chips',
        id: 'materials',
        label: 'Materials',
        options: ['Aluminum', 'Steel', 'Plastic', 'Glass', 'Carbon fiber'],
        allowCustom: true,
      },
      {
        type: 'chips',
        id: 'colorScheme',
        label: 'Color scheme',
        options: ['Black', 'White', 'Silver', 'Custom branded'],
      },
      {
        type: 'freetext',
        id: 'technicalConstraints',
        label: 'Technical constraints',
        placeholder: 'Any technical requirements, weight limits, mounting specs, or environmental considerations?',
        rows: 3,
      },
      {
        type: 'text',
        id: 'designReferences',
        label: 'Design references',
        placeholder: 'Any design inspirations or reference products?',
      },
    ],
  },

  // 3. Business & Pricing
  {
    id: 'business-pricing',
    name: 'Business & Pricing',
    weight: 0.20,
    description: 'Price positioning, margin expectations, business risks, and go-to-market strategy.',
    fields: [
      {
        type: 'select',
        id: 'priceRange',
        label: 'Price range',
        options: ['Under $100', '$100-$500', '$500-$1,000', '$1,000-$5,000', '$5,000+', 'Not sure yet'],
      },
      {
        type: 'select',
        id: 'marginExpectation',
        label: 'Margin expectation',
        options: ['High margin (>60%)', 'Standard margin (30-60%)', 'Volume/low margin (<30%)', 'Not sure'],
      },
      {
        type: 'text',
        id: 'concerns',
        label: 'Concerns and risks',
        placeholder: 'What are your biggest concerns or risks?',
      },
      {
        type: 'text',
        id: 'goToMarket',
        label: 'Go-to-market',
        placeholder: 'Distribution channels, sales strategy, or go-to-market considerations?',
      },
      {
        type: 'freetext',
        id: 'additionalContext',
        label: 'Additional context',
        placeholder: 'Anything else about pricing, margins, or business strategy?',
        rows: 3,
      },
    ],
  },

  // 4. Differentiation
  {
    id: 'differentiation',
    name: 'Differentiation',
    weight: 0.15,
    description: 'Known competitors and what makes your product different.',
    fields: [
      {
        type: 'multi-select',
        id: 'knownCompetitors',
        label: 'Known competitors',
        options: [
          'Peerless-AV',
          'Chief Manufacturing',
          'Ergotron',
          'Premier Mounts',
          'OmniMount',
          'Bouncepad',
          'CTA Digital',
          'RAM Mounts',
          'Heckler Design',
          'BOSSTAB',
        ],
      },
      {
        type: 'dynamic-list',
        id: 'customCompetitors',
        label: 'Other competitors',
        placeholder: 'Add competitor names not in the list above',
      },
      {
        type: 'chips',
        id: 'differentiators',
        label: 'Differentiators',
        options: ['Price', 'Quality', 'Innovation', 'Customization', 'Lead time', 'Service', 'Design', 'Durability'],
        allowCustom: true,
      },
    ],
  },
];

// --- Lookup helpers ---

const definitionMap = new Map<string, TopicDefinition>(
  TOPIC_DEFINITIONS.map((td) => [td.id, td])
);

export function getTopicDefinition(id: string): TopicDefinition | undefined {
  return definitionMap.get(id);
}

/** Returns true if the field stores its value in freetext rather than structuredData */
export function isFreetextField(field: FieldDefinition): boolean {
  return field.type === 'freetext';
}
