# Integration Points
# mrd-producer-webapp Touch Points · What to Reuse · What to Extend

## Reuse As-Is (Do Not Touch)

| File/Module | What It Does | Used By |
|-------------|-------------|---------|
| `src/lib/ai/provider.ts` | Provider abstraction, API keys, retry logic | All agents |
| `src/db/client.ts` | Neon connection pool | All DB operations |
| `src/lib/agents/base.ts` | Agent base class | PRD agents (extend) |
| `src/lib/export/html.ts` | HTML generation pipeline | Frontend (reuse) |
| `src/lib/export/docx.ts` | DOCX export | Frontend (reuse) |
| `src/styles/brand-tokens.css` | Design tokens | All frames |

## Extend (Add To, Don't Modify)

| File/Module | Extension |
|-------------|-----------|
| `src/db/schema/` | Add `prd.ts` and `devlog.ts` |
| `src/app/api/` | Add `pipeline/`, `prd/`, `devlog/`, `frames/` routes |
| `src/lib/agents/` | Add `prd/` subdirectory |
| `src/components/` | Add `frames/`, `composer/`, `prd/`, `devlog/` |

## Before You Touch Anything

Run the test suite and categorize failures:

```bash
pnpm test 2>&1 | grep -E "FAIL|PASS" | sort | uniq -c
```

Shared infra failures (provider, DB, base agent) must be zero before building.
MRD-specific failures are acceptable — they don't block this branch.

## Monday.com Integration

Existing: Monday API token and board IDs are configured.
New: Webhook for "MRD Approved" status change → POST /api/pipeline/start.
Configuration: `MONDAY_WEBHOOK_SECRET` env var (for signature verification).
Reference: `roles/system-engineer.md` section "N8N WORKFLOW" for full trigger spec.
