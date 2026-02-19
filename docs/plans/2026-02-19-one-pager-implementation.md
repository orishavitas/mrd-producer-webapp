# One-Pager Generator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a guided 7-section product one-pager tool with split-screen layout, checkbox-based inputs, dynamic industry→role mapping, and optional AI text expansion.

**Architecture:** Next.js App Router page at `/one-pager`. YAML config for industry/role data loaded server-side. React Context + useReducer for state. Provider chain for AI calls. Same split-screen layout as Brief Helper.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS (module CSS), js-yaml, react-markdown, remark-gfm, docx library.

**Design doc:** `docs/plans/2026-02-19-one-pager-generator-design.md`

---

## Phase 1: Foundation (Config + State + Types)

### Task 1: Create branch and scaffold directories

**Files:**
- Create: `app/one-pager/` (directory)
- Create: `config/one-pager/` (directory)

**Step 1: Create feature branch from main**

```bash
git checkout main
git pull
git checkout -b feature/one-pager
```

**Step 2: Create directory structure**

```bash
mkdir -p app/one-pager/components
mkdir -p app/one-pager/lib
mkdir -p config/one-pager
mkdir -p lib/one-pager
mkdir -p app/api/one-pager
```

**Step 3: Commit**

```bash
git add .
git commit -m "chore: scaffold one-pager directory structure"
```

---

### Task 2: Create industry-roles YAML config

**Files:**
- Create: `config/one-pager/industry-roles.yaml`

**Step 1: Write the YAML config**

```yaml
# Industry-to-Role mapping for One-Pager Generator
# Edit this file to add/remove industries, environments, and roles.
# Roles in the "Who" section are populated based on selected industries.

environments:
  - id: indoor
    label: Indoor
  - id: outdoor
    label: Outdoor
  - id: cloud
    label: Cloud / SaaS
  - id: on-prem
    label: On-Premises
  - id: mobile
    label: Mobile / Field
  - id: warehouse
    label: Warehouse / Logistics

industries:
  healthcare:
    label: Healthcare
    roles:
      - Nurses
      - Doctors
      - Lab Technicians
      - Hospital Administrators
      - Pharmacists
      - Medical Assistants
  hospitality:
    label: Hospitality
    roles:
      - Hostesses
      - Servers
      - Bartenders
      - Shift Managers
      - Hotel Front Desk
      - Concierge
  retail:
    label: Retail
    roles:
      - Store Managers
      - Cashiers
      - Stock Associates
      - Visual Merchandisers
      - Loss Prevention
  technology:
    label: Technology
    roles:
      - Software Engineers
      - DevOps Engineers
      - Product Managers
      - IT Administrators
      - Data Analysts
  manufacturing:
    label: Manufacturing
    roles:
      - Plant Managers
      - Quality Inspectors
      - Machine Operators
      - Safety Officers
      - Production Supervisors
  education:
    label: Education
    roles:
      - Teachers
      - School Administrators
      - IT Coordinators
      - Librarians
      - Guidance Counselors
  finance:
    label: Finance & Banking
    roles:
      - Bank Tellers
      - Financial Advisors
      - Compliance Officers
      - Branch Managers
      - Loan Officers
  logistics:
    label: Logistics & Transportation
    roles:
      - Warehouse Managers
      - Drivers
      - Dispatch Coordinators
      - Inventory Specialists
      - Fleet Managers
  government:
    label: Government & Public Sector
    roles:
      - Civil Servants
      - Policy Analysts
      - Field Inspectors
      - Administrative Staff
      - IT Security Officers
```

**Step 2: Commit**

```bash
git add config/one-pager/industry-roles.yaml
git commit -m "feat: add industry-roles YAML config for one-pager"
```

---

### Task 3: Create YAML config loader (server-side)

