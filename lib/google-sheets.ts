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
