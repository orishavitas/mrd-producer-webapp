import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities } from '@/lib/providers/types';
import { OnePagerSummary } from './types';

export interface AnalystInput {
  contentJson: Record<string, unknown>;
}

export class OnePagerAnalystAgent extends BaseAgent<AnalystInput, OnePagerSummary> {
  readonly id = 'one-pager-analyst-agent';
  readonly name = 'One-Pager Analyst Agent';
  readonly version = '1.0.0';
  readonly description = 'Normalises saved One-Pager content_json into a typed OnePagerSummary';
  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = [];

  validateInput(input: AnalystInput): ValidationResult {
    if (!input?.contentJson || typeof input.contentJson !== 'object') {
      return { valid: false, errors: ['contentJson is required'] };
    }
    return { valid: true };
  }

  protected async executeCore(
    input: AnalystInput,
    context: ExecutionContext
  ): Promise<OnePagerSummary> {
    return OnePagerAnalystAgent.normalise(input.contentJson);
  }

  static normalise(raw: Record<string, unknown>): OnePagerSummary {
    const ctx = (raw.context ?? {}) as Record<string, unknown>;
    const audience = (raw.audience ?? {}) as Record<string, unknown>;
    const features = (raw.features ?? {}) as Record<string, unknown>;
    const commercials = (raw.commercials ?? {}) as Record<string, unknown>;
    const competitors = ((raw.competitors ?? []) as Record<string, unknown>[]).map((c) => ({
      brand: String(c.brand ?? ''),
      productName: String(c.productName ?? ''),
      description: String(c.description ?? ''),
      cost: String(c.cost ?? ''),
    }));
    const customization = (raw.customization ?? {}) as Record<string, unknown>;
    const paint = (customization.paint ?? {}) as Record<string, unknown>;
    const paintStr = [paint.finish, paint.color].filter(Boolean).join(' / ');
    const logoColors = ((customization.logoColors ?? []) as Record<string, unknown>[]).map(
      (c) => `${c.mode} ${c.value}`
    );

    return {
      productName: String(raw.productName ?? ''),
      description: [raw.description, raw.expandedDescription]
        .filter(Boolean)
        .join('\n\n'),
      goal: [raw.goal, raw.expandedGoal].filter(Boolean).join('\n\n'),
      useCases: [raw.useCases, raw.expandedUseCases]
        .filter(Boolean)
        .join('\n\n'),
      environments: (ctx.environments ?? []) as string[],
      industries: (ctx.industries ?? []) as string[],
      audience: [
        ...((audience.predefined ?? []) as string[]),
        ...((audience.custom ?? []) as string[]),
      ],
      mustHaveFeatures: (features.mustHave ?? []) as string[],
      niceToHaveFeatures: (features.niceToHave ?? []) as string[],
      moq: String(commercials.moq ?? ''),
      targetPrice: String(commercials.targetPrice ?? ''),
      competitors,
      customization: { paint: paintStr, logoColors },
    };
  }
}
