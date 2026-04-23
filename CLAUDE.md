# CLAUDE.md

**Version: 1.2.0** — Brand token migration complete. Barlow fonts, green accent #009966, IBM Plex gone.
**In development (feature/prd-producer):** PRD Producer — 4-agent MRD→PRD transformation pipeline.

Two production tools:
1. **Main MRD Producer** (`/mrd`) — AI-powered 12-section MRD via Gemini Search grounding.
2. **One-Pager Generator** (`/one-pager`) — 7-section product spec, competitor scraper, feature chips, photo picker. **LIVE on main.**

Upcoming:
3. **PRD Producer** (`/prd`) — 4-agent chain transforms saved MRD into structured PRD. Human gate at Agent 2. Streaming UX. DOCX/HTML/PDF export. Design docs: `docs/prd-pipeline/`.

Architecture, directory tree, agent inventory, provider table: `docs/ARCHITECTURE.md`
Code examples (agent, research, provider chain): `docs/QUICK_START.md`

---

## Commands

```bash
npm run dev          # localhost:3000
npm run build
npm run lint
npm test
npm test -- path/to/test.ts
npm test -- --testNamePattern="name"
npm run test:coverage  # 50% threshold
```

Tests in `__tests__/` mirroring source. Jest + ts-jest. Path alias `@/*` = project root.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Yes | Gemini |
| `AUTH_SECRET` | Yes | NextAuth JWT — `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Yes | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | OAuth client secret |
| `POSTGRES_URL` | Yes | Neon Postgres |
| `ANTHROPIC_API_KEY` | No | Claude fallback |
| `OPENAI_API_KEY` | No | OpenAI fallback |
| `USE_MULTI_AGENT` | No | Enable new agent pipeline (default: legacy workflow.ts) |

Deployed to Vercel. Set env vars in Vercel dashboard. CI/CD: `.github/workflows/deploy.yml`.

---

## Brand Token System

Single source of truth: `styles/tokens/compulocks.css`
- `--brand-primary: #1D1F4A` | `--brand-highlight: #243469` | `--brand-green-dark: #009966` (CTA) | `--brand-green-light: #1db274`
- `--font-body: 'Barlow'` | `--font-heading: 'Barlow Condensed'` — IBM Plex is GONE
- `--brand-surface: #f2f2f2`
- Utility classes: `.section-heading` (69px), `.slide-title` (36px), `.small-title` (21px), `.paragraph-text` (18px), `.content-card` (24px radius, 1px #e0e0e0, 32px padding)
- `--accent` = `var(--brand-green-dark)` throughout — **never use teal `#0f766e`**
- `--op-*` tokens in `app/one-pager/one-pager-tokens.css` reference brand tokens via `var(--brand-green-dark, #009966)`
- DocumentPreview: h1=36px, h2=21px, h3=16px, body=18px (all Barlow)

---

## One-Pager Generator — Gotchas

- **API route must be dynamic**: `/api/one-pager/config` needs `export const dynamic = 'force-dynamic'` — without it Next.js bakes YAML at build time.
- **YAML features are plain strings**: `standard-features.yaml` uses string lists; `config-loader.ts` normalises to `{id, label}` — don't add object syntax to YAML.
- **M3 chips = `<button aria-pressed>`**: Never `<label><input type="checkbox"/>`. Global `button` style bleeds in — reset via `.one-pager-root button` in `one-pager-tokens.css`.
- **All `--op-*` tokens in one file**: `app/one-pager/one-pager-tokens.css` (light + dark). CSS modules reference tokens only — never hardcode hex.
- **Worktrees need secrets**: Copy `.env.local` manually — not inherited.
- **Photo state is an array**: `photoUrls: string[]` per competitor. `TOGGLE_COMPETITOR_PHOTO` adds or removes (includes() toggle). Never singular `photoUrl`.
- **Popover anchoring**: Need `position: relative` on the `chipWrapper` div wrapping trigger + popover — otherwise popovers escape to page bottom.
- **Logo in DOCX**: `ImageRun` in `Header` paragraph, `TabStopType.RIGHT` for flush-right. Pass `fs.readFileSync` result as `Buffer`.
- **Logo in HTML export**: Base64-encode buffer, embed as `data:image/png;base64,...` in `<img src>`.

**Key One-Pager files:**
- Tokens: `app/one-pager/one-pager-tokens.css`
- Feature config: `config/one-pager/standard-features.yaml`
- Industry/role config: `config/one-pager/industry-roles.yaml`
- State: `app/one-pager/lib/one-pager-state.ts`, `one-pager-context.tsx`
- Export: `app/api/one-pager/export/route.ts`
- Components: `app/one-pager/components/`

---

## Document Export

`lib/document-generator.ts` — `docx` for Word, print-ready HTML for PDF. Arial font, US Letter, 1" margins.
