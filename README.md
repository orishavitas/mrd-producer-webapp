# MRD Producer Web App

**v0.4.0** | AI-powered Market Requirements Document generator

An AI-powered web application that generates comprehensive Market Requirements Documents (MRDs). It guides users through a progressive intake journey, conducts web research via Gemini's Google Search grounding, and produces structured 12-section MRDs following the Compulocks template format.

## Features

- **Progressive Intake Journey**: AI-driven guided flow with 6 topic categories, structured inputs + freetext, and adaptive question ordering
- **Kickstart Options**: Describe your product in freeform text (AI parses and pre-fills topics), upload a document, or import from link
- **Research Readiness Scoring**: Weighted completeness tracking across topics with visual progress indicators
- **Gap Analysis**: AI identifies missing information with severity levels (red: user-only, yellow: AI can estimate) before generation
- **Research Brief Review**: AI-generated summary with natural language revision support
- **Multi-Provider AI**: Gemini (with Google Search grounding), Claude, and OpenAI with automatic fallback
- **Document Export**: Download as Word (DOCX), PDF (print-ready), or standalone HTML
- **Design Token System**: Exportable tokens (DTCG spec JSON) for consistent styling across projects

## Architecture

Built with **Next.js 14** (App Router), **React 18**, **TypeScript 5.3**:

```
app/                        # Next.js App Router
├── page.tsx                # Landing page
├── intake/                 # Progressive intake flow
│   ├── page.tsx            # Guided intake (6 phases)
│   ├── results/page.tsx    # MRD display + download
│   ├── components/         # 8 reusable UI components
│   └── lib/                # State management, topic definitions
├── legacy/page.tsx         # Classic single-form generator
└── api/                    # API endpoints
    ├── generate/           # MRD generation
    ├── download/           # Document export
    ├── intake/             # 5 intake flow endpoints
    └── workflow/           # Legacy pipeline

agent/                      # Multi-agent orchestration system
├── core/                   # Base classes, types, execution context
├── agents/                 # Parser, gap analyzer, generators, reviewers
├── orchestrators/          # MRD, research, generation coordinators
└── patterns/               # Parallel execution, ensemble merging

lib/providers/              # AI provider abstraction
├── gemini-provider.ts      # Google Gemini (primary, with search grounding)
├── anthropic-provider.ts   # Anthropic Claude
├── openai-provider.ts      # OpenAI GPT
└── provider-chain.ts       # Automatic fallback chain

styles/tokens/              # Design token system (exportable)
├── tokens.json             # DTCG spec definitions
├── tokens.css              # CSS custom properties
├── typography.css           # Font scale + utilities
└── components.css          # Component-level compositions
```

## Getting Started

1. **Install Dependencies**:
    ```bash
    npm install
    ```

2. **Set Environment Variables**:
    ```bash
    GOOGLE_API_KEY=your-gemini-key      # Required
    ANTHROPIC_API_KEY=your-claude-key   # Optional (fallback)
    OPENAI_API_KEY=your-openai-key      # Optional (fallback)
    ```

3. **Run Development Server**:
    ```bash
    npm run dev
    ```

4. **Open Browser**:
    Navigate to [http://localhost:3000](http://localhost:3000)

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| **0.4.0** | 2026-02-08 | Progressive intake journey, design token system, 8 UI components, 5 intake API endpoints |
| **0.3.0** | 2026-02-03 | Document download (DOCX/PDF/HTML), Gemini search grounding, 12-section MRD template |
| **0.2.0** | 2026-02-03 | Multi-stage pipeline, input sanitization, gap analyzer, 65 tests |
| **0.1.0** | 2026-02-02 | Initial release, Gemini Pro integration, basic form UI |

See [CHANGELOG.md](CHANGELOG.md) for full details.

## Documentation

- [Changelog](CHANGELOG.md)
- [Design Plan: Progressive Intake](docs/plans/2026-02-08-progressive-intake-design.md)
- [Agent Architecture](docs/AGENT.md)
- [AI Provider Guide](docs/PROVIDERS.md)
- [Design Guide](docs/DESIGN_GUIDE.md)
- [Research Agents](docs/PHASE_4_RESEARCH_AGENTS.md)
- [Section Generators](docs/PHASE5_IMPLEMENTATION.md)
