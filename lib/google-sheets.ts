import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

function getAuth(): JWT {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!encoded) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
  const creds = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
  return new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });
}

async function getSheet() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_ID not set');
  const doc = new GoogleSpreadsheet(spreadsheetId, getAuth());
  await doc.loadInfo();

  // Find or create the "One-Pager Log" tab
  let sheet = doc.sheetsByTitle['One-Pager Log'];
  if (!sheet) {
    sheet = await doc.addSheet({ title: 'One-Pager Log' });
    await sheet.setHeaderRow([
      'timestamp', 'sessionId', 'productName', 'preparedBy', 'userEmail',
      'description', 'goal', 'useCases', 'environments', 'industries', 'roles',
      'mustHave', 'niceToHave', 'moq', 'targetPrice', 'competitors', 'exportFormat',
    ]);
  }
  return sheet;
}

export async function appendSheetRow(values: string[]): Promise<void> {
  const sheet = await getSheet();
  await sheet.addRow(values);
}

/**
 * Set up the spreadsheet: rename first tab and add header row.
 * Safe to call multiple times (idempotent).
 */
export async function setupSheet(): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_ID not set');
  const doc = new GoogleSpreadsheet(spreadsheetId, getAuth());
  await doc.loadInfo();

  // Rename first sheet if it's still called Sheet1
  const firstSheet = doc.sheetsByIndex[0];
  if (firstSheet.title === 'Sheet1') {
    await firstSheet.updateProperties({ title: 'One-Pager Log' });
  }

  // Ensure header row exists
  const sheet = doc.sheetsByTitle['One-Pager Log'];
  if (sheet) {
    await sheet.loadHeaderRow().catch(() => null);
    if (!sheet.headerValues?.length) {
      await sheet.setHeaderRow([
        'timestamp', 'sessionId', 'productName', 'preparedBy', 'userEmail',
        'description', 'goal', 'useCases', 'environments', 'industries', 'roles',
        'mustHave', 'niceToHave', 'moq', 'targetPrice', 'competitors', 'exportFormat',
      ]);
    }
  }
}
