# GCP Migration Design Spec
**Project:** mrd-producer-webapp
**Date:** 2026-03-21
**Status:** Draft
**Audience:** IT team (GCP org admins) + development team

---

## Overview

This spec defines the plan to migrate `mrd-producer-webapp` from Vercel to Google Cloud Platform (GCP) as the primary production host. The goal is to consolidate all company infrastructure under GCP — enabling native integration with Google Drive, Gmail, and Google Workspace — while keeping Vercel for local development previews and PR testing.

The output of this migration is a **set of 5 modular documents** designed to be uploaded to NotebookLM and used as an IT onboarding guide.

---

## Migration Target

**Branch:** `main` as of 2026-03-21. The `feature/unified-dashboard` branch introduces Vercel Postgres and will be migrated as a follow-on once merged to `main`.

---

## Context

### Current State
- **Hosting:** Vercel (Hobby plan)
- **CI/CD:** GitHub Actions → Vercel deploy
- **Database:** Vercel Postgres (managed PostgreSQL)
- **Auth:** NextAuth.js v5 + Google OAuth
- **AI:** Gemini API (`@google/genai`), Anthropic Claude API
- **Google integrations:** OAuth, Gemini search grounding, Drive sync (stub — not yet live)
- **Repo:** GitHub (`mrd-producer-webapp`)

### Target State
- **Hosting:** Google Cloud Run (containerized Next.js)
- **CI/CD:** GitHub Actions → Cloud Run deploy (Vercel retained for PR previews only)
- **Database:** IT-selected (Cloud SQL, Firestore, or Cloud Spanner — documented with trade-offs)
- **Auth:** Same NextAuth.js v5 + Google OAuth (no changes needed)
- **Secrets:** Google Secret Manager
- **Domain:** Custom domain via Google Cloud Load Balancer or Firebase Hosting

---

## Document Set Design

Five focused documents, each with a single purpose. Intended for NotebookLM ingestion.

---

### Doc 1: Architecture Overview
**File:** `gcp-migration/01-architecture-overview.md`
**Audience:** IT team — understanding what they're taking over
**Contents:**
- What the app does (One-Pager Generator, MRD Producer)
- App structure: Next.js App Router, API routes, multi-agent AI system
- Current hosting topology (Vercel, GitHub, external APIs)
- Environment variables and secrets inventory
- Google services already in use (OAuth, Gemini, Drive stub)
- What changes vs. what stays the same in migration

---

### Doc 2: GCP Setup Guide
**File:** `gcp-migration/02-gcp-setup-guide.md`
**Audience:** IT team — step-by-step execution
**Contents:**
- GCP project creation and naming conventions
- IAM roles required (Cloud Run Admin, Secret Manager Admin, etc.)
- Enabling required APIs (Cloud Run, Secret Manager, Artifact Registry, Cloud Build)
- Building and pushing the Docker container (Next.js → Cloud Run)
- Deploying to Cloud Run (region, memory, concurrency settings — baseline: 512MB RAM, max-instances=10, concurrency=80; adjust after load test)
- Configuring environment variables via Secret Manager
- Custom domain setup and SSL termination
- Health check and rollback procedure

---

### Doc 3: GitHub CI/CD Integration
**File:** `gcp-migration/03-github-cicd-integration.md`
**Audience:** IT team + developer — connecting the repo to GCP
**Contents:**
- How the current GitHub Actions workflow works (Vercel path)
- New workflow: build → push to Artifact Registry → deploy to Cloud Run
- GitHub secrets required for GCP deploy (Workload Identity Federation recommended over service account keys)
- Keeping Vercel for PR previews (parallel deploy targets)
- Branch strategy: `main` → GCP production, PRs → Vercel preview
- Rollback via Cloud Run revision traffic splitting

---

### Doc 4: Database Options
**File:** `gcp-migration/04-database-options.md`
**Audience:** IT team — informed decision making
**Contents:**

| Option | Type | Best For | Trade-offs |
|--------|------|----------|------------|
| **Cloud SQL (PostgreSQL)** | Managed relational | Drop-in Vercel Postgres replacement | Requires instance management, ~$10-50/mo minimum |
| **Firestore** | Serverless NoSQL | Fully managed, auto-scale, $0 at low usage | Requires rewriting SQL queries to Firestore queries |
| **Cloud Spanner** | Distributed relational | Global scale, 99.999% SLA | Expensive (~$300+/mo), overkill for current scale |

