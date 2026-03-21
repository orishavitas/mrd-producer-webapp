# GCP Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a 5-document IT onboarding set for migrating mrd-producer-webapp from Vercel to GCP, plus a Dockerfile and updated GitHub Actions workflow ready for IT to use.

**Architecture:** Five standalone markdown documents covering architecture overview, GCP setup, CI/CD integration, database options, and Google services integration — all written to be uploaded to NotebookLM. A Dockerfile and updated `deploy.yml` are produced as companion artifacts.

**Tech Stack:** Next.js 14 (App Router), Cloud Run, Cloud SQL (PostgreSQL), Google Secret Manager, Artifact Registry, GitHub Actions, Workload Identity Federation, NextAuth.js v5.

---

## Chunk 1: Document Scaffolding + Doc 1 (Architecture Overview)

### Task 1: Create output directory and Doc 1 skeleton

**Files:**
- Create: `gcp-migration/01-architecture-overview.md`

- [ ] **Step 1: Create the gcp-migration directory**

```bash
mkdir -p gcp-migration
```

- [ ] **Step 2: Write Doc 1 — Architecture Overview**

Create `gcp-migration/01-architecture-overview.md` with the following content:

```markdown
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
    │
    ├── Serves Next.js app (SSR + static)
    ├── Runs API routes (serverless functions)
    └── Provides Postgres database (Vercel Postgres)
            │
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

lib/
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
| Vercel Postgres | Cloud SQL (PostgreSQL) — see Doc 4 for options |
| `@vercel/postgres` npm package | `pg` package — requires one code change in `lib/db.ts` |
| Vercel environment variables | Google Secret Manager |
| Vercel deploy in GitHub Actions | Cloud Run deploy in GitHub Actions |
| Vercel-assigned domain | Custom domain via GCP |
| OAuth callback: `https://vercel-domain/api/auth/callback/google` | OAuth callback: `https://your-gcp-domain/api/auth/callback/google` |

---

## Branch Note

This migration targets the `main` branch as of 2026-03-21.
The `feature/unified-dashboard` branch (which adds full auth + database) is in progress and will be migrated as a follow-on after it merges to `main`.
```

- [ ] **Step 3: Commit**

```bash
git add gcp-migration/01-architecture-overview.md
git commit -m "docs: add GCP migration Doc 1 — architecture overview"
```

---

### Task 2: Doc 2 — GCP Setup Guide

**Files:**
- Create: `gcp-migration/02-gcp-setup-guide.md`

- [ ] **Step 1: Write Doc 2 — GCP Setup Guide**

Create `gcp-migration/02-gcp-setup-guide.md`:

```markdown
# GCP Setup Guide
> **Audience:** IT team (GCP org admins) — step-by-step execution guide for setting up Google Cloud to host this app.

---

## Prerequisites

Before starting:
- [ ] You have Owner or Editor role on a GCP project (or can create one)
- [ ] `gcloud` CLI is installed: https://cloud.google.com/sdk/docs/install
- [ ] Docker is installed locally (for building the container)
- [ ] You have the repository cloned: `git clone https://github.com/<org>/mrd-producer-webapp`
- [ ] You have values for all environment variables listed in Doc 1

---

## Step 1: Create or Select a GCP Project

```bash
# Create a new project (recommended: use your org domain prefix)
gcloud projects create mrd-producer-prod --name="MRD Producer"

# Or select an existing project
gcloud config set project YOUR_PROJECT_ID
```

**Recommended project ID format:** `<company>-mrd-producer-prod`

---

## Step 2: Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  cloudresourcemanager.googleapis.com
```

> This takes 1-2 minutes. Each API must be enabled before the corresponding resource can be created.

---

## Step 3: Set Up Artifact Registry (Container Storage)

```bash
# Create a Docker repository in Artifact Registry
gcloud artifacts repositories create mrd-producer \
  --repository-format=docker \
  --location=europe-west1 \
  --description="MRD Producer app images"
```

> **Region choice:** Use `europe-west1` (Belgium) or `me-west1` (Tel Aviv) depending on your primary user geography. Use the same region for all resources in this guide.

---

## Step 4: Create the Dockerfile

In the project root, create a `Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3080
ENV PORT 3080
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