**Files:**
- Create: `lib/one-pager/config-loader.ts`
- Test: `__tests__/lib/one-pager/config-loader.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/one-pager/config-loader.test.ts
import {
  loadIndustryRolesConfig,
  getEnvironments,
  getIndustries,
  getRolesForIndustries,
} from '@/lib/one-pager/config-loader';

describe('config-loader', () => {
  it('loads config without error', () => {
    const config = loadIndustryRolesConfig();
    expect(config).toBeDefined();
    expect(config.environments.length).toBeGreaterThan(0);
    expect(Object.keys(config.industries).length).toBeGreaterThan(0);
  });

  it('returns environments as array', () => {
    const envs = getEnvironments();
    expect(envs.length).toBeGreaterThan(0);
    expect(envs[0]).toHaveProperty('id');
    expect(envs[0]).toHaveProperty('label');
  });

  it('returns industry list', () => {
    const industries = getIndustries();
    expect(industries.length).toBeGreaterThan(0);
    expect(industries[0]).toHaveProperty('id');
    expect(industries[0]).toHaveProperty('label');
  });

  it('returns roles for selected industries', () => {
    const roles = getRolesForIndustries(['healthcare', 'hospitality']);
    expect(roles).toContain('Nurses');
    expect(roles).toContain('Doctors');
    expect(roles).toContain('Servers');
    expect(roles).toContain('Bartenders');
  });

  it('returns empty array for no industries', () => {
    const roles = getRolesForIndustries([]);
    expect(roles).toEqual([]);
  });

  it('deduplicates roles across industries', () => {
    const roles = getRolesForIndustries(['healthcare', 'healthcare']);
    const unique = [...new Set(roles)];
    expect(roles.length).toBe(unique.length);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/one-pager/config-loader.test.ts`
Expected: FAIL — module not found

**Step 3: Write the config loader**

```typescript
// lib/one-pager/config-loader.ts
/**
 * Industry-Roles Config Loader
 *
 * Loads config/one-pager/industry-roles.yaml.
 * Server-side only. Do NOT import from client components.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Types
export interface EnvironmentOption {
  id: string;
  label: string;
}

export interface IndustryConfig {
  label: string;
  roles: string[];
}

export interface IndustryRolesConfig {
  environments: EnvironmentOption[];
  industries: Record<string, IndustryConfig>;
}

// Cache
let cached: IndustryRolesConfig | null = null;

export function loadIndustryRolesConfig(): IndustryRolesConfig {
  if (cached) return cached;

  const configPath = path.join(process.cwd(), 'config', 'one-pager', 'industry-roles.yaml');
  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = yaml.load(raw) as IndustryRolesConfig;

  if (!parsed?.environments || !Array.isArray(parsed.environments)) {
    throw new Error('industry-roles.yaml must have an "environments" array');
  }
  if (!parsed?.industries || typeof parsed.industries !== 'object') {
    throw new Error('industry-roles.yaml must have an "industries" object');
  }

  cached = parsed;
  return parsed;
}

export function getEnvironments(): EnvironmentOption[] {
  return loadIndustryRolesConfig().environments;
}

export function getIndustries(): { id: string; label: string }[] {
  const config = loadIndustryRolesConfig();
  return Object.entries(config.industries).map(([id, { label }]) => ({ id, label }));
}

export function getRolesForIndustries(industryIds: string[]): string[] {
  const config = loadIndustryRolesConfig();
  const roleSet = new Set<string>();

  for (const id of industryIds) {
    const industry = config.industries[id];
    if (industry) {
      for (const role of industry.roles) {
        roleSet.add(role);
      }
    }
  }

  return Array.from(roleSet);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/one-pager/config-loader.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add lib/one-pager/config-loader.ts __tests__/lib/one-pager/config-loader.test.ts
git commit -m "feat: add industry-roles config loader with tests"
```

---

### Task 4: Create One-Pager state management

