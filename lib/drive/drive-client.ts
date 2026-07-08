import { google, drive_v3 } from 'googleapis';
import { JWT } from 'google-auth-library';

let _drive: drive_v3.Drive | null = null;

function getCredentials() {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!encoded) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
  return JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
}

export function getDriveClient(): drive_v3.Drive {
  if (!_drive) {
    const creds = getCredentials();
    const auth = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    _drive = google.drive({ version: 'v3', auth });
  }
  return _drive;
}
