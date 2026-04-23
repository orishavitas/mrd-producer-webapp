# Architecture Reference

## Directory Structure

```
app/                    # Next.js App Router
├── one-pager/          # One-Pager Generator
│   ├── components/     # SplitLayout, TextFieldWithExpand, CheckboxGroup,
│   │                   # DynamicRoleSelector, ChipInput, CompetitorInput, DocumentPreview
│   └── lib/            # one-pager-state, one-pager-context
├── api/
│   ├── generate/       # Main MRD generation endpoint
│   ├── download/       # Document export (DOCX, HTML, PDF)
│   ├── one-pager/      # One-Pager endpoints (config, expand, extract-competitor)
│   └── workflow/       # Multi-stage stateful pipeline

agent/                  # Multi-agent orchestration system
├── core/               # types.ts, base-agent.ts, execution-context.ts
├── agents/
│   ├── parser-agent.ts, gap-analyzer-agent.ts, mrd-generator-agent.ts
│   ├── research/       # base-researcher, competitor-researcher, trend-researcher, pricing-researcher
│   ├── generators/     # base-section-generator, market (1-4), technical (5-7), strategy (8-12)
│   └── reviewers/      # quality-reviewer, ensemble-reviewer
├── orchestrators/      # mrd-orchestrator, research-orchestrator, generation-orchestrator
├── patterns/           # parallel-executor, ensemble-merger
└── workflow.ts         # Legacy workflow (backward compatible)

lib/
├── providers/          # types.ts, gemini-provider, anthropic-provider, openai-provider, provider-chain
├── gemini.ts           # Legacy Gemini client
├── document-generator.ts
├── sanitize.ts
├── schemas.ts
└── one-pager/config-loader.ts  # YAML loader (server-side only)

config/
├── agents/default.yaml          # Agent config, provider priority, feature flags
└── one-pager/
    ├── industry-roles.yaml      # Industry-to-role mapping
    └── standard-features.yaml  # Feature chip palette (plain string lists)

skills/                 # mrd_generator.ts, gap_analyzer.ts, web_search.ts (deprecated)
references/             # Prompt templates: 01_parse_request.md–04_generate_mrd.md, mrd-template-reference.md
```

## AI Providers

| Provider | Search Grounding | Status |
|----------|-----------------|--------|
| Gemini   | Yes (Google Search) | Active — primary |
| Claude   | No | Active — fallback |
| OpenAI   | No | Active — fallback |

Provider priority order configured in `config/agents/default.yaml`. Automatic fallback on failure.

## MRD Template — 12 Sections

1. Purpose & Vision
2. Problem Statement
3. Target Market & Use Cases
4. Target Users
5. Product Description
6. Key Requirements (dynamic subsections)
7. Design & Aesthetics
8. Target Price
9. Risks and Thoughts
10. Competition to review
11. Additional Considerations
12. Success Criteria

Full formatting spec: `references/mrd-template-reference.md`

## Multi-Agent Concepts

**Agents** extend `BaseAgent<Input, Output>` from `agent/core/base-agent.ts`. Override `executeCore()`.

**ExecutionContext** (`agent/core/execution-context.ts`): `getProvider()`, `getFallbackChain()`, `state` Map, `log()`, `config`.

**USE_MULTI_AGENT=true** env var enables the new pipeline. Default: legacy `workflow.ts`.

Full behavioral contracts: `docs/AGENT.md` | Provider guide: `docs/PROVIDERS.md`
