import fs from 'fs';
import path from 'path';

function loadAllowlist(): string[] {
  // Env var takes precedence (Vercel production)
  const envList = process.env.ALLOWED_RD_EMAILS ?? '';
  if (envList) {
    return envList.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  }
  // Local dev: read from config/rd-allowlist.txt
  try {
    const file = fs.readFileSync(path.join(process.cwd(), 'config/rd-allowlist.txt'), 'utf8');
    return file
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((e) => e.toLowerCase());
  } catch {
    return [];
  }
}

export function isRDEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = loadAllowlist();
  if (allowlist.length === 0) {
    console.warn('[isRDEmail] No R&D allowlist configured — PRD Producer hidden from all users');
    return false;
  }
  return allowlist.includes(email.toLowerCase());
}