**Files:**
- Create: `app/one-pager/lib/one-pager-state.ts`
- Test: `__tests__/app/one-pager/lib/one-pager-state.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/app/one-pager/lib/one-pager-state.test.ts
import {
  onePagerReducer,
  createInitialState,
  OnePagerState,
  OnePagerAction,
} from '@/app/one-pager/lib/one-pager-state';

describe('onePagerReducer', () => {
  let state: OnePagerState;

  beforeEach(() => {
    state = createInitialState();
  });

  it('creates initial state with empty fields', () => {
    expect(state.description).toBe('');
    expect(state.goal).toBe('');
    expect(state.context.environments).toEqual([]);
    expect(state.context.industries).toEqual([]);
    expect(state.audience.predefined).toEqual([]);
    expect(state.audience.custom).toEqual([]);
    expect(state.features.mustHave).toEqual([]);
    expect(state.features.niceToHave).toEqual([]);
    expect(state.commercials.moq).toBe('');
    expect(state.commercials.targetPrice).toBe('');
    expect(state.competitors).toEqual([]);
  });

  it('SET_DESCRIPTION updates description', () => {
    const next = onePagerReducer(state, {
      type: 'SET_DESCRIPTION',
      payload: 'A smart thermostat',
    });
    expect(next.description).toBe('A smart thermostat');
  });

  it('SET_GOAL updates goal', () => {
    const next = onePagerReducer(state, {
      type: 'SET_GOAL',
      payload: 'Reduce energy usage',
    });
    expect(next.goal).toBe('Reduce energy usage');
  });

  it('TOGGLE_ENVIRONMENT adds/removes environment', () => {
    let next = onePagerReducer(state, {
      type: 'TOGGLE_ENVIRONMENT',
      payload: 'indoor',
    });
    expect(next.context.environments).toEqual(['indoor']);

    next = onePagerReducer(next, {
      type: 'TOGGLE_ENVIRONMENT',
      payload: 'indoor',
    });
    expect(next.context.environments).toEqual([]);
  });

  it('TOGGLE_INDUSTRY adds/removes industry', () => {
    let next = onePagerReducer(state, {
      type: 'TOGGLE_INDUSTRY',
      payload: 'healthcare',
    });
    expect(next.context.industries).toEqual(['healthcare']);

    next = onePagerReducer(next, {
      type: 'TOGGLE_INDUSTRY',
      payload: 'healthcare',
    });
    expect(next.context.industries).toEqual([]);
  });

  it('TOGGLE_ROLE adds/removes predefined role', () => {
    let next = onePagerReducer(state, {
      type: 'TOGGLE_ROLE',
      payload: 'Nurses',
    });
    expect(next.audience.predefined).toEqual(['Nurses']);

    next = onePagerReducer(next, {
      type: 'TOGGLE_ROLE',
      payload: 'Nurses',
    });
    expect(next.audience.predefined).toEqual([]);
  });

  it('ADD_CUSTOM_ROLE adds custom role', () => {
    const next = onePagerReducer(state, {
      type: 'ADD_CUSTOM_ROLE',
      payload: 'Specialist',
    });
    expect(next.audience.custom).toEqual(['Specialist']);
  });

  it('REMOVE_CUSTOM_ROLE removes custom role', () => {
    let next = onePagerReducer(state, {
      type: 'ADD_CUSTOM_ROLE',
      payload: 'Specialist',
    });
    next = onePagerReducer(next, {
      type: 'REMOVE_CUSTOM_ROLE',
      payload: 'Specialist',
    });
    expect(next.audience.custom).toEqual([]);
  });

  it('ADD_FEATURE adds must-have chip', () => {
    const next = onePagerReducer(state, {
      type: 'ADD_FEATURE',
      payload: { category: 'mustHave', feature: 'Waterproof' },
    });
    expect(next.features.mustHave).toEqual(['Waterproof']);
  });

  it('REMOVE_FEATURE removes chip', () => {
    let next = onePagerReducer(state, {
      type: 'ADD_FEATURE',
      payload: { category: 'mustHave', feature: 'Waterproof' },
    });
    next = onePagerReducer(next, {
      type: 'REMOVE_FEATURE',
      payload: { category: 'mustHave', feature: 'Waterproof' },
    });
    expect(next.features.mustHave).toEqual([]);
  });

  it('SET_MOQ updates moq', () => {
    const next = onePagerReducer(state, {
      type: 'SET_MOQ',
      payload: '1000',
    });
    expect(next.commercials.moq).toBe('1000');
  });

  it('SET_TARGET_PRICE updates target price', () => {
    const next = onePagerReducer(state, {
      type: 'SET_TARGET_PRICE',
      payload: '$50-100',
    });
    expect(next.commercials.targetPrice).toBe('$50-100');
  });

  it('ADD_COMPETITOR adds entry with pending status', () => {
    const next = onePagerReducer(state, {
      type: 'ADD_COMPETITOR',
      payload: { url: 'https://example.com' },
    });
    expect(next.competitors.length).toBe(1);
    expect(next.competitors[0].url).toBe('https://example.com');
    expect(next.competitors[0].status).toBe('pending');
  });

  it('UPDATE_COMPETITOR updates extraction data', () => {
    let next = onePagerReducer(state, {
      type: 'ADD_COMPETITOR',
      payload: { url: 'https://example.com' },
    });
    next = onePagerReducer(next, {
      type: 'UPDATE_COMPETITOR',
      payload: {
        url: 'https://example.com',
        data: {
          brand: 'Acme',
          productName: 'Widget',
          description: 'A widget',
          cost: '$99',
          status: 'done',
        },
      },
    });
    expect(next.competitors[0].brand).toBe('Acme');
    expect(next.competitors[0].status).toBe('done');
  });

  it('REMOVE_COMPETITOR removes entry', () => {
    let next = onePagerReducer(state, {
      type: 'ADD_COMPETITOR',
      payload: { url: 'https://example.com' },
    });
    next = onePagerReducer(next, {
      type: 'REMOVE_COMPETITOR',
      payload: 'https://example.com',
    });
    expect(next.competitors).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/app/one-pager/lib/one-pager-state.test.ts`
