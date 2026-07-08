import { Storage } from '@google-cloud/storage';

let _storage: Storage | null = null;

function getCredentials() {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!encoded) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
  return JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
}

export function getStorageClient(): Storage {
  if (!_storage) {
    const creds = getCredentials();
    _storage = new Storage({
      projectId: creds.project_id,
      credentials: { client_email: creds.client_email, private_key: creds.private_key },
    });
  }
  return _storage;
}

export function getBucketName(): string {
  const name = process.env.GCS_BUCKET_NAME;
  if (!name) throw new Error('GCS_BUCKET_NAME not set');
  return name;
}
