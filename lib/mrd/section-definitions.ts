/**
 * MRD Section Definitions
 *
 * Loads and validates config/mrd-doc-params.yaml.
 * Server-side only (API routes, agents). Do not import from client components.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// ============================================================================
// Types (from YAML shape)
// ============================================================================

export interface GapRule {
  category: string;
  check: string;
  priority: 'high' | 'medium' | 'low';
  question: string;
}

export interface SubsectionDef {
  id: string;
  title: string;
  enabled: boolean;
  markdown_heading: string;
}

export interface SectionDef {
  id: string;
  number: number;
  title: string;
  enabled: boolean;
  required: boolean;
  min_length: number;
  markdown_heading: string;
  extraction_prompt: string;
  chat_context: string;
  gap_detection: GapRule[];
  subsections?: SubsectionDef[];
}

export interface MRDDocParams {
  sections: SectionDef[];
}

// ============================================================================
// Load and cache
// ============================================================================

let cachedParams: MRDDocParams | null = null;

/**
 * Load MRD doc params from YAML. Cached after first load.
 */
export function loadMRDDocParams(): MRDDocParams {
  if (cachedParams) {
    return cachedParams;
  }

  const configPath = path.join(process.cwd(), 'config', 'mrd-doc-params.yaml');

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = yaml.load(raw) as MRDDocParams;

    if (!parsed?.sections || !Array.isArray(parsed.sections)) {
      throw new Error('mrd-doc-params.yaml must have a "sections" array');
    }

    const enabledCount = parsed.sections.filter((s) => s.enabled !== false).length;
    if (enabledCount === 0) {
      throw new Error('At least one section must be enabled in mrd-doc-params.yaml');
    }

    cachedParams = parsed;
    return parsed;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to load MRD doc params: ${message}`);
  }
}

/**
 * Get only sections that are enabled.
 */
export function getEnabledSections(): SectionDef[] {
  const params = loadMRDDocParams();
  return params.sections.filter((s) => s.enabled !== false);
}

/**
 * Get section by id.
 */
export function getSectionById(sectionId: string): SectionDef | undefined {
  const params = loadMRDDocParams();
  return params.sections.find((s) => s.id === sectionId);
}

/**
 * Get markdown heading for a section (e.g. "## 1. Purpose & Vision").
 */
export function getMarkdownHeading(sectionId: string): string | undefined {
  const section = getSectionById(sectionId);
  return section?.markdown_heading;
}

/**
 * Get all enabled section ids in order.
 */
export function getEnabledSectionIds(): string[] {
  return getEnabledSections().map((s) => s.id);
}

/**
 * Get enabled subsection ids for a section (if any).
 */
export function getEnabledSubsectionIds(sectionId: string): string[] {
  const section = getSectionById(sectionId);
  if (!section?.subsections) return [];
  return section.subsections.filter((s) => s.enabled !== false).map((s) => s.id);
}

/**
 * Get human-readable label for a section (returns title).
 */
export function getSectionLabel(sectionId: string): string {
  const section = getSectionById(sectionId);
  return section?.title ?? sectionId;
}

// ============================================================================
// Markdown assembly for export
// ============================================================================

export interface SectionContentForExport {
  content: string;
  subsections?: Record<string, string>;
}

/**
 * Assemble full MRD markdown from section contents (for DOCX export).
 * Only includes enabled sections. Uses template headings and --- separators.
 */
export function assembleMarkdownFromSections(
  sections: Partial<Record<string, SectionContentForExport>>,
  _options?: { productName?: string }
): string {
  const enabled = getEnabledSections();
  const parts: string[] = [];

  for (const def of enabled) {
    const data = sections[def.id];
    if (!data) continue;

    parts.push(def.markdown_heading);
    parts.push('');
    if (data.content?.trim()) {
      parts.push(data.content.trim());
      parts.push('');
    }
    if (data.subsections && def.subsections) {
      for (const sub of def.subsections) {
        if (sub.enabled === false) continue;
        const subContent = data.subsections[sub.id];
        if (subContent?.trim()) {
          parts.push(sub.markdown_heading);
          parts.push('');
          parts.push(subContent.trim());
          parts.push('');
        }
      }
    }
    parts.push('---');
    parts.push('');
  }

  return parts.join('\n');
}
