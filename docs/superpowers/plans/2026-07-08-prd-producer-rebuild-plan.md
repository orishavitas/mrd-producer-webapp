# PRD Producer Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken 4-agent PRD pipeline (Postgres-backed, skeleton approval gate, never successfully completed) with a one-shot generator producing a fixed-section PRD from a One-Pager, a review/edit UI with structured requirements editing, and a per-section comment system that also works from exported standalone HTML.

**Architecture:** A single `PRDGeneratorAgent` reads a One-Pager envelope (from [GCS Document Storage plan](2026-07-08-gcs-drive-storage-plan.md)) and writes all enabled sections in one pass into a `PRDDocument` stored as a GCS envelope (`toolType: 'prd'`). A new `/prd/[id]` review UI supports section editing, toggling, and comments. Comments live inside the same envelope and are exposed via API routes that an exported HTML file's embedded script can also call, gated by a new `commentor` allowlist flag.

**Tech Stack:** Existing `agent/core/` (`BaseAgent`, `ExecutionContext`, `createExecutionContext`), existing `lib/providers/` chain, `docx` for DOCX export, Next.js 14 route handlers, React client components, Jest + ts-jest.

**Depends on:** [GCS Document Storage + Drive Routing Plan](2026-07-08-gcs-drive-storage-plan.md) must be complete — this plan uses `lib/gcs/documents.ts` (`getDocumentEnvelope`, `saveDocumentEnvelope`, `createDocumentEnvelope`) and `lib/drive/drive-sync.ts` (`saveDocumentToDrive`) exactly as that plan builds them.

## Global Constraints

- Path alias `@/*` = project root.
- Tests live in `__tests__/` mirroring source, run via `npm test`.
- MRD is out of scope — do not touch `/mrd`, `/mrd-generator`.
- No PRD data migration — confirmed with user that no existing PRD was ever completed successfully; old Postgres tables are dropped, not migrated.
- The allowlist's `features` column is `INTEGER[]` with no CHECK constraint (verified in `lib/db-migrations/004-allowlist.sql`) — adding the `commentor` feature number requires **no SQL migration**, only a code change to `FEATURE_MAP`.
- One-Pager `skippedSections` keys (from `app/one-pager/lib/one-pager-state.ts`): `documentInfo`, `productDescription`, `goal`, `where`, `who`, `useCases`, `features`, `logo`, `paint`, `commercials`, `competitors`, `compatibleDevices`, `customerName`, `referencePhotos`.

---

### Task 1: PRD content types and fixed section config

**Files:**
- Create: `agent/agents/prd/prd-document-types.ts`
- Create: `config/prd-sections-v2.yaml`
- Modify: `lib/prd-sections-loader.ts`
- Test: `__tests__/lib/prd-sections-loader.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // agent/agents/prd/prd-document-types.ts
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

  // lib/prd-sections-loader.ts (new exports alongside existing loadPRDSections)
  export interface PRDSectionV2Config {
    key: string;
    title: string;
    order: number;
    type: 'text' | 'requirements';
    onePagerSkipKey: string | null;   // maps to skippedSections key; null = always-on default
    systemPrompt: string;
  }
  export function loadPRDSectionsV2(): PRDSectionV2Config[]
  ```

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/prd-sections-loader.test.ts` (check first if a test file already exists for `loadPRDSections` and extend it instead of replacing):

Run: `ls __tests__/lib/prd-sections-loader.test.ts 2>/dev/null || echo "not found"`

If not found, create it:

```ts
import { loadPRDSectionsV2 } from '@/lib/prd-sections-loader';

