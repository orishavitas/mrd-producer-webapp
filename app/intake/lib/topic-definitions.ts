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

// --- Topic Definitions ---

export const TOPIC_DEFINITIONS: TopicDefinition[] = [
  // 1. Problem & Vision
  {
    id: 'problem-vision',
    name: 'Problem & Vision',
    weight: 0.20,
    description: "What problem exists in the market? Why does it matter? What's the product vision?",
    fields: [
      {
        type: 'chips',
        id: 'problemCategories',
        label: 'Problem categories',
        options: ['Efficiency', 'Cost reduction', 'Safety', 'User experience', 'Compliance', 'Market gap'],
      },
      {
        type: 'select',
        id: 'productType',
        label: 'Product type',
        options: ['Physical product', 'Software', 'SaaS platform', 'Hardware + Software', 'Service'],
      },
      {
        type: 'multi-select',
        id: 'industryVerticals',
        label: 'Industry verticals',
        options: ['Technology', 'Healthcare', 'Retail', 'Hospitality', 'Education', 'Manufacturing', 'Finance', 'Government'],
      },
      {
        type: 'text',
        id: 'problemDescription',
        label: 'Problem description',
        placeholder: 'What problem are you trying to solve?',
        required: true,
      },
      {
        type: 'text',
        id: 'visionStatement',
        label: 'Vision statement',
        placeholder: "What's your vision for this product?",
      },
      {
        type: 'freetext',
        id: 'additionalContext',
        label: 'Additional context',
        placeholder: 'Anything else about the problem or vision?',
        rows: 3,
      },
    ],
  },

  // 2. Market & Users
  {
    id: 'market-users',
    name: 'Market & Users',
    weight: 0.20,
    description: 'Who buys this? Who uses it? Where? What verticals?',
    fields: [
      {
        type: 'chips',
        id: 'marketSegment',
        label: 'Market segment',
        options: ['B2B', 'B2C', 'B2B2C', 'B2G'],
      },
      {
        type: 'select',
        id: 'companySize',
        label: 'Target company size',
        options: ['Startup', 'SMB', 'Mid-market', 'Enterprise', 'All sizes'],
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
        id: 'idealCustomer',
        label: 'Ideal customer',
        placeholder: 'Describe your ideal customer',
      },
      {
        type: 'text',
        id: 'mainUseCases',
        label: 'Main use cases',
        placeholder: 'What are the main use cases?',
      },
      {
        type: 'freetext',
        id: 'additionalContext',
        label: 'Additional context',
        placeholder: 'Anything else about your market or users?',
        rows: 3,
      },
    ],
  },

  // 3. Product Definition
  {
    id: 'product-definition',
    name: 'Product Definition',
    weight: 0.20,
    description: 'What is the product? What does it do? Key specs and features?',
    fields: [
      {
        type: 'select',
        id: 'productCategory',
        label: 'Product category',
        options: ['Kiosk/Display', 'IoT Device', 'Mobile App', 'Web Platform', 'Physical Accessory', 'Security Solution'],
        allowCustom: true,
      },
      {
        type: 'chips',
        id: 'formFactor',
        label: 'Form factor',
        options: ['Desktop', 'Floor-standing', 'Wall-mounted', 'Handheld', 'Wearable', 'Cloud-based'],
      },
      {
        type: 'chips',
        id: 'keyFeatures',
        label: 'Key features',
        options: [],
        allowCustom: true,
      },
      {
        type: 'multi-select',
        id: 'platforms',
        label: 'Platforms',
        options: ['iOS', 'Android', 'Windows', 'macOS', 'Linux', 'Web', 'Embedded'],
      },
      {
        type: 'text',
        id: 'productDescription',
        label: 'Product description',
        placeholder: 'Describe the product in your own words',
        required: true,
      },
      {
        type: 'text',
        id: 'mustHaveFeatures',
        label: 'Must-have features',
        placeholder: 'What are the must-have features?',
      },
      {
        type: 'freetext',
        id: 'technicalConstraints',
        label: 'Technical constraints',
        placeholder: 'Any technical requirements or constraints?',
        rows: 3,
      },
    ],
  },

  // 4. Design & Experience
  {
    id: 'design-experience',
    name: 'Design & Experience',
    weight: 0.10,
    description: 'Look, feel, form factor, design references.',
    fields: [
      {
        type: 'chips',
        id: 'designStyle',
        label: 'Design style',
        options: ['Minimal', 'Industrial', 'Premium', 'Rugged', 'Consumer-friendly', 'Professional'],
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
        type: 'text',
        id: 'designReferences',
        label: 'Design references',
        placeholder: 'Any design references or inspirations?',
      },
      {
        type: 'freetext',
        id: 'additionalContext',
        label: 'Additional context',
        placeholder: 'Anything else about design?',
        rows: 3,
      },
    ],
  },

  // 5. Business & Pricing
  {
    id: 'business-pricing',
    name: 'Business & Pricing',
    weight: 0.15,
    description: 'Price positioning, business model, risks, go-to-market concerns.',
    fields: [
      {
        type: 'select',
        id: 'priceRange',
        label: 'Price range',
        options: ['Under $100', '$100-$500', '$500-$1,000', '$1,000-$5,000', '$5,000+', 'Not sure yet'],
      },
      {
        type: 'chips',
        id: 'businessModel',
        label: 'Business model',
        options: ['One-time purchase', 'Subscription', 'Freemium', 'Licensing', 'Pay-per-use'],
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
        placeholder: 'Any go-to-market considerations?',
      },
      {
        type: 'freetext',
        id: 'additionalContext',
        label: 'Additional context',
        placeholder: 'Anything else about the business side?',
        rows: 3,
      },
    ],
  },

  // 6. Competitive Landscape
  {
    id: 'competitive-landscape',
    name: 'Competitive Landscape',
    weight: 0.15,
    description: 'Known competitors, differentiation, success metrics.',
    fields: [
      {
        type: 'dynamic-list',
        id: 'competitors',
        label: 'Known competitors',
      },
      {
        type: 'chips',
        id: 'differentiators',
        label: 'Differentiators',
        options: ['Price', 'Quality', 'Innovation', 'Service', 'Integration', 'Design'],
        allowCustom: true,
      },
      {
        type: 'text',
        id: 'successMetrics',
        label: 'Success metrics',
        placeholder: 'How will you measure success for this product?',
      },
      {
        type: 'freetext',
        id: 'additionalContext',
        label: 'Additional context',
        placeholder: 'Anything else about competition or success criteria?',
        rows: 3,
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
