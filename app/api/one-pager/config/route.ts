import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import {
  getEnvironments,
  getIndustries,
  loadIndustryRolesConfig,
  loadStandardFeatures,
} from '@/lib/one-pager/config-loader';

export async function GET() {
  try {
    const config = loadIndustryRolesConfig();
    const standardFeatures = loadStandardFeatures();
    return NextResponse.json({
      environments: config.environments,
      industries: getIndustries(),
      rolesByIndustry: Object.fromEntries(
        Object.entries(config.industries).map(([id, data]) => [id, data.roles])
      ),
      standardFeatures: standardFeatures.categories,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
