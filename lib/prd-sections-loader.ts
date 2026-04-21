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
