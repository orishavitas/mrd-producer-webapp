export interface OnePagerSummary {
  productName: string;
  description: string;
  goal: string;
  useCases: string;
  environments: string[];
  industries: string[];
  audience: string[];
  mustHaveFeatures: string[];
  niceToHaveFeatures: string[];
  moq: string;
  targetPrice: string;
  competitors: {
    brand: string;
    productName: string;
    description: string;
    cost: string;
  }[];
  customization: {
    paint: string;
    logoColors: string[];
  };
}

export interface PRDSkeletonSection {
  sectionKey: string;
  sectionTitle: string;
  strategy: string;
  writingDirective: string;
}

export type PRDSkeleton = PRDSkeletonSection[];

export interface PRDFrame {
  sectionKey: string;
  sectionOrder: number;
  content: string;
}

export interface QAReport {
  score: number;
  suggestions: { sectionKey: string; note: string }[];
}