Also add to `next.config.js`:
```js
output: 'standalone',
```
> The `standalone` output mode bundles only what's needed — critical for Docker image size.

---

## Step 5: Build and Push the Docker Image

```bash
# Authenticate Docker with Artifact Registry
gcloud auth configure-docker europe-west1-docker.pkg.dev

# Build the image
docker build -t europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/mrd-producer/app:latest .

# Push to Artifact Registry
docker push europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/mrd-producer/app:latest
```

---

## Step 6: Store Secrets in Secret Manager

```bash
# Store each secret (repeat for each variable from the inventory in Doc 1)
echo -n "YOUR_VALUE" | gcloud secrets create GOOGLE_API_KEY --data-file=-
echo -n "YOUR_VALUE" | gcloud secrets create GOOGLE_SEARCH_ENGINE_ID --data-file=-
echo -n "YOUR_VALUE" | gcloud secrets create GOOGLE_CLIENT_ID --data-file=-
echo -n "YOUR_VALUE" | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-
echo -n "YOUR_VALUE" | gcloud secrets create AUTH_SECRET --data-file=-
echo -n "YOUR_VALUE" | gcloud secrets create POSTGRES_URL --data-file=-

# Generate AUTH_SECRET if you don't have one:
# openssl rand -base64 32
```

---

## Step 7: Deploy to Cloud Run

```bash
gcloud run deploy mrd-producer \
  --image=europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/mrd-producer/app:latest \
  --platform=managed \
  --region=europe-west1 \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --max-instances=10 \
  --concurrency=80 \
  --set-secrets=GOOGLE_API_KEY=GOOGLE_API_KEY:latest,\
GOOGLE_SEARCH_ENGINE_ID=GOOGLE_SEARCH_ENGINE_ID:latest,\
GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,\
GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,\
AUTH_SECRET=AUTH_SECRET:latest,\
POSTGRES_URL=POSTGRES_URL:latest
```

> **Baseline config:** 512MB RAM, 1 vCPU, max 10 instances, concurrency 80. Adjust after load testing.
> **`--allow-unauthenticated`:** Required — users access the app from the browser without GCP credentials.

After deploy, Cloud Run outputs a service URL like:
`https://mrd-producer-<hash>-ew.a.run.app`

---

## Step 8: Grant Cloud Run Access to Secret Manager

```bash
# Get the Cloud Run service account
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant Secret Manager access
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Step 9: Custom Domain Setup

```bash
# Map your domain to the Cloud Run service
gcloud run domain-mappings create \
  --service=mrd-producer \
  --domain=mrd.yourcompany.com \
  --region=europe-west1
```

Then add the DNS records shown in the output to your DNS provider (Google Domains, Cloudflare, etc.).
SSL is provisioned automatically by Google — wait 15-30 minutes for propagation.

---

## Step 10: Update OAuth Callback URL

> **CRITICAL — do this before testing login.**

In Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client:

Add to **Authorized Redirect URIs:**
```
https://mrd.yourcompany.com/api/auth/callback/google
```

> If the OAuth client was created under a personal Google account rather than your org's GCP project, it must be **transferred to the org project first**. Contact whoever set up the original OAuth client.

---

## Step 11: Verify Deployment

```bash
# Check service status
gcloud run services describe mrd-producer --region=europe-west1

# Tail logs
gcloud run services logs tail mrd-producer --region=europe-west1
```

Expected: Service shows `READY`. Open the service URL in a browser — the login page should load and Google OAuth should work.

---

## Rollback Procedure

Cloud Run keeps all previous revisions. To roll back:

```bash
# List revisions
gcloud run revisions list --service=mrd-producer --region=europe-west1

# Route 100% traffic to a previous revision
gcloud run services update-traffic mrd-producer \
  --region=europe-west1 \
  --to-revisions=mrd-producer-00002-xxx=100
