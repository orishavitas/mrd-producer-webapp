export type SectionPriority = 'Must' | 'Nice to have';

export interface RequirementRow {
  id: string;
  category: string;
  requirement: string;
  priority: SectionPriority;
}

export interface PRDSection {
  key: string;
  title: string;
  enabled: boolean;
  content: string | RequirementRow[];
}

export interface PRDComment {
  id: string;
  sectionKey: string;
  author: string;
  body: string;
  createdAt: string;
  resolved: boolean;
}

// Note: no `id` field here — the GCS envelope's own `id` (lib/gcs/documents.ts)
// is the sole identifier. Duplicating it inside contentJson would let the two
// drift out of sync, so callers always use `envelope.id`, never a nested one.
export interface PRDDocument {
  sourceOnePagerId: string;
  productName: string;
  preparedBy: string;
  version: string;
  status: 'draft' | 'published';
  sections: PRDSection[];
  comments: PRDComment[];
}