describe('loadPRDSectionsV2', () => {
  it('loads all 11 sections from config/prd-sections-v2.yaml, sorted by order', () => {
    const sections = loadPRDSectionsV2();
    expect(sections).toHaveLength(11);
    expect(sections[0].key).toBe('overview');
    expect(sections[sections.length - 1].key).toBe('references');
    for (let i = 1; i < sections.length; i++) {
      expect(sections[i].order).toBeGreaterThan(sections[i - 1].order);
    }
  });

  it('marks the requirements section as type "requirements" and all others as "text"', () => {
    const sections = loadPRDSectionsV2();
    const requirements = sections.find((s) => s.key === 'requirements');
    expect(requirements?.type).toBe('requirements');
    const others = sections.filter((s) => s.key !== 'requirements');
    expect(others.every((s) => s.type === 'text')).toBe(true);
  });

  it('maps design_scope-adjacent sections to a One-Pager skip key where one exists', () => {
    const sections = loadPRDSectionsV2();
    const commercial = sections.find((s) => s.key === 'commercial_parameters');
    expect(commercial?.onePagerSkipKey).toBe('commercials');
    const overview = sections.find((s) => s.key === 'overview');
    expect(overview?.onePagerSkipKey).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/prd-sections-loader.test.ts`
Expected: FAIL — `loadPRDSectionsV2` is not exported yet.

- [ ] **Step 3: Create `agent/agents/prd/prd-document-types.ts`**

```ts
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

export interface PRDDocument {
  sourceOnePagerId: string;
  productName: string;
  preparedBy: string;
  version: string;
  status: 'draft' | 'published';
  sections: PRDSection[];
  comments: PRDComment[];
}
```

- [ ] **Step 4: Create `config/prd-sections-v2.yaml`**

```yaml
sections:
  - key: overview
    title: "1. Overview"
    order: 1
    type: text
    onePagerSkipKey: null
    systemPrompt: >
      You are a product manager writing an engineering PRD for Compulocks, a hardware security company.
      Write a concise product overview (2-3 paragraphs) describing what the product is, what problem it
      solves, and the context for building it. Plain text, no markdown headers or bullets.

  - key: goals
    title: "2. Goals"
    order: 2
    type: text
    onePagerSkipKey: goal
    systemPrompt: >
      Write a "Goals" section as a numbered list of 4-7 concrete, measurable, testable goals.
      One goal per line, no bullet symbols — the renderer adds numbering.

  - key: design_scope
    title: "3. Design Scope"
    order: 3
    type: text
    onePagerSkipKey: null
    systemPrompt: >
      Write a "Design Scope" section with two clearly labeled parts: "In scope" and "Out of scope",
      each a short bullet list. Base scope on the product's features and customization details.

  - key: target_environments
    title: "4. Target Environments and Use Cases"
    order: 4
    type: text
    onePagerSkipKey: where
    systemPrompt: >
      Write a "Target Environments and Use Cases" section: primary market/industries, core use case(s),
      and target user/audience. Plain text, short paragraphs or a brief list.

  - key: requirements
    title: "5. Requirements"
    order: 5
    type: requirements
    onePagerSkipKey: features
    systemPrompt: >
      Generate a requirements table. Each must-have feature becomes a row with priority "Must";
      each nice-to-have feature becomes a row with priority "Nice to have". Assign a short category
      per row (e.g. "Device & Electrical", "Mounting & Orientation", "Enclosure & Environmental",
      "Security", "Serviceability") based on the feature's meaning. IDs are FR-1, FR-2, ... in order.

  - key: acceptance_criteria
    title: "6. Engineering Acceptance Criteria"
    order: 6
    type: text
    onePagerSkipKey: null
    systemPrompt: >
      Write "Engineering Acceptance Criteria" as a numbered list of 5-8 specific, testable criteria
      that define when the design is complete, derived from the goals and must-have features.

  - key: assumptions
    title: "7. Assumptions and Dependencies"
    order: 7
    type: text
    onePagerSkipKey: null
    systemPrompt: >
      Write "Assumptions and Dependencies" as a numbered list: key assumptions the design relies on,
      and external dependencies (suppliers, standards, other products) to resolve before design lock.

  - key: commercial_parameters
    title: "8. Commercial Parameters"
    order: 8
    type: text
    onePagerSkipKey: commercials
    systemPrompt: >
      Write "Commercial Parameters" as a short numbered list covering MOQ, target price
      (or "not applicable" if none given), and number of samples.

  - key: open_questions
    title: "9. Open Questions"
    order: 9
    type: text
    onePagerSkipKey: null
    systemPrompt: >
      Write "Open Questions (Remaining)" as a numbered list of unresolved items that block
      design lock — missing dimensions, unconfirmed certifications, unspecified details.
      If nothing is obviously unresolved, list general due-diligence questions for this product type.

  - key: success_criteria
    title: "10. Success Criteria"
    order: 10
    type: text
    onePagerSkipKey: null
    systemPrompt: >
      Write "Success Criteria" as a numbered list of 2-4 criteria describing what success looks like
      for this program (e.g. sample approval, field performance, customer sign-off).

  - key: references
    title: "11. References"
    order: 11
    type: text
    onePagerSkipKey: null
    systemPrompt: >
      Write a single "References" line: "Source One-Pager: {{productName}}, prepared by {{preparedBy}}."
      Return only this line, substituting the actual values — no extra commentary.
```

- [ ] **Step 5: Add `PRDSectionV2Config` and `loadPRDSectionsV2` to `lib/prd-sections-loader.ts`**

Modify `lib/prd-sections-loader.ts` — append after the existing `loadPRDSections` function (do not remove it; it's still used by the old agents until Task 8 deletes them):

```ts
export interface PRDSectionV2Config {
  key: string;
  title: string;
  order: number;
  type: 'text' | 'requirements';
  onePagerSkipKey: string | null;
  systemPrompt: string;
}

interface YAMLConfigV2 {
  sections: PRDSectionV2Config[];
}

let cachedV2: PRDSectionV2Config[] | null = null;

export function loadPRDSectionsV2(): PRDSectionV2Config[] {
  if (cachedV2) return cachedV2;

  const filePath = path.join(process.cwd(), 'config', 'prd-sections-v2.yaml');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = yaml.load(raw) as YAMLConfigV2;

  cachedV2 = parsed.sections.sort((a, b) => a.order - b.order);
  return cachedV2;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- __tests__/lib/prd-sections-loader.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add agent/agents/prd/prd-document-types.ts config/prd-sections-v2.yaml lib/prd-sections-loader.ts __tests__/lib/prd-sections-loader.test.ts
git commit -m "feat: add fixed PRD section config and content types"
```

---

### Task 2: PRDGeneratorAgent — one-shot section generation

**Files:**
- Create: `agent/agents/prd/prd-generator-agent.ts`
- Test: `__tests__/agent/agents/prd/prd-generator-agent.test.ts`

**Interfaces:**
- Consumes:
  - `loadPRDSectionsV2()` from Task 1.
  - `PRDSection`, `RequirementRow`, `PRDDocument` from `agent/agents/prd/prd-document-types.ts` (Task 1).
  - `BaseAgent`, `ExecutionContext` from `agent/core/base-agent.ts` / `agent/core/types.ts` (existing).
  - `OnePagerState` shape from `app/one-pager/lib/one-pager-state.ts` (existing) — specifically `productName`, `preparedBy`, `description`, `goal`, `useCases`, `context.environments`, `context.industries`, `audience`, `features.mustHave`, `features.niceToHave`, `commercials.moq`, `commercials.targetPrice`, `commercials.numberOfSamples`(actually under top-level `numberOfSamples` per the type — verify against the file read in Step 1 below), `skippedSections`.
- Produces:
  ```ts
  export interface GeneratorInput {
    onePagerContentJson: Record<string, unknown>;
    sectionOverrides?: Record<string, boolean>; // key -> enabled, user overrides beyond One-Pager skip defaults
  }
  export class PRDGeneratorAgent extends BaseAgent<GeneratorInput, PRDSection[]> {
    readonly id = 'prd-generator-agent';
    // executeCore returns PRDSection[] — all sections, each with resolved `enabled` and generated `content`
  }
  ```

- [ ] **Step 1: Re-read the exact `OnePagerState` field names**

Run: `grep -n "numberOfSamples\|commercials\|preparedBy" "app/one-pager/lib/one-pager-state.ts"`

Confirm `numberOfSamples` is a top-level field (not nested under `commercials`) before writing the prompt-building code in Step 3 — the implementation below assumes this based on the file read during planning; verify it still holds before proceeding, since content_json is untyped `Record<string, unknown>` in the envelope and field names must match exactly or generation will silently produce "N/A" for every field.

- [ ] **Step 2: Write the failing test**

Create `__tests__/agent/agents/prd/prd-generator-agent.test.ts`:

```ts
import { jest } from '@jest/globals';

const mockGenerateText = jest.fn();
const fakeProvider = {
  name: 'fake',
  capabilities: { textGeneration: true },
  generateText: mockGenerateText,
};
const fakeContext = {
  requestId: 'test',
  config: {},
  log: jest.fn(),
  getProvider: () => fakeProvider,
  getFallbackChain: () => [fakeProvider],
} as any;

import { PRDGeneratorAgent } from '@/agent/agents/prd/prd-generator-agent';

const baseOnePager = {
  productName: 'Widget Enclosure',
  preparedBy: 'Ori Shavit',
  description: 'An outdoor enclosure',
  goal: 'Protect the device',
  useCases: 'EV charging',
  context: { environments: ['Outdoor'], industries: ['Logistics'] },
  audience: { predefined: ['Drivers'], custom: [] },
  features: { mustHave: ['House terminal', 'Lockable body'], niceToHave: ['Masonry screw pattern'] },
  commercials: { moq: '200', targetPrice: 'N/A' },
  numberOfSamples: '3',
  skippedSections: { commercials: false, competitors: true },
};

describe('PRDGeneratorAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateText.mockResolvedValue({ text: 'Generated section content.' });
  });

  it('generates all sections and marks enabled based on skippedSections defaults', async () => {
    const agent = new PRDGeneratorAgent();
    const result = await agent.execute({ onePagerContentJson: baseOnePager }, fakeContext);
    expect(result.success).toBe(true);
    const sections = result.data!;
    expect(sections).toHaveLength(11);
    const commercial = sections.find((s) => s.key === 'commercial_parameters');
    expect(commercial?.enabled).toBe(true); // skippedSections.commercials is false
  });

  it('derives the requirements table from mustHave/niceToHave with correct priorities', async () => {
    mockGenerateText.mockImplementation(async (userPrompt: string) => {
      if (userPrompt.includes('mustHaveFeatures')) {
        return {
          text: JSON.stringify([
            { id: 'FR-1', category: 'Device & Electrical', requirement: 'House terminal', priority: 'Must' },
            { id: 'FR-2', category: 'Mounting & Orientation', requirement: 'Masonry screw pattern', priority: 'Nice to have' },
          ]),
        };
      }
      return { text: 'Generated text section.' };
    });
    const agent = new PRDGeneratorAgent();
    const result = await agent.execute({ onePagerContentJson: baseOnePager }, fakeContext);
    const requirementsSection = result.data!.find((s) => s.key === 'requirements');
    expect(Array.isArray(requirementsSection?.content)).toBe(true);
    const rows = requirementsSection!.content as { id: string; priority: string }[];
    expect(rows[0]).toEqual(expect.objectContaining({ id: 'FR-1', priority: 'Must' }));
    expect(rows[1]).toEqual(expect.objectContaining({ id: 'FR-2', priority: 'Nice to have' }));
  });

  it('applies sectionOverrides on top of One-Pager skip defaults', async () => {
    const agent = new PRDGeneratorAgent();
    const result = await agent.execute(
      { onePagerContentJson: baseOnePager, sectionOverrides: { commercial_parameters: false } },
      fakeContext
    );
    const commercial = result.data!.find((s) => s.key === 'commercial_parameters');
    expect(commercial?.enabled).toBe(false);
  });

  it('fails validation when onePagerContentJson is missing', async () => {
    const agent = new PRDGeneratorAgent();
    const result = await agent.execute({ onePagerContentJson: undefined as any }, fakeContext);
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- __tests__/agent/agents/prd/prd-generator-agent.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `agent/agents/prd/prd-generator-agent.ts`**

```ts
import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities } from '@/lib/providers/types';
import { loadPRDSectionsV2, PRDSectionV2Config } from '@/lib/prd-sections-loader';
import { PRDSection, RequirementRow } from './prd-document-types';

export interface GeneratorInput {
  onePagerContentJson: Record<string, unknown>;
  sectionOverrides?: Record<string, boolean>;
}

interface OnePagerFields {
  productName: string;
  preparedBy: string;
  description: string;
  goal: string;
  useCases: string;
  context: { environments: string[]; industries: string[] };
  audience: { predefined: string[]; custom: string[] };
  features: { mustHave: string[]; niceToHave: string[] };
  commercials: { moq: string; targetPrice: string };
  numberOfSamples: string;
  skippedSections: Record<string, boolean>;
}

function asOnePagerFields(raw: Record<string, unknown>): OnePagerFields {
  return {
    productName: String(raw.productName ?? ''),
    preparedBy: String(raw.preparedBy ?? ''),
    description: String(raw.description ?? ''),
    goal: String(raw.goal ?? ''),
    useCases: String(raw.useCases ?? ''),
    context: (raw.context as OnePagerFields['context']) ?? { environments: [], industries: [] },
    audience: (raw.audience as OnePagerFields['audience']) ?? { predefined: [], custom: [] },
    features: (raw.features as OnePagerFields['features']) ?? { mustHave: [], niceToHave: [] },
    commercials: (raw.commercials as OnePagerFields['commercials']) ?? { moq: '', targetPrice: '' },
    numberOfSamples: String(raw.numberOfSamples ?? ''),
    skippedSections: (raw.skippedSections as Record<string, boolean>) ?? {},
  };
}

function buildTextPrompt(config: PRDSectionV2Config, fields: OnePagerFields): string {
  return [
    `Product name: ${fields.productName}`,
    `Description: ${fields.description}`,
    `Goal: ${fields.goal}`,
    `Use cases: ${fields.useCases}`,
    `Environments: ${fields.context.environments.join(', ') || 'N/A'}`,
    `Industries: ${fields.context.industries.join(', ') || 'N/A'}`,
    `Audience: ${[...fields.audience.predefined, ...fields.audience.custom].join(', ') || 'N/A'}`,
    `Must-have features: ${fields.features.mustHave.join('; ') || 'N/A'}`,
    `Nice-to-have features: ${fields.features.niceToHave.join('; ') || 'N/A'}`,
    `MOQ: ${fields.commercials.moq || 'N/A'}`,
    `Target price: ${fields.commercials.targetPrice || 'N/A'}`,
    `Number of samples: ${fields.numberOfSamples || 'N/A'}`,
    `Prepared by: ${fields.preparedBy}`,
  ].join('\n');
}

function buildRequirementsPrompt(fields: OnePagerFields): string {
  return [
    'Return ONLY a JSON array of objects, no prose, no markdown fences.',
    'Each object: { "id": "FR-N", "category": string, "requirement": string, "priority": "Must" | "Nice to have" }',
    `mustHaveFeatures: ${JSON.stringify(fields.features.mustHave)}`,
    `niceToHaveFeatures: ${JSON.stringify(fields.features.niceToHave)}`,
    `environments: ${JSON.stringify(fields.context.environments)}`,
    `industries: ${JSON.stringify(fields.context.industries)}`,
  ].join('\n');
}

function parseRequirementsResponse(text: string): RequirementRow[] {
  const cleaned = text.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row, i) => ({
      id: String(row.id ?? `FR-${i + 1}`),
      category: String(row.category ?? 'General'),
      requirement: String(row.requirement ?? ''),
      priority: row.priority === 'Nice to have' ? 'Nice to have' : 'Must',
    }));
  } catch {
    return [];
  }
}

function resolveEnabled(
  config: PRDSectionV2Config,
  fields: OnePagerFields,
  overrides?: Record<string, boolean>
): boolean {
  if (overrides && config.key in overrides) return overrides[config.key];
  if (config.onePagerSkipKey && fields.skippedSections[config.onePagerSkipKey]) return false;
  return true;
}

export class PRDGeneratorAgent extends BaseAgent<GeneratorInput, PRDSection[]> {
  readonly id = 'prd-generator-agent';
  readonly name = 'PRD Generator Agent';
  readonly version = '1.0.0';
  readonly description = 'Generates all PRD sections from a One-Pager in a single pass';
  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = ['textGeneration'];

  validateInput(input: GeneratorInput): ValidationResult {
    if (!input?.onePagerContentJson || typeof input.onePagerContentJson !== 'object') {
      return { valid: false, errors: ['onePagerContentJson is required and must be an object'] };
    }
    return { valid: true };
  }

  protected async executeCore(
    input: GeneratorInput,
    context: ExecutionContext
  ): Promise<PRDSection[]> {
    const fields = asOnePagerFields(input.onePagerContentJson);
    const configs = loadPRDSectionsV2();
    const provider = context.getProvider();

    const sections = await Promise.all(
      configs.map(async (config): Promise<PRDSection> => {
        const enabled = resolveEnabled(config, fields, input.sectionOverrides);

        if (config.key === 'references') {
          return {
            key: config.key,
            title: config.title,
            enabled,
            content: `Source One-Pager: ${fields.productName}, prepared by ${fields.preparedBy}.`,
          };
        }

        if (config.type === 'requirements') {
          const response = await provider.generateText(buildRequirementsPrompt(fields), config.systemPrompt);
          return { key: config.key, title: config.title, enabled, content: parseRequirementsResponse(response.text) };
        }

        const response = await provider.generateText(buildTextPrompt(config, fields), config.systemPrompt);
        return { key: config.key, title: config.title, enabled, content: response.text.trim() };
      })
    );

    return sections;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- __tests__/agent/agents/prd/prd-generator-agent.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add agent/agents/prd/prd-generator-agent.ts __tests__/agent/agents/prd/prd-generator-agent.test.ts
git commit -m "feat: add PRDGeneratorAgent for one-shot fixed-section PRD generation"
```

---

### Task 3: `commentor` allowlist flag

**Files:**
- Modify: `lib/feature-gate.ts`
- Modify: `app/admin/allowlist/AllowlistClient.tsx`
- Test: `__tests__/lib/feature-gate.test.ts` (check first if it exists and extend)

**Interfaces:**
- Produces: `FeatureKey` now includes `'commentor'`; `FEATURE_MAP['8'] === 'commentor'`.

- [ ] **Step 1: Check for existing feature-gate tests**

Run: `ls __tests__/lib/feature-gate.test.ts 2>/dev/null || echo "not found"`

If found, read it and add the new test case shown below into that file rather than creating a new one. If not found, create it fresh with just this test case (don't attempt to replicate every existing behavior — this task only adds coverage for the new flag).

- [ ] **Step 2: Write the failing test**

Add/create in `__tests__/lib/feature-gate.test.ts`:

```ts
import { FEATURE_MAP, featureKeyToNumber } from '@/lib/feature-gate';

describe('commentor feature flag', () => {
  it('maps feature number 8 to the commentor key', () => {
    expect(FEATURE_MAP['8']).toBe('commentor');
  });

  it('converts the commentor key back to number 8', () => {
    expect(featureKeyToNumber('commentor')).toBe(8);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- __tests__/lib/feature-gate.test.ts`
Expected: FAIL — `FEATURE_MAP['8']` is `undefined`.

- [ ] **Step 4: Update `lib/feature-gate.ts`**

```ts
export type FeatureKey =
  | 'mrd-generator'
  | 'one-pager'
  | 'brief-helper'
  | 'one-pager-beta'
  | 'prd-producer'
  | 'one-pager-alpha'
  | 'rd-viewer'
  | 'commentor';

export const FEATURE_MAP: Record<string, FeatureKey> = {
  '1': 'mrd-generator',
  '2': 'one-pager',
  '3': 'brief-helper',
  '4': 'one-pager-beta',
  '5': 'prd-producer',
  '6': 'one-pager-alpha',
  '7': 'rd-viewer',
  '8': 'commentor',
};
```

(Only these two blocks change — the type union and the map. Everything else in the file is untouched.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- __tests__/lib/feature-gate.test.ts`
Expected: PASS

- [ ] **Step 6: Add the checkbox to the admin UI**

Modify `app/admin/allowlist/AllowlistClient.tsx` lines 5-13:

```ts
const FEATURE_OPTIONS: { num: number; label: string }[] = [
  { num: 1, label: 'MRD Generator' },
  { num: 2, label: 'One-Pager' },
  { num: 3, label: 'Brief Helper' },
  { num: 4, label: 'One-Pager Beta' },
  { num: 5, label: 'PRD Producer' },
  { num: 6, label: 'One-Pager Alpha' },
  { num: 7, label: 'R&D Viewer' },
  { num: 8, label: 'Commentor' },
];
```

- [ ] **Step 7: Commit**

```bash
git add lib/feature-gate.ts app/admin/allowlist/AllowlistClient.tsx __tests__/lib/feature-gate.test.ts
git commit -m "feat: add commentor allowlist flag"
```

---

### Task 4: PRD document API — generate, get, save, publish

**Files:**
- Create: `app/api/prd/generate/route.ts`
- Create: `app/api/prd/[id]/route.ts`
- Create: `app/api/prd/[id]/publish/route.ts`
- Test: `__tests__/app/api/prd/generate.test.ts`
- Test: `__tests__/app/api/prd/id-route.test.ts`

**Interfaces:**
- Consumes:
  - `getDocumentEnvelope`, `createDocumentEnvelope`, `saveDocumentEnvelope` from `lib/gcs/documents.ts` (storage plan Task 2).
  - `saveDocumentToDrive` from `lib/drive/drive-sync.ts` (storage plan Task 4).
  - `summarizeChanges` from `lib/drive/change-summary.ts` (storage plan Task 5).
  - `PRDGeneratorAgent` from Task 2 of this plan.
  - `PRDDocument`, `PRDSection` types from Task 1 of this plan.
  - `createExecutionContext` from `agent/core/execution-context.ts` (existing).

- [ ] **Step 1: Write the failing test for generate**

Create `__tests__/app/api/prd/generate.test.ts`:

```ts
import { jest } from '@jest/globals';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { email: 'ori@compulocks.com', name: 'Ori Shavit' } }),
}));

const mockGetDocumentEnvelope = jest.fn();
const mockCreateDocumentEnvelope = jest.fn();
jest.mock('@/lib/gcs/documents', () => ({
  getDocumentEnvelope: (...args: unknown[]) => mockGetDocumentEnvelope(...args),
  createDocumentEnvelope: (...args: unknown[]) => mockCreateDocumentEnvelope(...args),
}));

const mockExecute = jest.fn();
jest.mock('@/agent/agents/prd/prd-generator-agent', () => ({
  PRDGeneratorAgent: jest.fn().mockImplementation(() => ({ execute: mockExecute })),
}));

jest.mock('@/agent/core/execution-context', () => ({
  createExecutionContext: () => ({ requestId: 'test', config: {}, log: jest.fn(), getProvider: jest.fn(), getFallbackChain: jest.fn(() => []) }),
}));

import { POST } from '@/app/api/prd/generate/route';
import { NextRequest } from 'next/server';

describe('POST /api/prd/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDocumentEnvelope.mockResolvedValue({
      id: 'op-1', toolType: 'one-pager', productName: 'Widget', userId: 'ori@compulocks.com',
      contentJson: { productName: 'Widget', preparedBy: 'Ori Shavit' }, deletedAt: null,
    });
    mockExecute.mockResolvedValue({
      success: true,
      data: [{ key: 'overview', title: '1. Overview', enabled: true, content: 'Text.' }],
    });
    mockCreateDocumentEnvelope.mockResolvedValue({
      id: 'prd-1', toolType: 'prd', productName: 'Widget', userId: 'ori@compulocks.com',
      contentJson: {}, version: '0.1', status: 'draft', driveFolderId: null, deletedAt: null,
      versionHistory: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('generates a PRD from a One-Pager id and returns the saved envelope', async () => {
    const req = new NextRequest('http://localhost/api/prd/generate', {
      method: 'POST',
      body: JSON.stringify({ onePagerId: 'op-1' }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.document.id).toBe('prd-1');
    expect(mockCreateDocumentEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({ toolType: 'prd', productName: 'Widget' })
    );
  });

  it('returns 404 when the source One-Pager does not exist', async () => {
    mockGetDocumentEnvelope.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/prd/generate', {
      method: 'POST',
      body: JSON.stringify({ onePagerId: 'missing' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('returns 500 when the generator agent fails', async () => {
    mockExecute.mockResolvedValue({ success: false, error: 'provider down' });
    const req = new NextRequest('http://localhost/api/prd/generate', {
      method: 'POST',
      body: JSON.stringify({ onePagerId: 'op-1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/app/api/prd/generate.test.ts`
Expected: FAIL — route module not found.

- [ ] **Step 3: Implement `app/api/prd/generate/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDocumentEnvelope, createDocumentEnvelope } from '@/lib/gcs/documents';
import { PRDGeneratorAgent } from '@/agent/agents/prd/prd-generator-agent';
import { createExecutionContext } from '@/agent/core/execution-context';
import { PRDDocument } from '@/agent/agents/prd/prd-document-types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface GenerateRequest {
  onePagerId: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Partial<GenerateRequest>;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (!body.onePagerId) {
    return NextResponse.json({ error: 'onePagerId is required' }, { status: 400 });
  }

  const onePager = await getDocumentEnvelope('one-pager', body.onePagerId);
  if (!onePager || onePager.deletedAt) {
    return NextResponse.json({ error: 'One-Pager document not found' }, { status: 404 });
  }

  const context = createExecutionContext({ requestId: `prd-generate-${body.onePagerId}` });
  const agent = new PRDGeneratorAgent();
  const result = await agent.execute({ onePagerContentJson: onePager.contentJson }, context);

  if (!result.success || !result.data) {
    return NextResponse.json({ error: result.error || 'PRD generation failed' }, { status: 500 });
  }

  const productName = String(onePager.contentJson.productName ?? onePager.productName);
  const preparedBy = String(onePager.contentJson.preparedBy ?? session.user.name ?? session.user.email);

  const prdContent: PRDDocument = {
    sourceOnePagerId: onePager.id,
    productName,
    preparedBy,
    version: '0.1',
    status: 'draft',
    sections: result.data,
    comments: [],
  };

  const envelope = await createDocumentEnvelope({
    toolType: 'prd',
    productName,
    userId: session.user.email,
    creatorName: session.user.name ?? undefined,
    creatorEmail: session.user.email,
    contentJson: prdContent as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ document: envelope });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/app/api/prd/generate.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing test for get/save/publish**

Create `__tests__/app/api/prd/id-route.test.ts`:

```ts
import { jest } from '@jest/globals';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { email: 'ori@compulocks.com', name: 'Ori' } }),
}));

const mockGetDocumentEnvelope = jest.fn();
const mockSaveDocumentEnvelope = jest.fn();
jest.mock('@/lib/gcs/documents', () => ({
  getDocumentEnvelope: (...args: unknown[]) => mockGetDocumentEnvelope(...args),
  saveDocumentEnvelope: (...args: unknown[]) => mockSaveDocumentEnvelope(...args),
}));

const mockSaveDocumentToDrive = jest.fn();
jest.mock('@/lib/drive/drive-sync', () => ({
  saveDocumentToDrive: (...args: unknown[]) => mockSaveDocumentToDrive(...args),
}));

jest.mock('@/lib/drive/change-summary', () => ({
  summarizeChanges: () => 'sections updated',
}));

import { GET, PATCH } from '@/app/api/prd/[id]/route';
import { POST as publishPOST } from '@/app/api/prd/[id]/publish/route';
import { NextRequest } from 'next/server';

const existingPrdEnvelope = {
  id: 'prd-1', toolType: 'prd' as const, productName: 'Widget', userId: 'ori@compulocks.com',
  creatorName: 'Ori', creatorEmail: 'ori@compulocks.com', status: 'draft' as const, version: '0.1',
  contentJson: {
    sourceOnePagerId: 'op-1', productName: 'Widget', preparedBy: 'Ori',
    version: '0.1', status: 'draft', sections: [{ key: 'overview', title: '1. Overview', enabled: true, content: 'Old text.' }],
    comments: [],
  },
  versionHistory: [], driveFolderId: null, deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GET /api/prd/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the PRD envelope', async () => {
    mockGetDocumentEnvelope.mockResolvedValue(existingPrdEnvelope);
    const res = await GET(new NextRequest('http://localhost/api/prd/prd-1'), { params: Promise.resolve({ id: 'prd-1' }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.document.contentJson.productName).toBe('Widget');
  });
});

describe('PATCH /api/prd/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDocumentEnvelope.mockResolvedValue(existingPrdEnvelope);
    mockSaveDocumentEnvelope.mockImplementation(async (env) => env);
  });

  it('saves section edits and snapshots the previous version', async () => {
    const newSections = [{ key: 'overview', title: '1. Overview', enabled: true, content: 'New text.' }];
    const req = new NextRequest('http://localhost/api/prd/prd-1', {
      method: 'PATCH',
      body: JSON.stringify({ sections: newSections, version: '0.2' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'prd-1' }) });
    expect(res.status).toBe(200);
    expect(mockSaveDocumentEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({
        versionHistory: expect.arrayContaining([expect.objectContaining({ version: '0.1' })]),
      })
    );
  });
});

describe('POST /api/prd/[id]/publish', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDocumentEnvelope.mockResolvedValue(existingPrdEnvelope);
    mockSaveDocumentEnvelope.mockImplementation(async (env) => env);
    mockSaveDocumentToDrive.mockResolvedValue({ driveFolderId: 'folder-1', ok: true });
  });

  it('bumps to the next major version and triggers a Drive sync', async () => {
    const res = await publishPOST(new NextRequest('http://localhost/api/prd/prd-1/publish', { method: 'POST' }), {
      params: Promise.resolve({ id: 'prd-1' }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.document.version).toBe('1.0');
    expect(mockSaveDocumentToDrive).toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npm test -- __tests__/app/api/prd/id-route.test.ts`
Expected: FAIL — route modules not found.

- [ ] **Step 7: Implement `app/api/prd/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDocumentEnvelope, saveDocumentEnvelope } from '@/lib/gcs/documents';
import { saveDocumentToDrive } from '@/lib/drive/drive-sync';
import { summarizeChanges } from '@/lib/drive/change-summary';
import { PRDDocument, PRDSection } from '@/agent/agents/prd/prd-document-types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const doc = await getDocumentEnvelope('prd', id);
  if (!doc || doc.deletedAt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ document: doc });
}

interface PatchBody {
  sections: PRDSection[];
  version?: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body: PatchBody = await req.json();

  const existing = await getDocumentEnvelope('prd', id);
  if (!existing || existing.deletedAt || existing.userId !== session.user.email) {
    return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
  }

  const existingContent = existing.contentJson as unknown as PRDDocument;
  const history = [...existing.versionHistory];
  if (existing.contentJson) {
    history.push({ version: existing.version, savedAt: new Date().toISOString(), contentJson: existing.contentJson });
    if (history.length > 20) history.splice(0, history.length - 20);
  }

  const newVersion = body.version ?? existing.version;
  const newContent: PRDDocument = { ...existingContent, sections: body.sections, version: newVersion };

  const updated = await saveDocumentEnvelope({
    ...existing,
    contentJson: newContent as unknown as Record<string, unknown>,
    version: newVersion,
    versionHistory: history,
  });

  saveDocumentToDrive(
    updated,
    {},
    summarizeChanges(existing.contentJson, updated.contentJson),
    session.user.email
  ).catch((err) => console.error('[prd PATCH] Drive sync failed:', err instanceof Error ? err.message : err));

  return NextResponse.json({ document: updated });
}
```

- [ ] **Step 8: Implement `app/api/prd/[id]/publish/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDocumentEnvelope, saveDocumentEnvelope } from '@/lib/gcs/documents';
import { saveDocumentToDrive } from '@/lib/drive/drive-sync';
import { summarizeChanges } from '@/lib/drive/change-summary';
import { generatePRDDocxV2, generatePRDHtmlV2 } from '@/lib/prd-document-generator';
import { PRDDocument } from '@/agent/agents/prd/prd-document-types';

function nextMajorVersion(current: string): string {
  const major = parseInt(current.split('.')[0], 10) || 0;
  return `${major + 1}.0`;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await getDocumentEnvelope('prd', id);
  if (!existing || existing.deletedAt || existing.userId !== session.user.email) {
    return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
  }

  const existingContent = existing.contentJson as unknown as PRDDocument;
  const newVersion = existing.status === 'draft' ? '1.0' : nextMajorVersion(existing.version);
  const newContent: PRDDocument = { ...existingContent, version: newVersion, status: 'published' };

  const history = [...existing.versionHistory, {
    version: existing.version,
    savedAt: new Date().toISOString(),
    contentJson: existing.contentJson,
  }];
  if (history.length > 20) history.splice(0, history.length - 20);

  const updated = await saveDocumentEnvelope({
    ...existing,
    contentJson: newContent as unknown as Record<string, unknown>,
    version: newVersion,
    status: 'published',
    versionHistory: history,
  });

  const docx = await generatePRDDocxV2(newContent);
  const html = generatePRDHtmlV2(newContent, updated.id);

  const driveResult = await saveDocumentToDrive(
    updated,
    { docx, html },
    summarizeChanges(existing.contentJson, updated.contentJson),
    session.user.email
  );

  return NextResponse.json({ document: updated, driveSync: driveResult });
}
```

(`generatePRDDocxV2`/`generatePRDHtmlV2` are implemented in Task 6 — this route will fail to compile until that task lands. That's expected task ordering within this plan; do not skip ahead.)

- [ ] **Step 9: Run tests to verify they pass**

Note: Step 9 will not fully pass until Task 6 provides `generatePRDDocxV2`/`generatePRDHtmlV2`. Run the GET/PATCH tests only for now:

Run: `npm test -- __tests__/app/api/prd/id-route.test.ts -t "GET|PATCH"`
Expected: PASS for GET and PATCH describe blocks. The publish test will fail until Task 6 — that's expected; do not treat it as a regression yet.

- [ ] **Step 10: Commit**

```bash
git add app/api/prd/generate app/api/prd/[id]/route.ts __tests__/app/api/prd/generate.test.ts __tests__/app/api/prd/id-route.test.ts
git commit -m "feat: add PRD generate/get/save API routes"
```

(The publish route file is created now but committed in Task 6 once its dependency compiles — see that task's commit step.)

---

### Task 5: Comments API

**Files:**
- Create: `app/api/prd/[id]/comments/route.ts`
- Create: `app/api/prd/[id]/comments/[commentId]/route.ts`
- Test: `__tests__/app/api/prd/comments.test.ts`

**Interfaces:**
- Consumes: `getDocumentEnvelope`, `saveDocumentEnvelope` from `lib/gcs/documents.ts`; `hasFeature` from `lib/feature-gate.ts`; `PRDDocument`, `PRDComment` from Task 1.
- Produces: the comment API surface documented in the PRD rebuild spec.

- [ ] **Step 1: Write the failing test**

Create `__tests__/app/api/prd/comments.test.ts`:

```ts
import { jest } from '@jest/globals';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { email: 'reviewer@compulocks.com', name: 'Reviewer' } }),
}));

const mockHasFeature = jest.fn();
jest.mock('@/lib/feature-gate', () => ({
  hasFeature: (...args: unknown[]) => mockHasFeature(...args),
}));

const mockGetDocumentEnvelope = jest.fn();
const mockSaveDocumentEnvelope = jest.fn();
jest.mock('@/lib/gcs/documents', () => ({
  getDocumentEnvelope: (...args: unknown[]) => mockGetDocumentEnvelope(...args),
  saveDocumentEnvelope: (...args: unknown[]) => mockSaveDocumentEnvelope(...args),
}));

import { GET, POST } from '@/app/api/prd/[id]/comments/route';
import { PATCH } from '@/app/api/prd/[id]/comments/[commentId]/route';
import { NextRequest } from 'next/server';

const envelopeWithComments = {
  id: 'prd-1', toolType: 'prd' as const, productName: 'Widget', userId: 'owner@compulocks.com',
  status: 'draft' as const, version: '0.1', deletedAt: null, driveFolderId: null, versionHistory: [],
  contentJson: {
    sourceOnePagerId: 'op-1', productName: 'Widget', preparedBy: 'Owner',
    version: '0.1', status: 'draft', sections: [],
    comments: [{ id: 'c1', sectionKey: 'overview', author: 'owner@compulocks.com', body: 'Looks good', createdAt: '2026-01-01T00:00:00.000Z', resolved: false }],
  },
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GET /api/prd/[id]/comments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasFeature.mockResolvedValue(true);
    mockGetDocumentEnvelope.mockResolvedValue(envelopeWithComments);
  });

  it('returns comments for an allowlisted commentor even if not the owner', async () => {
    const res = await GET(new NextRequest('http://localhost/api/prd/prd-1/comments'), { params: Promise.resolve({ id: 'prd-1' }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.comments).toHaveLength(1);
  });

  it('returns 403 when the user has neither commentor nor prd-producer nor rd-viewer', async () => {
    mockHasFeature.mockResolvedValue(false);
    const res = await GET(new NextRequest('http://localhost/api/prd/prd-1/comments'), { params: Promise.resolve({ id: 'prd-1' }) });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/prd/[id]/comments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasFeature.mockResolvedValue(true);
    mockGetDocumentEnvelope.mockResolvedValue(envelopeWithComments);
    mockSaveDocumentEnvelope.mockImplementation(async (env) => env);
  });

  it('appends a new comment and persists it', async () => {
    const req = new NextRequest('http://localhost/api/prd/prd-1/comments', {
      method: 'POST',
      body: JSON.stringify({ sectionKey: 'goals', body: 'Needs more detail' }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'prd-1' }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.comments).toHaveLength(2);
    expect(mockSaveDocumentEnvelope).toHaveBeenCalled();
  });
});

describe('PATCH /api/prd/[id]/comments/[commentId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasFeature.mockResolvedValue(true);
    mockGetDocumentEnvelope.mockResolvedValue(envelopeWithComments);
    mockSaveDocumentEnvelope.mockImplementation(async (env) => env);
  });

  it('lets the comment author resolve their own comment', async () => {
    const authoredEnvelope = {
      ...envelopeWithComments,
      contentJson: {
        ...envelopeWithComments.contentJson,
        comments: [{ ...envelopeWithComments.contentJson.comments[0], author: 'reviewer@compulocks.com' }],
      },
    };
    mockGetDocumentEnvelope.mockResolvedValue(authoredEnvelope);
    const req = new NextRequest('http://localhost/api/prd/prd-1/comments/c1', {
      method: 'PATCH',
      body: JSON.stringify({ resolved: true }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'prd-1', commentId: 'c1' }) });
    expect(res.status).toBe(200);
  });

  it('rejects resolving someone else\'s comment when not the document owner', async () => {
    const req = new NextRequest('http://localhost/api/prd/prd-1/comments/c1', {
      method: 'PATCH',
      body: JSON.stringify({ resolved: true }),
    });
    // envelopeWithComments: owner is 'owner@compulocks.com', comment author is 'owner@compulocks.com',
    // requester is 'reviewer@compulocks.com' (neither author nor owner) — should be rejected.
    const res = await PATCH(req, { params: Promise.resolve({ id: 'prd-1', commentId: 'c1' }) });
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/app/api/prd/comments.test.ts`
Expected: FAIL — route modules not found.

- [ ] **Step 3: Implement `app/api/prd/[id]/comments/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasFeature } from '@/lib/feature-gate';
import { getDocumentEnvelope, saveDocumentEnvelope } from '@/lib/gcs/documents';
import { PRDDocument, PRDComment } from '@/agent/agents/prd/prd-document-types';

async function canAccessComments(email: string): Promise<boolean> {
  return (
    (await hasFeature(email, 'commentor')) ||
    (await hasFeature(email, 'prd-producer')) ||
    (await hasFeature(email, 'rd-viewer'))
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await canAccessComments(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const doc = await getDocumentEnvelope('prd', id);
  if (!doc || doc.deletedAt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const content = doc.contentJson as unknown as PRDDocument;
  return NextResponse.json({ comments: content.comments });
}

interface PostBody {
  sectionKey: string;
  body: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await canAccessComments(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body: PostBody = await req.json();
  if (!body.sectionKey || !body.body) {
    return NextResponse.json({ error: 'sectionKey and body are required' }, { status: 400 });
  }

  const doc = await getDocumentEnvelope('prd', id);
  if (!doc || doc.deletedAt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const content = doc.contentJson as unknown as PRDDocument;
  const newComment: PRDComment = {
    id: crypto.randomUUID(),
    sectionKey: body.sectionKey,
    author: session.user.email,
    body: body.body,
    createdAt: new Date().toISOString(),
    resolved: false,
  };
  const updatedContent: PRDDocument = { ...content, comments: [...content.comments, newComment] };

  await saveDocumentEnvelope({ ...doc, contentJson: updatedContent as unknown as Record<string, unknown> });

  return NextResponse.json({ comments: updatedContent.comments });
}
```

- [ ] **Step 4: Implement `app/api/prd/[id]/comments/[commentId]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasFeature } from '@/lib/feature-gate';
import { getDocumentEnvelope, saveDocumentEnvelope } from '@/lib/gcs/documents';
import { PRDDocument } from '@/agent/agents/prd/prd-document-types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasAccess =
    (await hasFeature(session.user.email, 'commentor')) ||
    (await hasFeature(session.user.email, 'prd-producer')) ||
    (await hasFeature(session.user.email, 'rd-viewer'));
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, commentId } = await params;
  const { resolved } = await req.json();

  const doc = await getDocumentEnvelope('prd', id);
  if (!doc || doc.deletedAt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const content = doc.contentJson as unknown as PRDDocument;
  const comment = content.comments.find((c) => c.id === commentId);
  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

  const isAuthor = comment.author === session.user.email;
  const isDocOwner = doc.userId === session.user.email;
  if (!isAuthor && !isDocOwner) {
    return NextResponse.json({ error: 'Only the comment author or document owner can resolve this' }, { status: 403 });
  }

  const updatedComments = content.comments.map((c) =>
    c.id === commentId ? { ...c, resolved: Boolean(resolved) } : c
  );
  const updatedContent: PRDDocument = { ...content, comments: updatedComments };
  await saveDocumentEnvelope({ ...doc, contentJson: updatedContent as unknown as Record<string, unknown> });

  return NextResponse.json({ comments: updatedComments });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- __tests__/app/api/prd/comments.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add app/api/prd/[id]/comments __tests__/app/api/prd/comments.test.ts
git commit -m "feat: add PRD comments API with commentor allowlist gating"
```

---

### Task 6: PRD export — DOCX (static) and HTML (live thin-client)

**Files:**
- Modify: `lib/prd-document-generator.ts`
- Create: `__tests__/lib/prd-document-generator-v2.test.ts`

**Interfaces:**
- Consumes: `PRDDocument`, `PRDSection`, `RequirementRow` from Task 1.
- Produces:
  ```ts
  export async function generatePRDDocxV2(doc: PRDDocument): Promise<Buffer>
  export function generatePRDHtmlV2(doc: PRDDocument, prdId: string): string
  ```
  (Added alongside the existing `generatePRDDocx`/`generatePRDHtml`, which stay in place until Task 8 deletes the old pipeline that calls them.)

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/prd-document-generator-v2.test.ts`:

```ts
import { generatePRDDocxV2, generatePRDHtmlV2 } from '@/lib/prd-document-generator';
import { PRDDocument } from '@/agent/agents/prd/prd-document-types';

const sampleDoc: PRDDocument = {
  sourceOnePagerId: 'op-1',
  productName: 'Widget Enclosure',
  preparedBy: 'Ori Shavit',
  version: '1.0',
  status: 'published',
  sections: [
    { key: 'overview', title: '1. Overview', enabled: true, content: 'An outdoor enclosure.' },
    { key: 'design_scope', title: '3. Design Scope', enabled: false, content: 'Should not appear.' },
    {
      key: 'requirements',
      title: '5. Requirements',
      enabled: true,
      content: [{ id: 'FR-1', category: 'Device & Electrical', requirement: 'House terminal', priority: 'Must' }],
    },
  ],
  comments: [],
};

describe('generatePRDDocxV2', () => {
  it('produces a non-empty DOCX buffer', async () => {
    const buffer = await generatePRDDocxV2(sampleDoc);
    expect(buffer.length).toBeGreaterThan(0);
  });
});

describe('generatePRDHtmlV2', () => {
  it('renders enabled sections and omits disabled ones', () => {
    const html = generatePRDHtmlV2(sampleDoc, 'prd-1');
    expect(html).toContain('An outdoor enclosure.');
    expect(html).not.toContain('Should not appear.');
  });

  it('renders the requirements table with FR-1 and priority Must', () => {
    const html = generatePRDHtmlV2(sampleDoc, 'prd-1');
    expect(html).toContain('FR-1');
    expect(html).toContain('Must');
    expect(html).toContain('House terminal');
  });

  it('embeds the PRD id and a comment panel script for the live thin-client', () => {
    const html = generatePRDHtmlV2(sampleDoc, 'prd-1');
    expect(html).toContain('prd-1');
    expect(html).toContain('/api/prd/prd-1/comments');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/prd-document-generator-v2.test.ts`
Expected: FAIL — `generatePRDDocxV2`/`generatePRDHtmlV2` not exported yet.

- [ ] **Step 3: Add `generatePRDDocxV2` and `generatePRDHtmlV2` to `lib/prd-document-generator.ts`**

Append to the end of the existing file (do not remove `generatePRDDocx`/`generatePRDHtml`/`escapeHtml` — they're reused):

```ts
import { PRDDocument, PRDSection, RequirementRow } from '@/agent/agents/prd/prd-document-types';

function isRequirementRows(content: PRDSection['content']): content is RequirementRow[] {
  return Array.isArray(content);
}

export async function generatePRDDocxV2(doc: PRDDocument): Promise<Buffer> {
  const titleParagraph = new Paragraph({
    children: [
      new TextRun({
        text: `${doc.productName} — Product Requirements Document`,
        bold: true,
        font: STYLE_CONFIG.fonts.primary,
        size: STYLE_CONFIG.sizes.title,
        color: STYLE_CONFIG.colors.heading,
      }),
    ],
    spacing: { after: STYLE_CONFIG.spacing.afterTitle },
  });

  const metaParagraph = new Paragraph({
    children: [
      new TextRun({
        text: `Prepared by: ${doc.preparedBy} — v${doc.version}`,
        font: STYLE_CONFIG.fonts.primary,
        size: STYLE_CONFIG.sizes.body,
        color: '666666',
      }),
    ],
    spacing: { after: 240 },
  });

  const sectionParagraphs: Paragraph[] = [];
  for (const section of doc.sections) {
    if (!section.enabled) continue;

    sectionParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: section.title,
            bold: true,
            font: STYLE_CONFIG.fonts.primary,
            size: STYLE_CONFIG.sizes.heading2,
            color: STYLE_CONFIG.colors.heading,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: STYLE_CONFIG.spacing.beforeHeading, after: STYLE_CONFIG.spacing.afterHeading },
      })
    );

    if (isRequirementRows(section.content)) {
      for (const row of section.content) {
        sectionParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${row.id} [${row.priority}] (${row.category}): ${row.requirement}`,
                font: STYLE_CONFIG.fonts.primary,
                size: STYLE_CONFIG.sizes.body,
              }),
            ],
            spacing: { after: STYLE_CONFIG.spacing.afterParagraph },
          })
        );
      }
    } else {
      sectionParagraphs.push(...renderSection(section.content));
    }
  }

  const document = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: [titleParagraph, metaParagraph, ...sectionParagraphs],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(document));
}