```

---

## Health Check

Cloud Run automatically probes `GET /` every 30 seconds. If the app is healthy, it returns HTTP 200.
To check manually:
```bash
curl -I https://mrd.yourcompany.com
# Expected: HTTP/2 200
```
```

- [ ] **Step 2: Commit**

```bash
git add gcp-migration/02-gcp-setup-guide.md
git commit -m "docs: add GCP migration Doc 2 — GCP setup guide"
```

---

## Chunk 2: Doc 3 (CI/CD) + Doc 4 (Database)

### Task 3: Doc 3 — GitHub CI/CD Integration

**Files:**
- Create: `gcp-migration/03-github-cicd-integration.md`
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1: Write Doc 3 — GitHub CI/CD Integration**

Create `gcp-migration/03-github-cicd-integration.md`:

```markdown
# GitHub CI/CD Integration
> **Audience:** IT team + developer — connecting the GitHub repository to GCP for automated deployments.

---

## Current Flow (Vercel)

```
git push main
    │
    ▼
GitHub Actions (.github/workflows/deploy.yml)
    ├── npm ci
    ├── npm run build
    ├── vercel pull (fetch env vars)
    └── vercel deploy --prod
```

PR branches deploy to Vercel preview URLs automatically.

---

## New Flow (GCP)

```
git push main
    │
    ▼
GitHub Actions
    ├── npm ci
    ├── npm run build (verify)
    ├── docker build
    ├── docker push → Artifact Registry
    └── gcloud run deploy → Cloud Run (production)

git push <feature-branch>
    │
    ▼
GitHub Actions
    └── vercel deploy (PR preview — unchanged)
```

**Both flows run in parallel.** `main` deploys to GCP. PRs deploy to Vercel. No Vercel production deploy happens after migration.

---

## GitHub Secrets Required

Add these secrets in: GitHub repo → Settings → Secrets and variables → Actions

### For GCP deployment:

| Secret | How to get it |
|--------|--------------|
| `GCP_PROJECT_ID` | Your GCP project ID (e.g. `compulocks-mrd-producer-prod`) |
| `GCP_REGION` | e.g. `europe-west1` |
| `GCP_ARTIFACT_REGISTRY` | e.g. `europe-west1-docker.pkg.dev` |
| `WIF_PROVIDER` | Workload Identity Federation provider resource name (see below) |
| `WIF_SERVICE_ACCOUNT` | Service account email used by GitHub Actions |

### Keep these existing secrets (for Vercel PR previews):
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `GOOGLE_API_KEY` (used during build step)
- `GOOGLE_SEARCH_ENGINE_ID` (used during build step)

---

## Option A: Workload Identity Federation (Recommended)

WIF lets GitHub Actions authenticate to GCP without storing a service account key. More secure — no long-lived credentials in GitHub secrets.

### Set up WIF in GCP:

```bash
# Create a service account for GitHub Actions
gcloud iam service-accounts create github-actions-deploy \
  --display-name="GitHub Actions Deploy"

# Grant it the roles it needs
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create the WIF pool
gcloud iam workload-identity-pools create github-pool \
  --location=global \
  --display-name="GitHub Actions Pool"

# Create the WIF provider
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global \
  --workload-identity-pool=github-pool \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Bind the service account to the GitHub repo
gcloud iam service-accounts add-iam-policy-binding \
  github-actions-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/YOUR_PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_ORG/mrd-producer-webapp"
```

Save the WIF provider resource name (output of the provider create command) as `WIF_PROVIDER` in GitHub secrets.
Save the service account email as `WIF_SERVICE_ACCOUNT` in GitHub secrets.

---

## Option B: Service Account Key (Simpler, Less Secure)

If WIF setup is too complex, use a service account key instead.

```bash
# Create key
gcloud iam service-accounts keys create sa-key.json \
  --iam-account=github-actions-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com

# Copy the content of sa-key.json
cat sa-key.json
```

Add the entire JSON content as a GitHub secret named `GCP_SA_KEY`.
In the workflow, replace the WIF auth step with:
```yaml
- uses: google-github-actions/auth@v2
  with:
    credentials_json: ${{ secrets.GCP_SA_KEY }}
