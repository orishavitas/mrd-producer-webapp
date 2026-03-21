# One-Pager Logging to Google Sheets — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Log the full one-pager-beta document state to a Google Sheet every time the user exports, creating a growing structured dataset.

**Architecture:** Google Service Account authenticates via `googleapis`. A thin `lib/google-sheets.ts` helper handles auth + append. Called fire-and-forget from the export handler via a new `POST /api/one-pager-beta/log-document` route.

**Tech Stack:** Next.js App Router, TypeScript, `googleapis` npm package (already installed), Google Service Account credentials in env vars.

---

## Chunk 1: Google Sheets Setup

### Task 1: Create Google Sheet and Service Account

**This task requires manual steps in Google Cloud Console + Google Sheets.**

- [ ] Go to [Google Cloud Console](https://console.cloud.google.com) → the existing project used for OAuth
- [ ] Navigate to **IAM & Admin → Service Accounts** → Create Service Account
  - Name: `mrd-producer-sheets`
  - Role: none needed at project level
  - Click Done
- [ ] Click the service account → **Keys** tab → **Add Key → JSON** → download the JSON file
- [ ] Open [Google Sheets](https://sheets.google.com) → Create a new spreadsheet
  - Name it: `MRD Producer - One-Pager Log`
  - Note the spreadsheet ID from the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
- [ ] Share the sheet with the service account email (from the JSON file, field `client_email`) → Editor access
- [ ] In the sheet, rename "Sheet1" to `One-Pager Log`
- [ ] Add header row (Row 1):
  ```
  timestamp | sessionId | productName | preparedBy | userEmail | description | goal | useCases | environments | industries | roles | mustHave | niceToHave | moq | targetPrice | competitors | exportFormat
  ```
- [ ] Base64-encode the service account JSON:
  ```bash
  base64 -i path/to/service-account.json
  ```
- [ ] Add to Vercel env vars:
  ```bash
  vercel env add GOOGLE_SERVICE_ACCOUNT_JSON
  # paste the base64 string
  vercel env add GOOGLE_SHEETS_ID
  # paste the spreadsheet ID
  ```
- [ ] Also add to local `.env.local`:
  ```
  GOOGLE_SERVICE_ACCOUNT_JSON=<base64 string>
  GOOGLE_SHEETS_ID=<spreadsheet id>
  ```

---

## Chunk 2: Sheets Helper + API

### Task 2: Create Google Sheets helper library

**Files:**
- Create: `lib/google-sheets.ts`

- [ ] Create `lib/google-sheets.ts`:
```typescript
import { google } from 'googleapis';

function getAuth() {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!encoded) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
  const json = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
  return new google.auth.GoogleAuth({
    credentials: json,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function appendSheetRow(values: string[]): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_ID not set');

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'One-Pager Log!A:Q',
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  });
}
```
- [ ] Verify TypeScript: `npm run build 2>&1 | grep -E "error|Error"`
- [ ] Commit:
```bash
git add lib/google-sheets.ts
git commit -m "feat(beta): add Google Sheets helper library"
```

---

### Task 3: Create log-document API endpoint

**Files:**
- Create: `app/api/one-pager-beta/log-document/route.ts`

- [ ] Create directory: `app/api/one-pager-beta/log-document/`
- [ ] Create `route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { appendSheetRow } from '@/lib/google-sheets';

interface LogDocumentRequest {
  state: {
    sessionId: string;
    productName: string;
    preparedBy: string;
    userEmail: string;
    description: string;
    expandedDescription: string;
    goal: string;
    expandedGoal: string;
    useCases: string;
    expandedUseCases: string;
    context: { environments: string[]; industries: string[] };
    audience: { predefined: string[]; custom: string[] };
    features: { mustHave: string[]; niceToHave: string[] };
    commercials: { moq: string; targetPrice: string };
    competitors: { brand: string; productName: string; status: string }[];
  };
  exportFormat: string;
}

export async function POST(request: NextRequest) {
  let body: LogDocumentRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const { state, exportFormat } = body;

  // Use expanded text if available, fall back to raw
  const description = state.expandedDescription || state.description || '';
  const goal = state.expandedGoal || state.goal || '';
  const useCases = state.expandedUseCases || state.useCases || '';

  const roles = [
    ...(state.audience?.predefined ?? []),
    ...(state.audience?.custom ?? []),
  ].join(', ');

  const competitors = (state.competitors ?? [])
    .filter((c) => c.status === 'done')
    .map((c) => [c.brand, c.productName].filter(Boolean).join(' - '))
    .join(', ');

  const row = [
    new Date().toISOString(),
    state.sessionId ?? '',
    state.productName ?? '',
    state.preparedBy ?? '',
    state.userEmail ?? '',
    description,
    goal,
    useCases,
    (state.context?.environments ?? []).join(', '),
    (state.context?.industries ?? []).join(', '),
    roles,
    (state.features?.mustHave ?? []).join(', '),
    (state.features?.niceToHave ?? []).join(', '),
    state.commercials?.moq ?? '',
    state.commercials?.targetPrice ?? '',
    competitors,
    exportFormat ?? '',
  ];

  try {
    await appendSheetRow(row);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[log-document] Sheets write failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false });
  }
}
```
- [ ] Verify build: `npm run build 2>&1 | grep -E "error|Error"`
- [ ] Commit:
```bash
git add app/api/one-pager-beta/log-document/
git commit -m "feat(beta): add log-document API endpoint"
```

---

## Chunk 3: Client Integration

### Task 4: Call log-document from export handler

**Files:**
- Modify: `app/one-pager-beta/page.tsx`

- [ ] Open `app/one-pager-beta/page.tsx`
- [ ] Add logging helper after `handleAutoFill` (or after `handleExport` definition):
```typescript
const logDocument = useCallback((format: string) => {
  fetch('/api/one-pager-beta/log-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, exportFormat: format }),
  }).catch(() => {}); // fire and forget
}, [state]);
```
- [ ] Inside `handleExport`, call `logDocument(format)` immediately before the fetch to the export API:
```typescript
const handleExport = useCallback(async (format: 'docx' | 'html' | 'pdf') => {
  logDocument(format); // fire and forget — log before export
  setIsExporting(format);
  // ... rest of existing code unchanged
```
- [ ] Verify build: `npm run build 2>&1 | grep -E "error|Error"`
- [ ] Commit:
```bash
git add app/one-pager-beta/page.tsx
git commit -m "feat(beta): log full one-pager state to Google Sheets on export"
```

---

### Task 5: Deploy and verify

- [ ] Run: `vercel --prod`
- [ ] Open `https://mrd-producer-webapp.vercel.app/one-pager-beta`
- [ ] Fill in a one-pager and click Download DOCX
- [ ] Open the Google Sheet — verify a new row appeared with all columns populated
- [ ] Verify export itself still works (logging is non-blocking)
- [ ] Check Vercel function logs for any errors: `vercel logs mrd-producer-webapp.vercel.app`