Expected: FAIL

**Step 3: Write the state module**

```typescript
// app/one-pager/lib/one-pager-state.ts

export interface CompetitorEntry {
  url: string;
  brand: string;
  productName: string;
  description: string;
  cost: string;
  status: 'pending' | 'extracting' | 'done' | 'error';
}

export interface OnePagerState {
  sessionId: string;
  lastUpdated: number;
  description: string;
  expandedDescription: string;
  goal: string;
  expandedGoal: string;
  context: {
    environments: string[];
    industries: string[];
  };
  audience: {
    predefined: string[];
    custom: string[];
  };
  features: {
    mustHave: string[];
    niceToHave: string[];
  };
  commercials: {
    moq: string;
    targetPrice: string;
  };
  competitors: CompetitorEntry[];
}

export type OnePagerAction =
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'SET_EXPANDED_DESCRIPTION'; payload: string }
  | { type: 'SET_GOAL'; payload: string }
  | { type: 'SET_EXPANDED_GOAL'; payload: string }
  | { type: 'TOGGLE_ENVIRONMENT'; payload: string }
  | { type: 'TOGGLE_INDUSTRY'; payload: string }
  | { type: 'TOGGLE_ROLE'; payload: string }
  | { type: 'ADD_CUSTOM_ROLE'; payload: string }
  | { type: 'REMOVE_CUSTOM_ROLE'; payload: string }
  | { type: 'ADD_FEATURE'; payload: { category: 'mustHave' | 'niceToHave'; feature: string } }
  | { type: 'REMOVE_FEATURE'; payload: { category: 'mustHave' | 'niceToHave'; feature: string } }
  | { type: 'SET_MOQ'; payload: string }
  | { type: 'SET_TARGET_PRICE'; payload: string }
  | { type: 'ADD_COMPETITOR'; payload: { url: string } }
  | { type: 'UPDATE_COMPETITOR'; payload: { url: string; data: Partial<CompetitorEntry> } }
  | { type: 'REMOVE_COMPETITOR'; payload: string };

function generateSessionId(): string {
  return `onepager-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function createInitialState(): OnePagerState {
  return {
    sessionId: generateSessionId(),
    lastUpdated: Date.now(),
    description: '',
    expandedDescription: '',
    goal: '',
    expandedGoal: '',
    context: { environments: [], industries: [] },
    audience: { predefined: [], custom: [] },
    features: { mustHave: [], niceToHave: [] },
    commercials: { moq: '', targetPrice: '' },
    competitors: [],
  };
}

function toggleInArray(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}

