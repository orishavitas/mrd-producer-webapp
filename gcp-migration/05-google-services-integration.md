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
https://YOUR_APP_DOMAIN/api/auth/callback/google
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
