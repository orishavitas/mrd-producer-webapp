# One-Pager Full Logging to Google Sheets — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## What it does

Every time a user exports a one-pager (DOCX, PDF, or HTML) from the beta route, the full document state is logged as a structured row in a Google Sheet. This creates a growing dataset of real product specs for future RAG use.

## Google Sheet Structure

Sheet name: `One-Pager Log`
Spreadsheet: new dedicated sheet (created programmatically on first write if it doesn't exist)
Env var: `GOOGLE_SHEETS_ID` — spreadsheet ID stored in Vercel env

| Column | Value |
|--------|-------|
| timestamp | ISO 8601 |
| sessionId | state.sessionId |
| productName | state.productName (omit if empty) |
| preparedBy | state.preparedBy (omit if empty) |
| userEmail | state.userEmail (omit if empty) |
| description | state.description or expandedDescription |
| goal | state.goal or expandedGoal |
| useCases | state.useCases or expandedUseCases |
| environments | comma-joined array |
| industries | comma-joined array |
| roles | comma-joined predefined + custom |
| mustHave | comma-joined features.mustHave |
| niceToHave | comma-joined features.niceToHave |
| moq | state.commercials.moq |
| targetPrice | state.commercials.targetPrice |
| competitors | comma-joined competitor brand+product names |
| exportFormat | "docx" / "pdf" / "html" |

Fields with no value are logged as empty string (never omitted from row — keeps columns aligned).

## Auth

Uses Google Service Account (not OAuth user flow):
- Create a service account in Google Cloud Console
- Grant it Editor access to the spreadsheet
- Store credentials JSON as `GOOGLE_SERVICE_ACCOUNT_JSON` env var (base64-encoded)
- Use `googleapis` npm package (already installed)

## API

`POST /api/one-pager-beta/log-document`

Called client-side from the export handler in `one-pager-beta/page.tsx`, fire-and-forget (non-blocking). Export proceeds regardless of log success/failure.

**Request:** full `OnePagerState` + `exportFormat: string`

**Response:** `{ success: boolean }` — client ignores errors silently

## Trigger

Called inside `handleExport()` in `one-pager-beta/page.tsx` immediately before the download/print, non-blocking (`log(...).catch(() => {})` pattern).

## Error Handling

- Missing credentials → log warning server-side, return `{ success: false }`, export unaffected
- Sheet API error → same
- Never throw to client

## Scope

Beta only. Sheet ID and service account credentials are beta-specific env vars.