```

> **Security note:** Service account keys are long-lived credentials. Rotate them every 90 days and restrict the service account's permissions to the minimum required.

---

## Updated GitHub Actions Workflow

Replace `.github/workflows/deploy.yml` with:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  # ── Build + deploy to GCP (main branch only) ──────────────────────────
  deploy-gcp:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write   # Required for Workload Identity Federation

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run linter
        run: npm run lint --if-present
        continue-on-error: true

      - name: Build
        run: npm run build
        env:
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
          GOOGLE_SEARCH_ENGINE_ID: ${{ secrets.GOOGLE_SEARCH_ENGINE_ID }}

      - name: Authenticate to GCP
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}

      - name: Set up Docker auth for Artifact Registry
        run: gcloud auth configure-docker ${{ secrets.GCP_ARTIFACT_REGISTRY }} --quiet

      - name: Build Docker image
        run: |
          docker build -t ${{ secrets.GCP_ARTIFACT_REGISTRY }}/${{ secrets.GCP_PROJECT_ID }}/mrd-producer/app:${{ github.sha }} .
          docker tag ${{ secrets.GCP_ARTIFACT_REGISTRY }}/${{ secrets.GCP_PROJECT_ID }}/mrd-producer/app:${{ github.sha }} \
            ${{ secrets.GCP_ARTIFACT_REGISTRY }}/${{ secrets.GCP_PROJECT_ID }}/mrd-producer/app:latest

      - name: Push to Artifact Registry
        run: |
          docker push ${{ secrets.GCP_ARTIFACT_REGISTRY }}/${{ secrets.GCP_PROJECT_ID }}/mrd-producer/app:${{ github.sha }}
          docker push ${{ secrets.GCP_ARTIFACT_REGISTRY }}/${{ secrets.GCP_PROJECT_ID }}/mrd-producer/app:latest

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy mrd-producer \
            --image=${{ secrets.GCP_ARTIFACT_REGISTRY }}/${{ secrets.GCP_PROJECT_ID }}/mrd-producer/app:${{ github.sha }} \
            --platform=managed \
            --region=${{ secrets.GCP_REGION }} \
            --allow-unauthenticated

  # ── PR preview via Vercel (pull requests only) ────────────────────────
  preview-vercel:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Build
        run: npm run build
        env:
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
          GOOGLE_SEARCH_ENGINE_ID: ${{ secrets.GOOGLE_SEARCH_ENGINE_ID }}

      - name: Install Vercel CLI
        run: npm install -g vercel

      - name: Deploy to Vercel Preview
        run: vercel deploy --token=${{ secrets.VERCEL_TOKEN }}
```

- [ ] **Step 2: Replace the existing workflow file**

Replace `.github/workflows/deploy.yml` with the workflow above.

- [ ] **Step 3: Commit both files**

```bash
git add gcp-migration/03-github-cicd-integration.md .github/workflows/deploy.yml
git commit -m "docs: add GCP migration Doc 3 — CI/CD integration + updated workflow"
```

---

### Task 4: Doc 4 — Database Options

**Files:**
- Create: `gcp-migration/04-database-options.md`

- [ ] **Step 1: Write Doc 4 — Database Options**

Create `gcp-migration/04-database-options.md`:

```markdown
# Database Options
> **Audience:** IT team — choose the right database before starting migration. This decision affects cost, maintenance overhead, and how much code the development team needs to change.

---

## Current Database

The app currently uses **Vercel Postgres** — a managed PostgreSQL service provided by Vercel.

The app has one table: `documents` — storing metadata for user-created MRDs and One-Pagers.

**Schema (from `lib/db-schema.sql`):**
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  tool_type TEXT NOT NULL,        -- 'mrd' or 'one-pager'
  status TEXT DEFAULT 'draft',
  drive_file_id TEXT,
  drive_folder TEXT,
  content_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ          -- soft delete
);
```

---

## Option Comparison