function renderRequirementsTableHtml(rows: RequirementRow[]): string {
  const rowsHtml = rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.id)}</td><td>${escapeHtml(r.category)}</td><td>${escapeHtml(r.requirement)}</td><td>${escapeHtml(r.priority)}</td></tr>`
    )
    .join('\n');
  return `<table class="requirements"><thead><tr><th>ID</th><th>Category</th><th>Requirement</th><th>Priority</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

export function generatePRDHtmlV2(doc: PRDDocument, prdId: string): string {
  const sectionsHtml = doc.sections
    .filter((s) => s.enabled)
    .map((section) => {
      const body = isRequirementRows(section.content)
        ? renderRequirementsTableHtml(section.content)
        : section.content
            .split('\n')
            .filter((l) => l.trim())
            .map((l) => `<p>${escapeHtml(l.trim())}</p>`)
            .join('\n');
      return `<section data-section-key="${escapeHtml(section.key)}"><h2>${escapeHtml(section.title)}</h2>${body}<div class="comment-panel" data-section-key="${escapeHtml(section.key)}"></div></section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(doc.productName)} — PRD</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.4; color: #000; max-width: 8in; margin: 0 auto; padding: 20px; }
    h1 { font-size: 20pt; font-weight: bold; margin-bottom: 6pt; color: #1D1F4A; }
    h2 { font-size: 16pt; font-weight: bold; margin-top: 18pt; margin-bottom: 6pt; color: #1D1F4A; }
    p { margin-bottom: 6pt; }
    table.requirements { border-collapse: collapse; width: 100%; margin: 12px 0; }
    table.requirements th, table.requirements td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 10pt; }
    .meta { color: #666; margin-bottom: 20px; }
    section { margin-bottom: 2em; }
    .comment-panel { border-top: 1px dashed #ccc; margin-top: 12px; padding-top: 8px; font-size: 10pt; }
    .comment-panel textarea { width: 100%; min-height: 60px; }
    .comment-list .comment { margin-bottom: 6px; padding: 6px; background: #f5f5f5; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(doc.productName)} — Product Requirements Document</h1>
  <p class="meta">Prepared by: ${escapeHtml(doc.preparedBy)} — v${escapeHtml(doc.version)}</p>
  ${sectionsHtml}
  <script>
    (function () {
      var PRD_ID = ${JSON.stringify(prdId)};
      var API_BASE = window.location.origin + '/api/prd/' + PRD_ID + '/comments';

      function renderComments(panel, sectionKey, comments) {
        panel.innerHTML = '';
        var list = document.createElement('div');
        list.className = 'comment-list';
        comments.filter(function (c) { return c.sectionKey === sectionKey; }).forEach(function (c) {
          var el = document.createElement('div');
          el.className = 'comment';
          el.textContent = c.author + ': ' + c.body + (c.resolved ? ' (resolved)' : '');
          list.appendChild(el);
        });
        panel.appendChild(list);

        var textarea = document.createElement('textarea');
        textarea.placeholder = 'Add a comment...';
        var button = document.createElement('button');
        button.textContent = 'Comment';
        button.onclick = function () {
          fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ sectionKey: sectionKey, body: textarea.value }),
          })
            .then(function (res) {
              if (res.status === 401) {
                window.location.href = '/api/auth/signin?callbackUrl=' + encodeURIComponent(window.location.href);
                return null;
              }
              return res.json();
            })
            .then(function (data) {
              if (data) renderComments(panel, sectionKey, data.comments);
            })
            .catch(function () {
              panel.querySelector('.comment-list').insertAdjacentHTML('beforeend', '<div class="comment">Comments unavailable.</div>');
            });
        };
        panel.appendChild(textarea);
        panel.appendChild(button);
      }

      fetch(API_BASE, { credentials: 'include' })
        .then(function (res) { return res.status === 200 ? res.json() : { comments: [] }; })
        .then(function (data) {
          document.querySelectorAll('.comment-panel').forEach(function (panel) {
            renderComments(panel, panel.getAttribute('data-section-key'), data.comments || []);
          });
        })
        .catch(function () {
          document.querySelectorAll('.comment-panel').forEach(function (panel) {
            panel.innerHTML = '<em>Comments unavailable.</em>';
          });
        });
    })();
  </script>
</body>
</html>`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/prd-document-generator-v2.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the deferred publish-route test from Task 4**

Run: `npm test -- __tests__/app/api/prd/id-route.test.ts`
Expected: PASS (all tests, including the publish test deferred in Task 4 Step 9 — it now compiles since `generatePRDDocxV2`/`generatePRDHtmlV2` exist)

- [ ] **Step 6: Commit**

```bash
git add lib/prd-document-generator.ts __tests__/lib/prd-document-generator-v2.test.ts app/api/prd/[id]/publish
git commit -m "feat: add PRD v2 export with static DOCX and live-thin-client HTML"
```

---

### Task 7: Review/edit UI at `/prd/[id]`

**Files:**
- Create: `app/prd/[id]/page.tsx`
- Create: `app/prd/[id]/PRDReviewClient.tsx`
- Create: `app/prd/[id]/components/RequirementsTableEditor.tsx`
- Create: `app/prd/[id]/components/SectionCard.tsx`
- Create: `app/prd/[id]/components/CommentPanel.tsx`
- Modify: `app/prd/page.tsx` (One-Pager picker — point "Generate PRD" action at the new `/api/prd/generate` route and new `/prd/[id]` destination instead of the old pipeline)

**Interfaces:**
- Consumes: `GET/PATCH /api/prd/[id]`, `POST /api/prd/[id]/publish`, `GET/POST /api/prd/[id]/comments`, `PATCH /api/prd/[id]/comments/[commentId]` from Tasks 4-6. `PRDDocument`, `PRDSection`, `RequirementRow`, `PRDComment` types from Task 1.

This task is UI-only (no new backend contracts) — since the plan format requires concrete code per step and a full React implementation here would be very long, this task is scoped to the minimum viable review/edit surface: section list with enabled toggle, textarea editing for text sections, row-editing table for requirements, comment panel per section, and Save/Publish buttons. Follow existing patterns from `app/one-pager/OnePagerClient.tsx` for the client-component/fetch/state-update structure — read that file first for the established conventions (loading states, error toasts, save-in-flight indicators) before writing the new components, so the PRD review UI feels consistent with the One-Pager editor rather than inventing a new interaction pattern.

- [ ] **Step 1: Read the existing One-Pager client component for conventions**

Run: `head -100 app/one-pager/OnePagerClient.tsx`

Note the patterns for: how save-in-progress is shown to the user, how errors surface, and how the component fetches on mount vs. receives server-fetched initial data as a prop.

- [ ] **Step 2: Create `app/prd/[id]/page.tsx`** (server component, mirrors `app/one-pager/page.tsx`'s auth-resolution pattern)

```tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDocumentEnvelope } from '@/lib/gcs/documents';
import PRDReviewClient from './PRDReviewClient';

export default async function PRDPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) redirect('/api/auth/signin');

  const { id } = await params;
  const doc = await getDocumentEnvelope('prd', id);
  if (!doc || doc.deletedAt) redirect('/prd');

  return <PRDReviewClient initialDocument={doc} currentUserEmail={session.user.email} />;
}
```

- [ ] **Step 3: Create `app/prd/[id]/components/RequirementsTableEditor.tsx`**

```tsx
'use client';

import { RequirementRow, SectionPriority } from '@/agent/agents/prd/prd-document-types';

interface Props {
  rows: RequirementRow[];
  onChange: (rows: RequirementRow[]) => void;
}

export default function RequirementsTableEditor({ rows, onChange }: Props) {
  function updateRow(index: number, patch: Partial<RequirementRow>) {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange(next);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  function moveRow(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function addRow() {
    const nextNum = rows.length + 1;
    onChange([...rows, { id: `FR-${nextNum}`, category: '', requirement: '', priority: 'Must' as SectionPriority }]);
  }

  return (
    <table>
      <thead>
        <tr>
          <th>ID</th><th>Category</th><th>Requirement</th><th>Priority</th><th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            <td><input value={row.id} onChange={(e) => updateRow(i, { id: e.target.value })} /></td>
            <td><input value={row.category} onChange={(e) => updateRow(i, { category: e.target.value })} /></td>
            <td><input value={row.requirement} onChange={(e) => updateRow(i, { requirement: e.target.value })} /></td>
            <td>
              <select value={row.priority} onChange={(e) => updateRow(i, { priority: e.target.value as SectionPriority })}>
                <option value="Must">Must</option>
                <option value="Nice to have">Nice to have</option>
              </select>
            </td>
            <td>
              <button type="button" onClick={() => moveRow(i, -1)} aria-label="Move up">↑</button>
              <button type="button" onClick={() => moveRow(i, 1)} aria-label="Move down">↓</button>
              <button type="button" onClick={() => removeRow(i)} aria-label="Remove row">✕</button>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr><td colSpan={5}><button type="button" onClick={addRow}>+ Add requirement</button></td></tr>
      </tfoot>
    </table>
  );
}
```

- [ ] **Step 4: Create `app/prd/[id]/components/CommentPanel.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { PRDComment } from '@/agent/agents/prd/prd-document-types';

interface Props {
  prdId: string;
  sectionKey: string;
  comments: PRDComment[];
  currentUserEmail: string;
  onCommentsChange: (comments: PRDComment[]) => void;
}

export default function CommentPanel({ prdId, sectionKey, comments, currentUserEmail, onCommentsChange }: Props) {
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const sectionComments = comments.filter((c) => c.sectionKey === sectionKey);

  async function submit() {
    if (!draft.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/prd/${prdId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionKey, body: draft }),
      });
      if (res.ok) {
        const data = await res.json();
        onCommentsChange(data.comments);
        setDraft('');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleResolved(comment: PRDComment) {
    const res = await fetch(`/api/prd/${prdId}/comments/${comment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved: !comment.resolved }),
    });
    if (res.ok) {
      const data = await res.json();
      onCommentsChange(data.comments);
    }
  }

  return (
    <div className="comment-panel">
      {sectionComments.map((c) => (
        <div key={c.id} style={{ opacity: c.resolved ? 0.5 : 1 }}>
          <strong>{c.author}</strong>: {c.body}
          {(c.author === currentUserEmail) && (
            <button type="button" onClick={() => toggleResolved(c)}>
              {c.resolved ? 'Unresolve' : 'Resolve'}
            </button>
          )}
        </div>
      ))}
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a comment..." />
      <button type="button" onClick={submit} disabled={submitting || !draft.trim()}>Comment</button>
    </div>
  );
}
```

- [ ] **Step 5: Create `app/prd/[id]/components/SectionCard.tsx`**

```tsx
'use client';