export function onePagerReducer(state: OnePagerState, action: OnePagerAction): OnePagerState {
  const base = { ...state, lastUpdated: Date.now() };

  switch (action.type) {
    case 'SET_DESCRIPTION':
      return { ...base, description: action.payload };

    case 'SET_EXPANDED_DESCRIPTION':
      return { ...base, expandedDescription: action.payload };

    case 'SET_GOAL':
      return { ...base, goal: action.payload };

    case 'SET_EXPANDED_GOAL':
      return { ...base, expandedGoal: action.payload };

    case 'TOGGLE_ENVIRONMENT':
      return {
        ...base,
        context: {
          ...base.context,
          environments: toggleInArray(base.context.environments, action.payload),
        },
      };

    case 'TOGGLE_INDUSTRY':
      return {
        ...base,
        context: {
          ...base.context,
          industries: toggleInArray(base.context.industries, action.payload),
        },
      };

    case 'TOGGLE_ROLE':
      return {
        ...base,
        audience: {
          ...base.audience,
          predefined: toggleInArray(base.audience.predefined, action.payload),
        },
      };

    case 'ADD_CUSTOM_ROLE':
      return {
        ...base,
        audience: {
          ...base.audience,
          custom: [...base.audience.custom, action.payload],
        },
      };

    case 'REMOVE_CUSTOM_ROLE':
      return {
        ...base,
        audience: {
          ...base.audience,
          custom: base.audience.custom.filter((r) => r !== action.payload),
        },
      };

    case 'ADD_FEATURE':
      return {
        ...base,
        features: {
          ...base.features,
          [action.payload.category]: [
            ...base.features[action.payload.category],
            action.payload.feature,
          ],
        },
      };

    case 'REMOVE_FEATURE':
      return {
        ...base,
        features: {
          ...base.features,
          [action.payload.category]: base.features[action.payload.category].filter(
            (f) => f !== action.payload.feature
          ),
        },
      };

    case 'SET_MOQ':
      return { ...base, commercials: { ...base.commercials, moq: action.payload } };

    case 'SET_TARGET_PRICE':
      return { ...base, commercials: { ...base.commercials, targetPrice: action.payload } };

    case 'ADD_COMPETITOR':
      return {
        ...base,
        competitors: [
          ...base.competitors,
          {
            url: action.payload.url,
            brand: '',
            productName: '',
            description: '',
            cost: '',
            status: 'pending',
          },
        ],
      };

    case 'UPDATE_COMPETITOR':
      return {
        ...base,
        competitors: base.competitors.map((c) =>
          c.url === action.payload.url ? { ...c, ...action.payload.data } : c
        ),
      };

    case 'REMOVE_COMPETITOR':
      return {
        ...base,
        competitors: base.competitors.filter((c) => c.url !== action.payload),
      };

    default:
      return state;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/app/one-pager/lib/one-pager-state.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add app/one-pager/lib/one-pager-state.ts __tests__/app/one-pager/lib/one-pager-state.test.ts
git commit -m "feat: add one-pager state management with tests"
```

---

### Task 5: Create React Context with sessionStorage persistence

**Files:**
- Create: `app/one-pager/lib/one-pager-context.tsx`

**Step 1: Write context provider**

Follow exact pattern from `app/brief-helper/lib/brief-context.tsx` — useReducer + sessionStorage hydration on mount + sync on state change.

```typescript
// app/one-pager/lib/one-pager-context.tsx
'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import {
  OnePagerState,
  OnePagerAction,
  onePagerReducer,
  createInitialState,
} from './one-pager-state';

const STORAGE_KEY = 'one-pager-state';

interface OnePagerContextValue {
  state: OnePagerState;
  dispatch: React.Dispatch<OnePagerAction>;
  reset: () => void;
}

const OnePagerContext = createContext<OnePagerContextValue | null>(null);

function loadFromStorage(): OnePagerState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Basic shape validation
    if (parsed && typeof parsed.sessionId === 'string' && parsed.context) {
      return parsed as OnePagerState;
    }
    return null;
  } catch {
    return null;
  }
}

export function OnePagerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(
    onePagerReducer,
    null,
    () => loadFromStorage() ?? createInitialState()
  );

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const reset = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    // Force reload to get fresh state
    window.location.reload();
  }, []);

  return (
    <OnePagerContext.Provider value={{ state, dispatch, reset }}>
      {children}
    </OnePagerContext.Provider>
  );
}

export function useOnePager(): OnePagerContextValue {
  const ctx = useContext(OnePagerContext);
  if (!ctx) throw new Error('useOnePager must be used within OnePagerProvider');
  return ctx;
}
```

**Step 2: Commit**

```bash
git add app/one-pager/lib/one-pager-context.tsx
git commit -m "feat: add one-pager React context with sessionStorage"
```

---

## Phase 2: API Endpoints

### Task 6: Create config API endpoint (serves industry/role data to client)

**Files:**
- Create: `app/api/one-pager/config/route.ts`

**Step 1: Write the endpoint**

```typescript
// app/api/one-pager/config/route.ts
import { NextResponse } from 'next/server';
import { getEnvironments, getIndustries, loadIndustryRolesConfig } from '@/lib/one-pager/config-loader';