| | Cloud SQL (PostgreSQL) | Firestore | Cloud Spanner |
|---|---|---|---|
| **Type** | Managed relational DB | Serverless NoSQL | Distributed relational DB |
| **Cost** | ~$10–50/mo (db-f1-micro to db-g1-small) | $0 at low usage; pay per read/write | ~$300+/mo minimum |
| **Code changes** | Minimal — swap npm package + connection string | Significant — rewrite all queries | Minimal — standard SQL |
| **Migration effort** | Low — `pg_dump` / `pg_restore` | High — data transformation required | Low — standard SQL |
| **Maintenance** | Patch versions, backups (automated) | Zero — fully managed | Zero — fully managed |
| **Best for** | This app at current scale | High-traffic, globally distributed apps | Enterprise global scale |
| **Scales to** | Thousands of users easily | Millions of users | Billions of operations |

---

## Recommendation: Cloud SQL (PostgreSQL)

**Use Cloud SQL.** It is the lowest-effort migration path for this app:
- Existing PostgreSQL schema works as-is
- Only one file needs changing in the codebase (`lib/db.ts` — swap `@vercel/postgres` for `pg`)
- Data migrates cleanly via `pg_dump` / `pg_restore`
- Automated backups and point-in-time recovery built in
- Can scale up instance size as user base grows

---

## Cloud SQL Setup

### 1. Create the instance

```bash
gcloud sql instances create mrd-producer-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=europe-west1 \
  --storage-auto-increase \
  --backup-start-time=02:00
```

> **Tier:** `db-f1-micro` (~$10/mo) is sufficient for internal R&D use. Upgrade to `db-g1-small` (~$50/mo) if response times degrade.

### 2. Create the database and user

```bash
gcloud sql databases create mrd_producer --instance=mrd-producer-db

gcloud sql users create app_user \
  --instance=mrd-producer-db \
  --password=STRONG_RANDOM_PASSWORD
```

### 3. Run the schema

```bash
# Connect via Cloud SQL Auth Proxy (see connection section below)
psql "host=127.0.0.1 port=5432 dbname=mrd_producer user=app_user" \
  -f lib/db-schema.sql
```

### 4. Migrate existing data from Vercel Postgres

```bash
# Export from Vercel Postgres
pg_dump "VERCEL_POSTGRES_URL" --no-owner --no-acl -f vercel-backup.sql

# Import to Cloud SQL
psql "host=127.0.0.1 port=5432 dbname=mrd_producer user=app_user" \
  -f vercel-backup.sql
```

---

## Connecting Cloud Run to Cloud SQL

> **Important:** Cloud Run is serverless — it cannot use a persistent TCP connection to Cloud SQL. You must use the **Cloud SQL Auth Proxy** or the built-in **Unix socket** method.

### Unix socket method (recommended for Cloud Run)

Cloud Run has built-in support for Cloud SQL connections via Unix socket — no sidecar needed.

Add to your `gcloud run deploy` command:
```bash
--add-cloudsql-instances=YOUR_PROJECT_ID:europe-west1:mrd-producer-db
```

Then set the connection string (in Secret Manager as `POSTGRES_URL`) to:
```
postgresql://app_user:PASSWORD@localhost/mrd_producer?host=/cloudsql/YOUR_PROJECT_ID:europe-west1:mrd-producer-db
```

### Grant Cloud Run access to Cloud SQL

```bash
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

---

## Code Change Required (Development Team)

The app currently uses `@vercel/postgres`. After migration, `lib/db.ts` must be updated to use the `pg` package.

**Before (Vercel Postgres):**
```typescript
import { sql } from '@vercel/postgres';
const result = await sql`SELECT * FROM documents WHERE user_id = ${userId}`;
```

**After (standard pg):**
```typescript
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const result = await pool.query('SELECT * FROM documents WHERE user_id = $1', [userId]);
```

This change is isolated to `lib/db.ts`. The development team will handle this alongside the migration.

---

## Why Not Firestore?

Firestore requires rewriting all database queries from SQL to Firestore's document/collection model. The effort is disproportionate for the current scale of this app and would require significant developer time and testing. Cloud SQL is the right choice unless the app scales to millions of users.

## Why Not Cloud Spanner?

Cloud Spanner starts at ~$300/mo and is designed for globally distributed, high-throughput workloads. This app serves a small internal team — the cost and complexity are unjustified.
```

