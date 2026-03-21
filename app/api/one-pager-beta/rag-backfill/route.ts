/**
 * POST /api/one-pager-beta/rag-backfill
 *
 * Reads all rows from Google Sheets and ingests any not yet in the vector store.
 * Idempotent — safe to run multiple times.
 * Intended for manual triggering, not automated.
 */

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { ragAgent } from '@/agent/agents/one-pager-beta/rag-agent';

function getSheets() {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!encoded) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
  const credentials = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  return google.sheets({ version: 'v4', auth });
}

export async function POST() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) return NextResponse.json({ error: 'GOOGLE_SHEETS_ID not set' }, { status: 500 });

  const sheets = getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'One-Pager Log!A2:Q',
  });

  const rows = response.data.values ?? [];
  let ingested = 0;
  let skipped = 0;

  for (const row of rows) {
    // Columns: timestamp(0) sessionId(1) productName(2) preparedBy(3) userEmail(4)
    // description(5) goal(6) useCases(7) environments(8) industries(9) roles(10)
    // mustHave(11) niceToHave(12) moq(13) targetPrice(14) competitors(15) exportFormat(16)
    const sessionId = row[1] ?? '';
    if (!sessionId) { skipped++; continue; }

    try {
      await ragAgent.ingest({
        sessionId,
        productName: row[2] ?? '',
        description: row[5] ?? '',
        goal: row[6] ?? '',
        useCases: row[7] ?? '',
        mustHave: row[11] ? row[11].split(', ').filter(Boolean) : [],
        niceToHave: row[12] ? row[12].split(', ').filter(Boolean) : [],
        environments: row[8] ? row[8].split(', ').filter(Boolean) : [],
        industries: row[9] ? row[9].split(', ').filter(Boolean) : [],
      });
      ingested++;
    } catch (err) {
      console.error(`[rag-backfill] Failed for session ${sessionId}:`, err);
      skipped++;
    }
  }

  return NextResponse.json({ ingested, skipped, total: rows.length });
}
