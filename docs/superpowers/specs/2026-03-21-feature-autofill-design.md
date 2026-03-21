# Feature Auto-Fill — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## What it does

When the user has written a product description (and optionally goal/use cases), a new API endpoint reads that text and maps it to the existing YAML feature chips, pre-populating `features.mustHave` and `features.niceToHave` in the one-pager-beta state. The user then adjusts from there.

## Trigger

A **"Auto-fill Features"** button in the FeatureSelector section header (beta only). Disabled until `description` has at least 20 characters. Shows a spinner while running. On completion, chips animate into their buckets.

## API

`POST /api/one-pager-beta/suggest-features`

**Request:**
```json
{
  "description": "string",
  "goal": "string (optional)",
  "useCases": "string (optional)",
  "availableFeatures": [
    { "category": "Screen Size", "features": ["Small (6\"–10\")", "Medium (10\"–15\")", ...] }
  ]
}
```

**Response:**
```json
{
  "mustHave": ["Large (15\"–24\")", "Wall Mount", "Cable Management"],
  "niceToHave": ["Auto-Rotate", "Tamper-Proof Screws"],
  "reasoning": "Brief explanation string"
}
```

All values in `mustHave`/`niceToHave` must be exact label matches from `availableFeatures`. AI is instructed to return only labels present in the input list.

## AI Prompt Strategy

System prompt instructs the model to:
1. Read the product description and identify physical/functional requirements
2. Map each requirement to the closest matching feature label from the provided list
3. Classify: must-have = core to the product's function; nice-to-have = beneficial but not essential
4. Return strict JSON only — no features outside the provided list
5. If uncertain about a feature, omit it (per user rule: "if uncertain, do not add")

## State Update

On success, dispatch:
- `SET_FEATURES` action: `{ mustHave: string[], niceToHave: string[] }` — replaces (not merges) current selections

New reducer action needed in `one-pager-beta/lib/one-pager-state.ts`.

## Error Handling

- API failure → toast error, no state change
- Partial JSON → parse what's valid, discard the rest
- Empty response → no-op, button resets

## Scope

Beta only (`app/one-pager-beta/`). Does not touch `/one-pager`.