- [ ] **Step 2: Commit**

```bash
git add gcp-migration/04-database-options.md
git commit -m "docs: add GCP migration Doc 4 — database options"
```

---

## Chunk 3: Doc 5 + Dockerfile + Final Checks

### Task 5: Doc 5 — Google Services Integration

**Files:**
- Create: `gcp-migration/05-google-services-integration.md`

- [ ] **Step 1: Write Doc 5 — Google Services Integration**

Create `gcp-migration/05-google-services-integration.md`:

```markdown
# Google Services Integration
> **Audience:** IT team + development team — how Google APIs connect to the app, what needs updating after migration, and what comes next for Drive and Gmail.

---

## Overview

This app already integrates with several Google services. Most require no changes after migration — just updating secrets and one URL. This document covers each service, its current status, and any post-migration steps.

---

## 1. Google OAuth 2.0 (User Authentication)

**Status:** Active — users log in with their Google account.

**How it works:**
- User clicks "Sign in with Google" → redirected to Google → Google redirects back to the app
- NextAuth.js handles the OAuth flow using `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- The callback URL must match an **Authorized Redirect URI** registered in the OAuth client

**After migration — required steps:**

### Step 1: Verify OAuth client ownership
Go to Google Cloud Console → APIs & Services → Credentials.
Find the OAuth 2.0 Client used by this app (identified by `GOOGLE_CLIENT_ID`).

> **If it's on a personal account:** It must be transferred to your org's GCP project. Contact whoever originally set up OAuth for this app.

### Step 2: Add the new redirect URI
In the OAuth client settings, add to **Authorized Redirect URIs:**
```
https://mrd.yourcompany.com/api/auth/callback/google
```

Keep the existing Vercel URI during transition:
```
https://mrd-producer.vercel.app/api/auth/callback/google
```
Remove it after migration is complete and verified.

### Step 3: Update secrets
No code changes. `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` stay the same.
Move their values from Vercel to Google Secret Manager.

---

## 2. Gemini API (AI Text Generation)

**Status:** Active — used for MRD generation and One-Pager AI expansion.

**How it works:**
- API calls go from the app's server-side code → Gemini API using `GOOGLE_API_KEY`
- Uses `gemini-2.5-flash` model with Google Search grounding
- Also uses Google Custom Search Engine via `GOOGLE_SEARCH_ENGINE_ID`

**After migration — required steps:**

Move secrets to Secret Manager (already covered in Doc 2):
- `GOOGLE_API_KEY`
- `GOOGLE_SEARCH_ENGINE_ID`

No code changes required. The API endpoint is external — it doesn't care where the app is hosted.

---

## 3. Google Drive Sync (Stub — Not Yet Active)

**Status:** Stub — `/api/drive/sync` returns `501 Not Implemented`.

**How it will work (when activated):**
- Users authorize the app to access their Google Drive (`drive.file` scope — limited to files this app creates)
- The app creates a `MRD Producer/` folder in the user's Drive
- Documents are synced to Drive on save

**OAuth scope already requested:** `https://www.googleapis.com/auth/drive.file`
This scope is already in `lib/auth.ts`. Users who log in are already granting this permission, but the sync endpoint doesn't use it yet.

**What IT needs to do before activation:**
- No GCP setup required — Drive API access goes through the same OAuth client
- Ensure `googleapis` npm package is in `package.json` (it is: `googleapis@^171.4.0`)
- The development team will implement the sync logic when ready

**Workspace admin note:**
`drive.file` scope is not restricted — it does not require domain-wide delegation or admin approval. Users grant it individually on first login.

---

## 4. Gmail Integration (Planned — Not Yet Built)

**Status:** Planned — not yet implemented. No code exists for this.

**Intended use:** Read email attachments or thread content from Gmail to pre-fill MRD or One-Pager fields.

**What will be needed when built:**
- Add `gmail.readonly` OAuth scope to `lib/auth.ts`
- Users will need to re-consent on next login (new scope)
- If accessing Gmail on behalf of users without their interactive consent: requires **domain-wide delegation** (Workspace admin must approve)

