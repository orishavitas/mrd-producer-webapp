# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MRD Producer is a Next.js web application that generates Market Requirements Documents (MRDs) using AI. It accepts product concepts, conducts web research via Gemini's Google Search grounding, and produces structured 12-section MRDs following the Compulocks template format.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm run lint         # Run ESLint
npm test             # Run all tests
npm test -- path/to/test.ts  # Run single test file
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report (50% threshold)
```

## Architecture

The codebase follows an **AgentOS pattern** separating orchestration from capabilities:

```
app/           # Next.js App Router - UI and API endpoints
├── api/
│   ├── generate/   # Main MRD generation endpoint
│   ├── download/   # Document export (DOCX, HTML, PDF)
│   └── workflow/   # Multi-stage stateful pipeline
├── page.tsx        # Main form UI

skills/        # Atomic capabilities (pure functions)
├── mrd_generator.ts  # MRD generation with 12-section template
├── gap_analyzer.ts   # Information gap detection
└── web_search.ts     # Legacy search (deprecated)

lib/           # Shared utilities
├── gemini.ts          # Gemini client with Google Search grounding
├── document-generator.ts  # DOCX/HTML generation
├── sanitize.ts        # Input sanitization against prompt injection
└── schemas.ts         # TypeScript interfaces for pipeline stages

references/    # Prompt templates and MRD specifications
├── 01_parse_request.md - 04_generate_mrd.md  # Pipeline stages
└── mrd-template-reference.md  # Document formatting specs
```

## Key Integration Points

### Gemini AI Client (`lib/gemini.ts`)
- Uses `@google/genai` SDK with `gemini-2.5-flash` model
- `generateText()` - Standard text generation
- `generateWithSearch()` - Generation with Google Search grounding (returns text + sources)
- `conductResearch()` - Research wrapper that extracts market data
- Requires `GOOGLE_API_KEY` environment variable (backend-only, no NEXT_PUBLIC prefix)

### MRD Template Structure
The MRD generator produces exactly 12 sections in order:
1. Purpose & Vision, 2. Problem Statement, 3. Target Market & Use Cases,
4. Target Users, 5. Product Description, 6. Key Requirements (with subsections),
7. Design & Aesthetics, 8. Target Price, 9. Risks and Thoughts,
10. Competition to review, 11. Additional Considerations, 12. Success Criteria

Each section separated by horizontal rules. See `references/mrd-template-reference.md` for exact formatting specs.

### Document Export (`lib/document-generator.ts`)
- Uses `docx` library for Word documents
- Generates print-ready HTML for PDF export via browser print
- Follows template specs: Arial font, US Letter size, 1" margins

## Testing

Tests are in `__tests__/` mirroring source structure. Jest with ts-jest preset.

```bash
# Run specific test file
npm test -- __tests__/lib/sanitize.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="sanitize"
```

Path alias `@/*` maps to project root (configured in both `tsconfig.json` and `jest.config.js`).

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Yes | Gemini API key for AI generation and search grounding |

No `GOOGLE_SEARCH_ENGINE_ID` needed - search uses Gemini's built-in grounding.

## Deployment

Deployed to Vercel. CI/CD via GitHub Actions (`.github/workflows/deploy.yml`).
Set environment variables in Vercel dashboard, not in code.
