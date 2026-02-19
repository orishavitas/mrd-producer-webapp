import { NextResponse } from 'next/server';
import { getEnvironments, getIndustries, loadIndustryRolesConfig } from '@/lib/one-pager/config-loader';

export async function GET() {
  try {
    const config = loadIndustryRolesConfig();
    return NextResponse.json({
      environments: config.environments,
      industries: getIndustries(),
      rolesByIndustry: Object.fromEntries(
        Object.entries(config.industries).map(([id, data]) => [id, data.roles])
      ),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
