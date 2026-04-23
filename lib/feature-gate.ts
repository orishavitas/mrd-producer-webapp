import fs from 'fs';
import path from 'path';

export type FeatureKey =
  | 'mrd-generator'
  | 'one-pager'
  | 'brief-helper'
  | 'one-pager-beta'
  | 'prd-producer';

const FEATURE_MAP: Record<string, FeatureKey> = {
  '1': 'mrd-generator',
  '2': 'one-pager',
  '3': 'brief-helper',
  '4': 'one-pager-beta',
  '5': 'prd-producer',
};

function parseAllowlist(): Map<string, Set<FeatureKey>> {
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

export function getFeaturesForEmail(email: string | null | undefined): Set<FeatureKey> {
  if (!email) return new Set();
  const allowlist = parseAllowlist();
  return allowlist.get(email.toLowerCase()) ?? new Set();
}

export function hasFeature(email: string | null | undefined, feature: FeatureKey): boolean {
  return getFeaturesForEmail(email).has(feature);
}