**Recommendation:** Cloud SQL (PostgreSQL) — lowest migration effort, preserves existing schema and query structure.

**Migration path from Vercel Postgres:**
- Export schema + data via `pg_dump`
- Import to Cloud SQL instance
- Update `DATABASE_URL` in Secret Manager
- Swap `@vercel/postgres` for `pg` or `postgres` npm package (**code change required** in `lib/db.ts` — one file)
- **Cloud Run ↔ Cloud SQL connection:** Cloud Run cannot use persistent TCP connections efficiently. Use the Cloud SQL Auth Proxy sidecar or the built-in Unix socket. Append `?host=/cloudsql/PROJECT:REGION:INSTANCE` to the connection string. This is a required step, not optional.

---

### Doc 5: Google Services Integration
**File:** `gcp-migration/05-google-services-integration.md`
**Audience:** IT team + developer — connecting Google Workspace
**Contents:**
- **Google OAuth:** Already configured via NextAuth.js — only callback URL needs updating to GCP domain
- **Gemini API:** Already working — just move `GOOGLE_API_KEY` to Secret Manager
- **Google Drive sync:** Currently a stub (`/api/drive/sync` returns 501) — activation steps documented for when ready
- **Gmail integration:** Future capability — OAuth scope addition required (`gmail.readonly`)
- **Service account vs. user OAuth:** When to use each for Drive/Gmail access
- **Workspace admin steps:** Which OAuth scopes need domain-wide delegation approval

---

## Architecture Diagram (Text)

```
GitHub Repo (source of truth)
    │
    ├── PR branch ──────────────────────────► Vercel Preview (unchanged)
    │
    └── main branch
            │
            ▼
    GitHub Actions
            │
            ├── Build Docker image
            ├── Push → Artifact Registry
            └── Deploy → Cloud Run
                        │
                        ├── Secret Manager (env vars + API keys)
                        ├── Cloud SQL / Firestore (database)
                        └── Google APIs (OAuth, Gemini, Drive, Gmail)
```

---

## What Stays the Same

- GitHub repository — no changes
- Next.js codebase — no application logic changes
- NextAuth.js + Google OAuth — only callback URL changes
- Gemini API integration — move API key to Secret Manager
- Vercel for PR previews — stays active

## What Changes

| Current | New |
|---------|-----|
| Vercel production deploy | Cloud Run |
| Vercel Postgres | Cloud SQL (PostgreSQL) recommended |
| `@vercel/postgres` npm package | `pg` or `postgres` package (code change in `lib/db.ts`) |
| Vercel environment variables | Google Secret Manager |
| Vercel deploy step in CI | Cloud Run deploy step in CI |
| Vercel domain | GCP custom domain |

---

## Out of Scope

- Drive sync activation (stub exists, activation is a separate task)
- Gmail integration (future feature)
- Multi-region deployment (single region sufficient for current scale)
- Kubernetes / GKE (Cloud Run is sufficient)

---

## Open Decisions for IT

1. **Which database?** See Doc 4 for trade-offs. Recommendation: Cloud SQL.
2. **Which GCP region?** Recommend `europe-west1` (Belgium) or `me-west1` (Tel Aviv) based on user geography.
3. **Workload Identity Federation vs. Service Account Key** for GitHub Actions auth to GCP. WIF is more secure; service account keys are simpler to set up.
4. **Custom domain provider:** Is the domain managed in Google Domains / Cloud DNS, or external?
5. **OAuth client ownership:** Verify that the Google Cloud Console OAuth client used for NextAuth (`GOOGLE_CLIENT_ID`) is owned by an org-managed GCP project. After migration, `https://<new-domain>/api/auth/callback/google` must be added to its Authorized Redirect URIs. If the OAuth client currently lives under a personal account, it must be transferred to the org GCP project before go-live — otherwise login will fail on the new domain.

---

## Success Criteria

- App running on Cloud Run, accessible at production URL
- GitHub Actions deploys to GCP on push to `main`
- Vercel continues to deploy PR previews
- All secrets in Secret Manager (no plaintext env vars)
- Database migrated with zero data loss
- Google OAuth login works on new domain
- IT team can independently deploy and roll back using the guide docs
