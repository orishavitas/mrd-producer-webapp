<!-- SEED: type=application, status=active, seeded=2026-03-28 -->
# MRD Researcher Webapp — PLANNING.md

## Type
Application (retroactive — project deployed, RAG activation pending)

## Problem Statement
Internal product spec toolbox for Compulocks team. Generates Market Requirements Documents (MRDs) and production one-pagers with AI assistance. Currently deployed with core features working, but the RAG-enhanced feature suggestion pipeline is not yet activated.

## Tech Stack (Confirmed)
- **Framework:** Next.js 14 App Router, TypeScript, CSS Modules
- **Auth:** NextAuth v5 beta, Google OAuth, compulocks.com domain restriction
- **Database:** Vercel Postgres + pgvector (migration pending)
- **AI:** Gemini (feature suggestions, text-embedding-004 at 768-dim)
- **Logging:** Google Sheets via google-spreadsheet + google-auth-library
- **Deploy:** Vercel, main branch = production

## Data Model
- Vercel Postgres: knowledge_chunks (with pgvector embedding column — pending migration)
- Google Sheets: document logs (service account auth)
- sessionStorage: client-side form state (React Context + useReducer)

## API Surface
- `/api/one-pager-beta/suggest-features` — AI feature suggestions (Gemini + RAG)
- `/api/one-pager-beta/rag-backfill` — vector embedding backfill endpoint
- `/api/setup-sheet` — one-time Google Sheet setup
- `/api/one-pager-beta/log-document` — fire-and-forget logging
- YAML config endpoints for industry-roles and mrd-doc-params

## Deployment Strategy
Deployed on Vercel. Main branch auto-deploys to production.
Live: https://mrd-producer-webapp.vercel.app

## Security Considerations
- Google OAuth with compulocks.com domain restriction
- Email allowlist middleware
- Service account credentials for Google Sheets (env vars, not committed)

## UI/UX Patterns
- Split-screen: left = scrollable inputs, right = live preview
- TextFieldWithExpand: AI polish on explicit button click (saves tokens)
- ChipInput, DynamicRoleSelector components
- Fire-and-forget for logging/RAG — never blocks user actions

## Phase Breakdown

### Phase 1: Core MRD Generator [DONE]
- `/mrd` route with AI-powered document generation

### Phase 2: One-Pager Tool [DONE]
- `/one-pager` with split-screen form + live preview
- YAML config for industry-roles

### Phase 3: Beta Sandbox [DONE]
- `/one-pager-beta` with AI auto-fill
- Google Sheets logging integration

### Phase 4: RAG Pipeline [DONE — code complete, activation pending]
- pgvector schema, embedding logic, suggest-features endpoint
- Code merged to main, not yet activated

### Phase 5: RAG Activation [NEXT]

**Task 5.1: Run pgvector migration**
- Files: `scripts/migrate-pgvector.sql`
- Action: Execute migration in Vercel Postgres
- Verify: `SELECT * FROM pg_extension WHERE extname = 'vector'` returns row
- AC: Given Vercel Postgres is accessible, When migrate-pgvector.sql runs, Then vector extension is enabled and knowledge_chunks table has embedding column

**Task 5.2: Share Google Sheet with service account**
- Files: Google Cloud Console, Google Sheets UI
- Action: Share the target sheet with the service account email from env vars
- Verify: Service account can read/write the sheet
- AC: Given service account email from GOOGLE_SERVICE_ACCOUNT_EMAIL, When sheet is shared with edit access, Then POST to /api/setup-sheet returns 200

**Task 5.3: Run sheet setup endpoint**
- Files: `/api/setup-sheet`
- Action: POST to /api/setup-sheet once after sharing
- Verify: Response 200, sheet has correct headers
- AC: Given sheet is shared, When POST /api/setup-sheet is called, Then sheet has all expected column headers

**Task 5.4: Run RAG backfill**
- Files: `/api/one-pager-beta/rag-backfill`
- Action: Call backfill endpoint to embed existing documents
- Verify: `SELECT COUNT(*) FROM knowledge_chunks WHERE embedding IS NOT NULL` > 0
- AC: Given pgvector is live and sheet is connected, When /api/one-pager-beta/rag-backfill is called, Then knowledge_chunks table has >0 rows with embeddings

### Phase 6: Post-RAG Enhancements [FUTURE]
- Improve suggest-features accuracy with user feedback loop
- Add embedding refresh cron job
- Dashboard for RAG analytics

## Open Questions
- Should pgvector migration be run via Vercel dashboard SQL console or via a script?
- What's the retention policy for Google Sheets logs?
- Should RAG backfill be a one-time operation or scheduled?

## Skill Loadout
- **SEED** (ideation) — used retroactively for this doc
- **Beads** (task tracking) — track Phase 5 tasks with BDD acceptance criteria
- **GSD** (execution) — phased workflow for RAG activation
