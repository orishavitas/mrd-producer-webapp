import fs from 'fs';
import path from 'path';
import { query } from '@/lib/db-client';

export type FeatureKey =
  | 'mrd-generator'
  | 'one-pager'
  | 'brief-helper'
  | 'one-pager-beta'
  | 'prd-producer'
  | 'one-pager-alpha'
  | 'rd-viewer';

export const FEATURE_MAP: Record<string, FeatureKey> = {
  '1': 'mrd-generator',
  '2': 'one-pager',
  '3': 'brief-helper',
  '4': 'one-pager-beta',
  '5': 'prd-producer',
  '6': 'one-pager-alpha',
  '7': 'rd-viewer',
};

const FEATURE_NUMBERS: Record<FeatureKey, string> = Object.fromEntries(
  Object.entries(FEATURE_MAP).map(([num, key]) => [key, num])
) as Record<FeatureKey, string>;

function featuresFromNumbers(nums: number[]): Set<FeatureKey> {
  const result = new Set<FeatureKey>();
  for (const num of nums) {
    const key = FEATURE_MAP[String(num)];
    if (key) result.add(key);
  }
  return result;
}

/** Fallback used only when Postgres is unreachable (e.g. local dev without POSTGRES_URL). */
function parseAllowlistFile(): Map<string, Set<FeatureKey>> {
  let raw = '';
  try {
    raw = fs.readFileSync(path.join(process.cwd(), 'config/allowlist.txt'), 'utf8');
  } catch {
    return new Map();
  }

  const result = new Map<string, Set<FeatureKey>>();
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [emailPart, featurePart] = trimmed.split(':');
    if (!emailPart || !featurePart) continue;
    const email = emailPart.trim().toLowerCase();
    const features = new Set<FeatureKey>();
    for (const num of featurePart.trim().split(/\s+/)) {
      const key = FEATURE_MAP[num];
      if (key) features.add(key);
    }
    result.set(email, features);
  }
  return result;
}

const CACHE_TTL_MS = 30_000;
let cache: Map<string, Set<FeatureKey>> | null = null;
let cacheLoadedAt = 0;

async function loadAllowlist(): Promise<Map<string, Set<FeatureKey>>> {
  const now = Date.now();
  if (cache && now - cacheLoadedAt < CACHE_TTL_MS) return cache;

  try {
    const { rows } = await query<{ email: string; features: number[] }>(
      'SELECT email, features FROM allowlist'
    );
    if (rows.length > 0) {
      const result = new Map<string, Set<FeatureKey>>();
      for (const row of rows) {
        result.set(row.email.toLowerCase(), featuresFromNumbers(row.features));
      }
      cache = result;
      cacheLoadedAt = now;
      return result;
    }
  } catch {
    // DB unreachable or table missing — fall through to file
  }

  // No DB rows (or DB unavailable): fall back to the static file so local dev
  // without Postgres still works.
  const fileResult = parseAllowlistFile();
  cache = fileResult;
  cacheLoadedAt = now;
  return fileResult;
}

export async function getFeaturesForEmail(email: string | null | undefined): Promise<Set<FeatureKey>> {
  if (!email) return new Set();
  const normalized = email.toLowerCase();
  const allowlist = await loadAllowlist();

  if (allowlist.has(normalized)) return allowlist.get(normalized)!;

  const domain = normalized.split('@')[1];
  const domainWildcard = domain ? `*@${domain}` : null;
  if (domainWildcard && allowlist.has(domainWildcard)) return allowlist.get(domainWildcard)!;

  if (allowlist.has('*')) return allowlist.get('*')!;

  return new Set();
}

export async function hasFeature(email: string | null | undefined, feature: FeatureKey): Promise<boolean> {
  return (await getFeaturesForEmail(email)).has(feature);
}

export function invalidateAllowlistCache(): void {
  cache = null;
  cacheLoadedAt = 0;
}

export function featureKeyToNumber(key: FeatureKey): number {
  return Number(FEATURE_NUMBERS[key]);
}
