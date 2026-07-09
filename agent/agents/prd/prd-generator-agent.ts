/**
 * PRDGeneratorAgent — one-shot generator for all fixed PRD sections.
 *
 * Input:  { onePagerContentJson: Record<string, unknown>, sectionOverrides?: Record<string, boolean> }
 * Output: PRDSection[] — all 11 fixed sections (config/prd-sections-v2.yaml), each with resolved
 *         `enabled` (One-Pager skippedSections defaults, overridden by sectionOverrides) and
 *         generated `content`.
 *
 * Replaces the old analyst/architect/writer/QA multi-agent pipeline with a single pass: no
 * skeleton, no human approval gate. The `references` section is built directly from
 * productName/preparedBy (no LLM call); the `requirements` section asks the provider for JSON
 * and falls back to an empty array on parse failure; every other section is free-text generation.
 */

import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities } from '@/lib/providers/types';
import { loadPRDSectionsV2, PRDSectionV2Config } from '@/lib/prd-sections-loader';
import { PRDSection, RequirementRow } from './prd-document-types';

export interface GeneratorInput {
  onePagerContentJson: Record<string, unknown>;
  sectionOverrides?: Record<string, boolean>; // key -> enabled, user overrides beyond One-Pager skip defaults
}

interface OnePagerFields {
  productName: string;
  preparedBy: string;
  description: string;
  goal: string;
  useCases: string;
  context: { environments: string[]; industries: string[] };
  audience: { predefined: string[]; custom: string[] };
  features: { mustHave: string[]; niceToHave: string[] };
  commercials: { moq: string; targetPrice: string };
  numberOfSamples: string;
  skippedSections: Record<string, boolean>;
}

function asOnePagerFields(raw: Record<string, unknown>): OnePagerFields {
  return {
    productName: String(raw.productName ?? ''),
    preparedBy: String(raw.preparedBy ?? ''),
    description: String(raw.description ?? ''),
    goal: String(raw.goal ?? ''),
    useCases: String(raw.useCases ?? ''),
    context: (raw.context as OnePagerFields['context']) ?? { environments: [], industries: [] },
    audience: (raw.audience as OnePagerFields['audience']) ?? { predefined: [], custom: [] },
    features: (raw.features as OnePagerFields['features']) ?? { mustHave: [], niceToHave: [] },
    commercials: (raw.commercials as OnePagerFields['commercials']) ?? { moq: '', targetPrice: '' },
    numberOfSamples: String(raw.numberOfSamples ?? ''),
    skippedSections: (raw.skippedSections as Record<string, boolean>) ?? {},
  };
}

function buildTextPrompt(fields: OnePagerFields): string {
  return [
    `Product name: ${fields.productName}`,
    `Description: ${fields.description}`,
    `Goal: ${fields.goal}`,
    `Use cases: ${fields.useCases}`,
    `Environments: ${fields.context.environments.join(', ') || 'N/A'}`,
    `Industries: ${fields.context.industries.join(', ') || 'N/A'}`,
    `Audience: ${[...fields.audience.predefined, ...fields.audience.custom].join(', ') || 'N/A'}`,
    `Must-have features: ${fields.features.mustHave.join('; ') || 'N/A'}`,
    `Nice-to-have features: ${fields.features.niceToHave.join('; ') || 'N/A'}`,
    `MOQ: ${fields.commercials.moq || 'N/A'}`,
    `Target price: ${fields.commercials.targetPrice || 'N/A'}`,
    `Number of samples: ${fields.numberOfSamples || 'N/A'}`,
    `Prepared by: ${fields.preparedBy}`,
  ].join('\n');
}

function buildRequirementsPrompt(fields: OnePagerFields): string {
  return [
    'Return ONLY a JSON array of objects, no prose, no markdown fences.',
    'Each object: { "id": "FR-N", "category": string, "requirement": string, "priority": "Must" | "Nice to have" }',
    `mustHaveFeatures: ${JSON.stringify(fields.features.mustHave)}`,
    `niceToHaveFeatures: ${JSON.stringify(fields.features.niceToHave)}`,
    `environments: ${JSON.stringify(fields.context.environments)}`,
    `industries: ${JSON.stringify(fields.context.industries)}`,
  ].join('\n');
}

function parseRequirementsResponse(text: string): RequirementRow[] {
  const cleaned = text.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row, i) => ({
      id: String(row.id ?? `FR-${i + 1}`),
      category: String(row.category ?? 'General'),
      requirement: String(row.requirement ?? ''),
      priority: row.priority === 'Nice to have' ? 'Nice to have' : 'Must',
    }));
  } catch {
    return [];
  }
}

function resolveEnabled(
  config: PRDSectionV2Config,
  fields: OnePagerFields,
  overrides?: Record<string, boolean>
): boolean {
  if (overrides && config.key in overrides) return overrides[config.key];
  if (config.onePagerSkipKey && fields.skippedSections[config.onePagerSkipKey]) return false;
  return true;
}

/**
 * PRDGeneratorAgent generates all 11 fixed PRD sections in a single pass from a One-Pager.
 */
export class PRDGeneratorAgent extends BaseAgent<GeneratorInput, PRDSection[]> {
  readonly id = 'prd-generator-agent';
  readonly name = 'PRD Generator Agent';
  readonly version = '1.0.0';
  readonly description = 'Generates all PRD sections from a One-Pager in a single pass';
  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = ['textGeneration'];

  validateInput(input: GeneratorInput): ValidationResult {
    if (!input?.onePagerContentJson || typeof input.onePagerContentJson !== 'object') {
      return { valid: false, errors: ['onePagerContentJson is required and must be an object'] };
    }
    return { valid: true };
  }

  protected async executeCore(
    input: GeneratorInput,
    context: ExecutionContext
  ): Promise<PRDSection[]> {
    const fields = asOnePagerFields(input.onePagerContentJson);
    const configs = loadPRDSectionsV2();
    const provider = context.getProvider();

    const sections = await Promise.all(
      configs.map(async (config): Promise<PRDSection> => {
        const enabled = resolveEnabled(config, fields, input.sectionOverrides);

        if (config.key === 'references') {
          return {
            key: config.key,
            title: config.title,
            enabled,
            content: `Source One-Pager: ${fields.productName}, prepared by ${fields.preparedBy}.`,
          };
        }

        if (config.type === 'requirements') {
          const response = await provider.generateText(buildRequirementsPrompt(fields), config.systemPrompt);
          return { key: config.key, title: config.title, enabled, content: parseRequirementsResponse(response.text) };
        }

        const response = await provider.generateText(buildTextPrompt(fields), config.systemPrompt);
        return { key: config.key, title: config.title, enabled, content: response.text.trim() };
      })
    );

    return sections;
  }
}