export async function GET() {
  try {
    const config = loadIndustryRolesConfig();
    return NextResponse.json({
      environments: config.environments,
      industries: getIndustries(),
      rolesByIndustry: Object.fromEntries(
        Object.entries(config.industries).map(([id, data]) => [id, data.roles])
      ),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/one-pager/config/route.ts
git commit -m "feat: add config API endpoint for one-pager"
```

---

### Task 7: Create text expansion API endpoint

**Files:**
- Create: `app/api/one-pager/expand/route.ts`

**Step 1: Write the endpoint**

Simple AI call — takes text + field name, returns expanded professional paragraph. Uses provider chain.

```typescript
// app/api/one-pager/expand/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getProviderChain } from '@/lib/providers/provider-chain';

export async function POST(request: NextRequest) {
  try {
    const { text, field } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return NextResponse.json(
        { error: 'Text must be at least 10 characters' },
        { status: 400 }
      );
    }

    const chain = getProviderChain();
    const systemPrompt = `You are a professional product specification writer. Expand the user's brief ${field} input into a clear, professional paragraph. Keep the original meaning. Do not add information the user didn't provide. Be concise but thorough. Return only the expanded text, no preamble.`;

    const { result } = await chain.executeWithFallback(
      (provider) => provider.generateText(text, systemPrompt)
    );

    return NextResponse.json({ expanded: result.text });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Expansion failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/one-pager/expand/route.ts
git commit -m "feat: add text expansion API endpoint for one-pager"
```

---

### Task 8: Create competitor extraction API endpoint

**Files:**
- Create: `app/api/one-pager/extract-competitor/route.ts`

**Step 1: Write the endpoint**

Takes a URL, uses AI to extract structured competitor data.

```typescript
// app/api/one-pager/extract-competitor/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getProviderChain } from '@/lib/providers/provider-chain';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const chain = getProviderChain();
    const systemPrompt = `You are a product analyst. Given a product URL, extract structured data. Return ONLY valid JSON with these fields:
{
  "brand": "company/brand name",
  "productName": "product name",
  "description": "1-2 sentence product description",
  "cost": "price or price range if available, empty string if not",
  "link": "the URL provided"
}
Do not include any text outside the JSON.`;

    const { result } = await chain.executeWithFallback(
      (provider) => provider.generateText(
        `Extract product information from this URL: ${url}`,
        systemPrompt
      )
    );

    const parsed = JSON.parse(result.text);
    return NextResponse.json({ success: true, data: { ...parsed, link: url } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Extraction failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/one-pager/extract-competitor/route.ts
git commit -m "feat: add competitor extraction API endpoint"
```

---

## Phase 3: UI Components

### Task 9: Create SplitLayout and page shell

**Files:**
- Create: `app/one-pager/components/SplitLayout.tsx`
- Create: `app/one-pager/components/SplitLayout.module.css`
- Create: `app/one-pager/page.tsx`
- Create: `app/one-pager/page.module.css`

Reuse the exact same split-screen pattern from `app/brief-helper/components/SplitLayout.tsx`. Left panel = scrollable input sections. Right panel = document preview. Wire up OnePagerProvider.

**Step 1: Create layout + page shell, render all 7 section placeholders on left, markdown preview on right.**

**Step 2: Commit**

```bash
git add app/one-pager/
git commit -m "feat: add one-pager page shell with split layout"
```

---

### Task 10: Create TextFieldWithExpand component

**Files:**
- Create: `app/one-pager/components/TextFieldWithExpand.tsx`
- Create: `app/one-pager/components/TextFieldWithExpand.module.css`

This is the key new component. Pattern:
- Text area at top (user types, live updates preview)
- "Expand" button below text area
- Collapsible panel below button (hidden by default)
- When expanded: shows AI-generated text + "Update" button
- "Update" pushes expanded text into the text area
- Loading spinner while AI is processing

**Step 1: Build component with expand/collapse animation, loading state, update callback.**

**Step 2: Commit**

```bash
git add app/one-pager/components/TextFieldWithExpand.*
git commit -m "feat: add TextFieldWithExpand component with AI expand panel"
```

---

### Task 11: Create CheckboxGroup component (for Where section)

**Files:**
- Create: `app/one-pager/components/CheckboxGroup.tsx`
- Create: `app/one-pager/components/CheckboxGroup.module.css`

Generic multi-select checkbox group. Props: `label`, `options: {id, label}[]`, `selected: string[]`, `onToggle: (id) => void`.

**Step 1: Build component.**

**Step 2: Commit**

```bash
git add app/one-pager/components/CheckboxGroup.*
git commit -m "feat: add CheckboxGroup component"
```

---

### Task 12: Create DynamicRoleSelector component (for Who section)

**Files:**
- Create: `app/one-pager/components/DynamicRoleSelector.tsx`
- Create: `app/one-pager/components/DynamicRoleSelector.module.css`

Shows checkboxes for roles based on selected industries. Fetches role data from `/api/one-pager/config` on mount (cached). Includes "Add Custom" input field at bottom.

Props: `selectedIndustries: string[]`, `selectedRoles: string[]`, `customRoles: string[]`, `onToggleRole`, `onAddCustom`, `onRemoveCustom`.

**Step 1: Build component. Fetch config, compute union of roles for selected industries, render checkboxes + custom input.**

**Step 2: Commit**

```bash
git add app/one-pager/components/DynamicRoleSelector.*
git commit -m "feat: add DynamicRoleSelector component with custom role support"
```

---

### Task 13: Create ChipInput component (for Features section)

**Files:**
- Create: `app/one-pager/components/ChipInput.tsx`
- Create: `app/one-pager/components/ChipInput.module.css`

Text input where Enter or comma creates a chip. Each chip has an X to remove. Props: `label`, `chips: string[]`, `onAdd: (chip) => void`, `onRemove: (chip) => void`.

**Step 1: Build component.**

**Step 2: Commit**

```bash
git add app/one-pager/components/ChipInput.*
git commit -m "feat: add ChipInput component for feature entry"
```

---

### Task 14: Create CompetitorInput component

**Files:**
- Create: `app/one-pager/components/CompetitorInput.tsx`
- Create: `app/one-pager/components/CompetitorInput.module.css`

URL input + confirm (checkmark) button. On confirm, calls `/api/one-pager/extract-competitor`. Shows compact cards for extracted competitors. Each card: brand, product name, description, cost, link. Remove button per card.

**Step 1: Build component.**

**Step 2: Commit**

```bash
git add app/one-pager/components/CompetitorInput.*
git commit -m "feat: add CompetitorInput component with URL extraction"
```

---

### Task 15: Create DocumentPreview component

**Files:**
- Create: `app/one-pager/components/DocumentPreview.tsx`
- Create: `app/one-pager/components/DocumentPreview.module.css`

Right-panel live preview. Generates markdown from OnePagerState in real time. Uses react-markdown + remark-gfm. Sections appear as they're filled in.

**Step 1: Build component. Map state to markdown sections. Render with ReactMarkdown.**

**Step 2: Commit**

```bash
git add app/one-pager/components/DocumentPreview.*
git commit -m "feat: add one-pager DocumentPreview component"
```

---

## Phase 4: Wire Everything Together

### Task 16: Wire all components into page.tsx

**Files:**
- Modify: `app/one-pager/page.tsx`

**Step 1: Import all components. Render 7 sections using state from useOnePager(). Connect dispatch actions. Left panel: Description, Goal, Where, Who, Features, Commercials, Competitors. Right panel: DocumentPreview.**

**Step 2: Commit**

```bash
git add app/one-pager/page.tsx
git commit -m "feat: wire all one-pager sections into main page"
```

---

### Task 17: Add one-pager to landing page

**Files:**
- Modify: `app/page.tsx`

**Step 1: Add a card for "One-Pager Generator" linking to `/one-pager` with appropriate description and status badge.**

**Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add one-pager to landing page"
```

---

### Task 18: Manual smoke test

**Step 1: Run dev server**

```bash
npm run dev
```

**Step 2: Test the full flow in browser**

1. Navigate to `/one-pager`
2. Type in Description → verify preview updates live
3. Click Expand → verify panel opens with AI text → click Update → verify text box updates
4. Same for Goal
5. Select environments and industries in Where → verify checkboxes work
6. Verify Who section shows roles for selected industries
7. Add a custom role → verify it appears
8. Type features with Enter/comma → verify chips appear
9. Fill MOQ and price
10. Add a competitor URL → click confirm → verify extraction
11. Verify document preview shows all sections

**Step 3: Commit any fixes**

```bash
git add .
git commit -m "fix: smoke test fixes for one-pager"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1: Foundation | 1-5 | Branch, YAML config, config loader, state, context |
| 2: API | 6-8 | Config endpoint, expand endpoint, competitor extraction |
| 3: UI | 9-15 | All 7 input components + preview |
| 4: Integration | 16-18 | Wired page, landing page link, smoke test |

**Total: 18 tasks across 4 phases.**

**Parallel opportunities:**
- Tasks 6, 7, 8 (three API endpoints) can run in parallel
- Tasks 10, 11, 12, 13, 14, 15 (six UI components) can run in parallel
- Task 9 (page shell) must come before Task 16 (wiring)
