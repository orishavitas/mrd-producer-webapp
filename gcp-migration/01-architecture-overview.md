# Architecture Overview
> **Audience:** IT team — understanding what you are taking over before migration begins.

---

## What This App Does

`mrd-producer-webapp` is an internal R&D tool with two features:

1. **MRD Producer** (`/mrd`) — AI-powered 12-section Market Requirements Documents using Gemini with Google Search grounding.
2. **One-Pager Generator** (`/one-pager`) — Guided 7-section product spec with free-text fields, industry/role chips, feature selectors, competitor URL extraction, and DOCX/PDF export.

Both tools are used by the R&D team to generate and share product documents with other teams.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | CSS Modules + Material 3 design tokens |
| AI | Google Gemini (`@google/genai`), Anthropic Claude, OpenAI |
| Auth | NextAuth.js v5 + Google OAuth 2.0 |
| Database | PostgreSQL (currently Vercel Postgres) |
| Export | DOCX (`docx` npm), HTML, PDF |
| Runtime | Node.js 20 |

---

## Current Hosting Topology

```
User browser
    │
    ▼
Vercel (Production host)
    ├── Serves Next.js app (SSR + static)
    ├── Runs API routes (serverless functions)
    └── Provides Postgres database (Vercel Postgres)

External services called by Vercel at runtime:
    ├── GitHub (source of truth, CI/CD trigger)
    ├── Google OAuth (user authentication)
    ├── Gemini API (AI text generation + search grounding)
    ├── Anthropic Claude API (AI fallback)
    └── Google Custom Search API (web search for MRD)
```

**CI/CD flow (current):**
`git push main` → GitHub Actions → `npm run build` → Vercel CLI deploy → live on Vercel domain

**PR previews:**
`git push <branch>` → GitHub Actions → Vercel CLI deploy → temporary preview URL

---

## App Structure (Key Directories)

```
app/                    # Next.js pages and API routes
├── mrd/                # MRD Producer page
├── one-pager/          # One-Pager Generator page + components
├── api/
│   ├── generate/       # MRD generation endpoint
│   ├── one-pager/      # One-Pager endpoints (config, expand, export)
│   ├── documents/      # CRUD for saved documents
│   └── drive/sync      # Google Drive sync stub (returns 501 — not yet active)

lib/                    # Shared utilities and server-side code
├── auth.ts             # NextAuth.js v5 config (Google OAuth)
├── db.ts               # Database helpers (currently @vercel/postgres)
├── providers/          # AI provider abstraction (Gemini, Claude, OpenAI)

agent/                  # Multi-agent AI orchestration system
config/                 # YAML config files (industry roles, features, agents)
```

---

## Environment Variables (Full Inventory)

All secrets currently live in Vercel's environment variable dashboard.
After migration, these move to **Google Secret Manager**.

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Yes | Gemini API key + Google Custom Search |
| `GOOGLE_SEARCH_ENGINE_ID` | Yes | Custom Search Engine ID |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID (from Google Cloud Console) |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `AUTH_SECRET` | Yes | Random 32-byte secret for NextAuth JWT signing |
| `POSTGRES_URL` | Yes | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | No | Claude API key (fallback AI provider) |
| `OPENAI_API_KEY` | No | OpenAI API key (fallback AI provider) |
| `USE_MULTI_AGENT` | No | Set to `true` to enable multi-agent AI system |

> **Note:** `AUTH_SECRET` can be generated with: `openssl rand -base64 32`

---

## Google Services Already in Use

| Service | How It's Used | Status |
|---------|--------------|--------|
| Google OAuth 2.0 | User login via NextAuth.js | Active |
| Gemini API | AI text generation + search grounding | Active |
| Google Custom Search | Web search for MRD competitor research | Active |
| Google Drive | Sync documents to user's Drive folder | Stub (501) — not yet active |
| Gmail | Read/attach files from Gmail | Planned — not yet built |

---

## What Changes in Migration vs. What Stays the Same

### Stays the Same
- GitHub repository (source of truth — no changes)
- Next.js application code (no business logic changes)
- NextAuth.js + Google OAuth configuration (only callback URL changes)
- Gemini, Claude, OpenAI integrations (just move API keys to Secret Manager)
- Vercel (retained for PR preview deployments)
- All YAML config files, components, agent system

### Changes
| Current | After Migration |
|---------|----------------|
| Vercel production hosting | Google Cloud Run |
| Vercel Postgres | Cloud SQL (PostgreSQL) — see `04-database-options.md` for options |
| `@vercel/postgres` npm package | `pg` package — requires one code change in `lib/db.ts` |
| Vercel environment variables | Google Secret Manager |
| Vercel deploy in GitHub Actions | Cloud Run deploy in GitHub Actions |
| Vercel-assigned domain | Custom domain via GCP |
| OAuth callback: `https://vercel-domain/api/auth/callback/google` | OAuth callback: `https://your-gcp-domain/api/auth/callback/google` |

---

## Branch Note

This migration targets the `main` branch as of 2026-03-21.
The `feature/unified-dashboard` branch (which adds full auth + database) is in progress and will be migrated as a follow-on after it merges to `main`.