import { PRDSection, PRDComment, RequirementRow } from '@/agent/agents/prd/prd-document-types';
import RequirementsTableEditor from './RequirementsTableEditor';
import CommentPanel from './CommentPanel';

interface Props {
  prdId: string;
  section: PRDSection;
  comments: PRDComment[];
  currentUserEmail: string;
  onSectionChange: (section: PRDSection) => void;
  onCommentsChange: (comments: PRDComment[]) => void;
}

export default function SectionCard({ prdId, section, comments, currentUserEmail, onSectionChange, onCommentsChange }: Props) {
  return (
    <div className="section-card">
      <div className="section-header">
        <h3>{section.title}</h3>
        <label>
          <input
            type="checkbox"
            checked={section.enabled}
            onChange={(e) => onSectionChange({ ...section, enabled: e.target.checked })}
          />
          Enabled
        </label>
      </div>

      {section.enabled && (
        <>
          {Array.isArray(section.content) ? (
            <RequirementsTableEditor
              rows={section.content as RequirementRow[]}
              onChange={(rows) => onSectionChange({ ...section, content: rows })}
            />
          ) : (
            <textarea
              value={section.content as string}
              onChange={(e) => onSectionChange({ ...section, content: e.target.value })}
              rows={6}
            />
          )}
          <CommentPanel
            prdId={prdId}
            sectionKey={section.key}
            comments={comments}
            currentUserEmail={currentUserEmail}
            onCommentsChange={onCommentsChange}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create `app/prd/[id]/PRDReviewClient.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { PRDDocument, PRDSection, PRDComment } from '@/agent/agents/prd/prd-document-types';
import SectionCard from './components/SectionCard';

interface DocumentEnvelopeLike {
  id: string;
  version: string;
  contentJson: PRDDocument;
}

interface Props {
  initialDocument: DocumentEnvelopeLike;
  currentUserEmail: string;
}

export default function PRDReviewClient({ initialDocument, currentUserEmail }: Props) {
  const [doc, setDoc] = useState<PRDDocument>(initialDocument.contentJson);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateSection(updated: PRDSection) {
    setDoc((prev) => ({ ...prev, sections: prev.sections.map((s) => (s.key === updated.key ? updated : s)) }));
  }

  function updateComments(comments: PRDComment[]) {
    setDoc((prev) => ({ ...prev, comments }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/prd/${initialDocument.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: doc.sections }),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setPublishing(true);
    setError(null);
    try {
      await save();
      const res = await fetch(`/api/prd/${initialDocument.id}/publish`, { method: 'POST' });
      if (!res.ok) throw new Error('Publish failed');
      const data = await res.json();
      setDoc(data.document.contentJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="prd-review">
      <h1>{doc.productName} — PRD (v{doc.version})</h1>
      {error && <div className="error">{error}</div>}
      {doc.sections.map((section) => (
        <SectionCard
          key={section.key}
          prdId={initialDocument.id}
          section={section}
          comments={doc.comments}
          currentUserEmail={currentUserEmail}
          onSectionChange={updateSection}
          onCommentsChange={updateComments}
        />
      ))}
      <div className="actions">
        <button type="button" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        <button type="button" onClick={publish} disabled={publishing}>{publishing ? 'Publishing...' : 'Publish'}</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Update `app/prd/page.tsx` to point at the new flow**

Read the current file first:

Run: `cat app/prd/page.tsx`

Replace whatever currently triggers `/api/pipeline/prd/start` and navigates to `/prd/pipeline` with: a `POST` to `/api/prd/generate` with `{ onePagerId }`, then `router.push(`/prd/${result.document.id}`)` on success. Preserve the existing document-picker UI and `prd-producer` allowlist gate exactly as-is — only the generate-trigger and destination route change.

- [ ] **Step 8: Manual verification**

Run: `npm run dev`
Navigate to `/prd`, select a One-Pager, trigger generation, confirm redirect to `/prd/[id]` with all 11 sections rendered, edit a section and a requirement row, add a comment, click Publish, confirm version becomes `1.0` and no console errors appear.

- [ ] **Step 9: Commit**

```bash
git add app/prd
git commit -m "feat: add PRD review/edit UI with structured requirements editing and comments"
```

---

### Task 8: Remove the old broken PRD pipeline

**Files:**
- Delete: `app/api/pipeline/prd/start/route.ts`
- Delete: `app/api/pipeline/prd/[run_id]/resume/route.ts`
- Delete: `app/api/pipeline/prd/[run_id]/approve/route.ts`
- Delete: `app/api/pipeline/prd/[run_id]/export/route.ts`
- Delete: `app/prd/pipeline/page.tsx`
- Delete: `agent/agents/prd/one-pager-analyst-agent.ts`
- Delete: `agent/agents/prd/prd-architect-agent.ts`
- Delete: `agent/agents/prd/prd-writer-agent.ts`
- Delete: `agent/agents/prd/prd-qa-agent.ts`
- Delete: `lib/prd-db.ts`
- Create: `lib/db-migrations/005-drop-prd-tables.sql`
- Modify: `lib/db.ts` (remove `toPRDLibraryDocument`, which references the deleted `lib/prd-db.ts`)
- Modify: any test files that import the deleted modules

**Interfaces:** none produced — this is a deletion-only task.

- [ ] **Step 1: Find all references to the modules being deleted**

Run:
```bash
grep -rl "prd-db\|one-pager-analyst-agent\|prd-architect-agent\|prd-writer-agent\|prd-qa-agent\|pipeline/prd" --include="*.ts" --include="*.tsx" app agent lib __tests__
```

Read every file in the output before deleting anything — this determines the exact scope of Step 4's cleanup below (there may be additional call sites beyond `lib/db.ts` and `app/prd/page.tsx`, which was already updated in Task 7).

- [ ] **Step 2: Delete the old pipeline route files and pages**

```bash
git rm -r "app/api/pipeline/prd"
git rm "app/prd/pipeline/page.tsx"
```

- [ ] **Step 3: Delete the old agents and PRD DB module**

```bash
git rm "agent/agents/prd/one-pager-analyst-agent.ts"
git rm "agent/agents/prd/prd-architect-agent.ts"
git rm "agent/agents/prd/prd-writer-agent.ts"
git rm "agent/agents/prd/prd-qa-agent.ts"
git rm "lib/prd-db.ts"
```

Also delete their corresponding test files if present:

Run: `ls __tests__/agent/agents/prd/*.test.ts __tests__/lib/prd-db.test.ts 2>/dev/null`

For each old-agent test file found (matching the deleted agents above — do not delete `prd-generator-agent.test.ts` from Task 2), run `git rm <path>`.

- [ ] **Step 4: Remove `toPRDLibraryDocument` from `lib/db.ts`**

Modify `lib/db.ts` — delete the `toPRDLibraryDocument` function (currently the last function in the file, referencing `import('@/lib/prd-db').PRDDocument`). If any other file in the codebase imports `toPRDLibraryDocument` (check the Step 1 grep output), update that call site to use the PRD document envelope directly instead — the Documents Library feature (`docs/superpowers/plans/2026-04-27-documents-library.md`) is a separate in-progress feature; if it depends on this function, coordinate the fix there rather than leaving a dangling import.

- [ ] **Step 5: Also delete `loadPRDSections` (v1) and `config/prd-sections.yaml` (v1) once nothing references them**

Run: `grep -rl "loadPRDSections\b" --include="*.ts" agent lib __tests__` (note the word boundary — this must NOT match `loadPRDSectionsV2`)

If the only remaining references are inside `lib/prd-sections-loader.ts` itself (the function definition) after Step 3's deletions, remove the `loadPRDSections` function and its `PRDSectionConfig` interface from `lib/prd-sections-loader.ts`, and delete `config/prd-sections.yaml`:

```bash
git rm "config/prd-sections.yaml"
```

If other references remain, leave both v1 artifacts in place and note the blocker rather than deleting something still in use.

- [ ] **Step 6: Write the Postgres drop migration**

Create `lib/db-migrations/005-drop-prd-tables.sql`:

```sql
-- Migration 005: drop the old PRD pipeline tables.
-- The pre-rebuild PRD pipeline (analyst/architect/writer/QA agents, skeleton
-- approval gate) never produced a successfully reviewed PRD end-to-end —
-- confirmed with the user 2026-07-08. No data migration needed; these are
-- dropped, not moved to GCS.
DROP TABLE IF EXISTS prd_frames;
DROP TABLE IF EXISTS prd_documents;
DROP TABLE IF EXISTS pipeline_runs;
```

Do not run this migration against production yet — it's checked in as the documented next step, executed manually once Tasks 1-7 are verified working end-to-end in an environment pointed at real GCS/Drive (see Task 9 of the storage plan for the equivalent verification pattern).

- [ ] **Step 7: Run the full test suite**

Run: `npm test`
Expected: PASS — no test references a deleted module. If any test fails with a missing-module error, that file was missed in Step 3; delete or update it and re-run.

- [ ] **Step 8: Run the linter and type checker**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors. This catches any remaining dangling import that grep in Step 1 might have missed (e.g. a dynamic import or a type-only import).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: remove broken PRD pipeline (agents, routes, Postgres tables)"
```

---

### Task 9: Manual end-to-end verification

No code changes — verifies Tasks 1-8 work together before considering the PRD rebuild done. Requires the GCS Document Storage plan's Task 9 to have already passed (real GCS bucket and Drive folders wired up).

- [ ] **Step 1: Generate a PRD from a real One-Pager**

Run: `npm run dev`
Save or open an existing One-Pager, click through to generate a PRD. Confirm redirect to `/prd/[id]` with 11 sections, each populated with plausible content (not empty strings, not literal "N/A" everywhere).

- [ ] **Step 2: Verify the Requirements table**

Confirm the Requirements section renders as a table (not prose), with FR-1, FR-2, ... rows derived from the One-Pager's must-have/nice-to-have features, correct Priority values.

- [ ] **Step 3: Edit and save**

Edit a text section and a requirement row, toggle one section off, click Save. Reload the page and confirm the edits and toggle persisted (re-fetches from `/api/prd/[id]`).

- [ ] **Step 4: Comment as a second user**

Using a second Google account with the `commentor` allowlist flag (or `rd-viewer`) granted via `/admin/allowlist`, open the same `/prd/[id]` URL and add a comment on a section. Confirm the original owner sees it on next load.

- [ ] **Step 5: Publish and verify Drive export**

Click Publish. Confirm version becomes `1.0`, and check the PRD master Drive folder for a new project subfolder containing a `.docx`, `.html`, `{product}.json`, and `{product} - Changelog.md`.

- [ ] **Step 6: Open the exported HTML standalone and test live comments**

Download the `.html` file from Drive, open it directly in a browser (not via the app's dev server). Confirm the disabled section is absent, the requirements table renders, and adding a comment in the embedded panel round-trips against the live API (may require signing in if not already authenticated in that browser).

- [ ] **Step 7: Report results**

If any step fails, do not consider the PRD rebuild complete — file the discrepancy against the relevant task and fix before declaring this plan done.
