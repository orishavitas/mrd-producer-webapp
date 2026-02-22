/**
 * Industry-Roles Config Loader
 *
 * Loads config/one-pager/industry-roles.yaml.
 * Server-side only. Do NOT import from client components.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface EnvironmentOption {
  id: string;
  label: string;
}

export interface IndustryConfig {
  label: string;
  roles: string[];
}

export interface IndustryRolesConfig {
  environments: EnvironmentOption[];
  industries: Record<string, IndustryConfig>;
}

let cached: IndustryRolesConfig | null = null;

export function loadIndustryRolesConfig(): IndustryRolesConfig {
  if (cached) return cached;

  const configPath = path.join(process.cwd(), 'config', 'one-pager', 'industry-roles.yaml');
  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = yaml.load(raw) as IndustryRolesConfig;

  if (!parsed?.environments || !Array.isArray(parsed.environments)) {
    throw new Error('industry-roles.yaml must have an "environments" array');
  }
  if (!parsed?.industries || typeof parsed.industries !== 'object') {
    throw new Error('industry-roles.yaml must have an "industries" object');
  }

  cached = parsed;
  return parsed;
}

export function getEnvironments(): EnvironmentOption[] {
  return loadIndustryRolesConfig().environments;
}

export function getIndustries(): { id: string; label: string }[] {
  const config = loadIndustryRolesConfig();
  return Object.entries(config.industries).map(([id, { label }]) => ({ id, label }));
}

export function getRolesForIndustries(industryIds: string[]): string[] {
  const config = loadIndustryRolesConfig();
  const roleSet = new Set<string>();

  for (const id of industryIds) {
    const industry = config.industries[id];
    if (industry) {
      for (const role of industry.roles) {
        roleSet.add(role);
      }
    }
  }

  return Array.from(roleSet);
}

// ── Standard Features ────────────────────────────────────────────────────────

export interface StandardFeatureCategory {
  id: string;
  label: string;
  features: string[];
}

export interface StandardFeaturesConfig {
  categories: StandardFeatureCategory[];
}

let cachedStandardFeatures: StandardFeaturesConfig | null = null;

export function loadStandardFeatures(): StandardFeaturesConfig {
  if (cachedStandardFeatures) return cachedStandardFeatures;

  const configPath = path.join(process.cwd(), 'config', 'one-pager', 'standard-features.yaml');
  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = yaml.load(raw) as StandardFeaturesConfig;

  if (!parsed?.categories || !Array.isArray(parsed.categories)) {
    throw new Error('standard-features.yaml must have a "categories" array');
  }

  cachedStandardFeatures = parsed;
  return parsed;
}