**Workspace admin pre-steps (do now, use later):**
If your org plans to use domain-wide delegation for Gmail:
1. Go to Google Workspace Admin Console → Security → API Controls → Domain-wide delegation
2. Add the app's service account client ID
3. Authorize scope: `https://www.googleapis.com/auth/gmail.readonly`

---

## 5. Service Account vs. User OAuth — When to Use Each

| Scenario | Use |
|----------|-----|
| App accesses user's own Drive/Gmail (user logged in) | User OAuth (already set up) |
| App accesses a shared company Drive folder in the background | Service Account |
| CI/CD authenticates to GCP (GitHub Actions) | Service Account or WIF (see Doc 3) |
| App reads/writes to a shared internal document store | Service Account |

**Current app:** Uses user OAuth for everything. A service account is only needed if the app ever needs to act on behalf of the company (e.g., write to a shared Drive folder) without a user being logged in.

---

## Summary: Post-Migration Checklist

| Service | Action Required | Who |
|---------|----------------|-----|
| Google OAuth | Add new redirect URI to OAuth client | IT |
| Google OAuth | Verify OAuth client is on org GCP project | IT |
| Gemini API | Move API key to Secret Manager | IT |
| Custom Search | Move Search Engine ID to Secret Manager | IT |
| Drive Sync | No action — stub, activates when dev team is ready | Dev |
| Gmail | No action — planned feature, not yet built | Dev |
```

- [ ] **Step 2: Commit**

```bash
git add gcp-migration/05-google-services-integration.md
git commit -m "docs: add GCP migration Doc 5 — Google services integration"
```

---

### Task 6: Dockerfile + next.config.js update

**Files:**
- Create: `Dockerfile`
- Modify: `next.config.js`

- [ ] **Step 1: Read next.config.js**

```bash
cat next.config.js
```

- [ ] **Step 2: Add `output: 'standalone'` to next.config.js**

In `next.config.js`, inside the `nextConfig` object, add:
```js
output: 'standalone',
```

This is required for the Docker image to work correctly. Without it, the standalone server (`server.js`) is not generated.

- [ ] **Step 3: Create Dockerfile**

Create `Dockerfile` in the project root (content from Doc 2, Step 4 above — copy verbatim).

- [ ] **Step 4: Create .dockerignore**

Create `.dockerignore`:

```
node_modules
.next
.vercel
.git
*.md
.env*
```

- [ ] **Step 5: Test the Docker build locally**

```bash
docker build -t mrd-producer-test .
docker run -p 3080:3080 \
  -e GOOGLE_API_KEY=test \
  -e GOOGLE_SEARCH_ENGINE_ID=test \
  -e AUTH_SECRET=test \
  mrd-producer-test
```

Expected: Server starts on port 3080. Open `http://localhost:3080` — app should load (login page or redirect).

- [ ] **Step 6: Commit**

```bash
git add Dockerfile .dockerignore next.config.js
git commit -m "feat: add Dockerfile and standalone output for Cloud Run deployment"
```

---

### Task 7: Final verification

- [ ] **Step 1: Verify all 5 docs exist**

```bash
ls gcp-migration/
```

Expected output:
```
01-architecture-overview.md
02-gcp-setup-guide.md
03-github-cicd-integration.md
04-database-options.md
05-google-services-integration.md
```

- [ ] **Step 2: Verify Dockerfile exists**

```bash
ls Dockerfile .dockerignore
```

- [ ] **Step 3: Verify workflow file was updated**

```bash
head -5 .github/workflows/deploy.yml
```

Expected: `name: Deploy` (not `name: Deploy to Vercel`)

- [ ] **Step 4: Verify git log**

```bash
git log --oneline -7
```

Expected: 5 doc commits + 1 Dockerfile commit + 1 spec commit visible.

- [ ] **Step 5: Final commit if anything was missed**

```bash
git status
# If any uncommitted changes, stage and commit them
git add -A
git commit -m "docs: finalize GCP migration document set"
```
