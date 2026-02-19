# One-Pager Generator — Design Document

**Date:** 2026-02-19
**Branch:** `feature/one-pager` (new, from `main`)
**Route:** `/one-pager`

## Overview

A guided 1-page product specification tool. 7 input sections with a mix of free text, static checkboxes, dynamic checkboxes (industry→roles), chip inputs, and URL-based competitor extraction. Split-screen layout: inputs left, live document preview right.

Key difference from Brief Helper: less free-text, more guided selection. No AI gap detection or suggestions panel. AI is optional (expand text only when asked).

## Layout

Split-screen, same pattern as Brief Helper:
- **Left panel**: All 7 input sections, scrollable, always visible
- **Right panel**: Live document preview — updates in real time from text box content (no AI needed)

## The 7 Sections

### 1. Description (free text + optional AI expand)
- Text area for product description
- "Expand" button below text area
- On click: collapsible panel slides open below button showing AI-expanded version
- "Update" button in panel pushes polished text back to text area → preview updates
- Preview always shows current text box content in real time (raw or polished)
- No AI call unless user clicks Expand

### 2. Goal (free text + optional AI expand)
- Same pattern as Description
- Text area + Expand button + collapsible AI panel

### 3. Where (two static checkbox groups in one section)
- **Environment**: Indoor, Outdoor, Cloud, On-prem, etc. (predefined in YAML)
- **Industry**: Healthcare, Hospitality, Retail, Tech, etc. (predefined in YAML)
- Multi-select for both groups
- Industry selections drive Step 4 (Who) role population

### 4. Who (dynamic checkboxes + custom add)
- Checkboxes populated from YAML based on industries selected in Step 3
- Union of roles from all selected industries displayed
- "Add Custom" input: user types a role + Enter to add a custom checkbox
- Reactive: updates immediately when industry selections change

### 5. Features (chip input, two groups)
- **Must-Have**: type + Enter or comma to create chips
- **Nice-to-Have**: type + Enter or comma to create chips
- Renders as bulleted lists in preview

### 6. Commercials (two text fields)
- MOQ (Minimum Order Quantity)
- Target Price Range

### 7. Competitors (URL extraction + optional AI research)
- URL input field + confirm button (checkmark)
- On confirm: AI extracts brand, product name, short description, cost, link
- Extracted data shows as compact cards below input
- Can add multiple URLs
- Optional "AI Research" button to auto-find competitors
- Future: fetch product images

## Config Files

### `config/one-pager/industry-roles.yaml`
Human-editable YAML mapping industries to roles and defining environments:

```yaml
environments:
  - id: indoor
    label: Indoor
  - id: outdoor
    label: Outdoor
  - id: cloud
    label: Cloud
  - id: on-prem
    label: On-Premises

industries:
  healthcare:
    label: Healthcare
    roles:
      - Nurses
      - Doctors
      - Lab Technicians
      - Hospital Administrators
  hospitality:
    label: Hospitality
    roles:
      - Hostesses
      - Servers
      - Bartenders
      - Shift Managers
      - Hotel Front Desk
  retail:
    label: Retail
    roles:
      - Store Managers
      - Cashiers
      - Stock Associates
      - Visual Merchandisers
  # ... user adds more
```

### `lib/one-pager/config-loader.ts`
TypeScript loader with validation (same pattern as `lib/mrd/section-definitions.ts`).

## Data Schema

```typescript
interface OnePagerState {
  description: string;
  goal: string;
  context: {
    environments: string[];   // selected environment IDs
    industries: string[];     // selected industry IDs
  };
  audience: {
    predefined: string[];     // selected role strings
    custom: string[];         // user-added roles
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

interface CompetitorEntry {
  url: string;
  brand: string;
  productName: string;
  description: string;
  cost: string;
  link: string;
  status: 'pending' | 'extracting' | 'done' | 'error';
}
```

## AI Integration

- **Text expansion**: Simple single AI call. Provider chain with fallback. No gap detection.
- **Competitor extraction**: AI call to extract structured data from URL content.
- **AI Research** (optional): AI call to find competitors given product description + industry.
- All AI calls are opt-in. Zero AI calls for a fully manual fill.

## What Gets Reused
- Split-screen layout pattern (Brief Helper)
- Document preview component pattern
- Provider chain for AI calls (`lib/providers/`)
- DOCX export pattern (`lib/document-generator.ts`)
- sessionStorage persistence pattern

## What's New
- Checkbox-based input sections (Where, Who)
- Dynamic role population from YAML config
- Chip input component for features
- Collapsible AI expand panel (below button, not inline)
- URL-based competitor extraction cards
