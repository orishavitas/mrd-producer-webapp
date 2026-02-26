# Unified Dashboard & Auth System — Design Doc

**Date:** 2026-02-20
**Status:** Approved
**Branch:** TBD (new feature branch)

## Overview

Replace the current single-tool homepage with an authenticated dashboard that surfaces all tools (MRD Producer, One-Pager, Brief Helper) as cards, with a unified documents section backed by Vercel Postgres and synced to Google Drive.

## Authentication

- **NextAuth.js v5** with Google OAuth provider
- Google OAuth scopes include `drive.file` for Drive API access
- Login page at `/login` — branded full-screen card with "Sign in with Google"
- `middleware.ts` protects all routes except `/login` and `/api/auth/*`
- Session stores: user name, email, avatar, Google access token, refresh token
- On first login, create `MRD Producer/` folder in user's Google Drive (empty — internal structure TBD)

## Dashboard Homepage

**Route:** `/` (replaces current MRD generator form)

**Layout (top to bottom):**

1. **Top bar** — App logo (left), user avatar + name + sign out (right)
2. **Tool cards grid** — 2-3 column responsive grid
   - Each card: icon, tool name, one-line description, "last used" badge
   - Click navigates to tool route
3. **My Documents section**
   - Filter chips: All | MRD | One-Pager | Brief Helper | Drafts
   - Table: title, tool type, status (draft/complete), last modified, actions
   - Actions: Open, Delete (soft delete)
   - Empty state: "No documents yet — pick a tool above to get started"

**Styling:** M3 Expressive from `compulocks-brand-system` tokens — navy primary (#1D1F4A), Barlow fonts, XL radius cards, pill buttons.

## Data Model

**Vercel Postgres — `documents` table:**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | TEXT | Google OAuth sub |
| title | TEXT | |
| tool_type | ENUM | 'mrd', 'one-pager', 'brief' |
| status | ENUM | 'draft', 'complete' |
| drive_file_id | TEXT | Nullable — set after Drive sync |
| drive_folder | TEXT | Nullable — path within MRD Producer folder |
| content_json | JSONB | Tool state/output for quick reload |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |
| deleted_at | TIMESTAMP | Nullable — soft delete |

**Drive sync:** Upload exported file (DOCX/HTML) to user's `MRD Producer/` folder on explicit save/export. Store returned `drive_file_id`. Drafts stay in DB only (`content_json`). Folder structure inside `MRD Producer/` is TBD — will be defined later.

## Route Structure

| Route | Purpose |
|-------|---------|
| `/login` | Google OAuth sign-in page |
| `/` | Dashboard (tool cards + documents) |
| `/mrd` | MRD Producer (moved from current `/`) |
| `/one-pager` | One-Pager Generator (stays) |
| `/brief` | Brief Helper (future) |

## API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/documents` | List user's documents (with filters) |
| POST | `/api/documents` | Create/update document metadata |
| DELETE | `/api/documents/[id]` | Soft delete |
| POST | `/api/drive/sync` | Upload to Google Drive |

## Migration Notes

- Current `app/page.tsx` (MRD form) moves to `app/mrd/page.tsx`
- New `app/page.tsx` = dashboard
- Each tool page gets a "Save" button (writes to DB + optional Drive sync)
- Each tool page gets back navigation to dashboard

## Tech Stack

- **Auth:** NextAuth.js v5 + Google OAuth
- **DB:** Vercel Postgres (free tier: 256MB)
- **Drive:** Google Drive API v3 (`drive.file` scope)
- **Styling:** M3 Expressive, Compulocks brand tokens from `compulocks-brand-system` repo
