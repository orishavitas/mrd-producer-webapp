import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface PRDSectionConfig {
  key: string;
  title: string;
  order: number;
  systemPrompt: string;
  userPromptTemplate: string;
}

interface YAMLConfig {
  sections: PRDSectionConfig[];
}

let cached: PRDSectionConfig[] | null = null;

export function loadPRDSections(): PRDSectionConfig[] {
  if (cached) return cached;

  const filePath = path.join(process.cwd(), 'config', 'prd-sections.yaml');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = yaml.load(raw) as YAMLConfig;

  cached = parsed.sections.sort((a, b) => a.order - b.order);
  return cached;
}

export interface PRDSectionV2Config {
  key: string;
  title: string;
  order: number;
  type: 'text' | 'requirements';
  onePagerSkipKey: string | null;
  systemPrompt: string;
}

interface YAMLConfigV2 {
  sections: PRDSectionV2Config[];
}

let cachedV2: PRDSectionV2Config[] | null = null;

export function loadPRDSectionsV2(): PRDSectionV2Config[] {
  if (cachedV2) return cachedV2;

  const filePath = path.join(process.cwd(), 'config', 'prd-sections-v2.yaml');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = yaml.load(raw) as YAMLConfigV2;

  cachedV2 = parsed.sections.sort((a, b) => a.order - b.order);
  return cachedV2;
}
