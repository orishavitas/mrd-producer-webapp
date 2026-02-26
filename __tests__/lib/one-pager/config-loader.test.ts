import {
  loadIndustryRolesConfig,
  getEnvironments,
  getIndustries,
  getRolesForIndustries,
} from '@/lib/one-pager/config-loader';

describe('config-loader', () => {
  it('loads config without error', () => {
    const config = loadIndustryRolesConfig();
    expect(config).toBeDefined();
    expect(config.environments.length).toBeGreaterThan(0);
    expect(Object.keys(config.industries).length).toBeGreaterThan(0);
  });

  it('returns environments as array', () => {
    const envs = getEnvironments();
    expect(envs.length).toBeGreaterThan(0);
    expect(envs[0]).toHaveProperty('id');
    expect(envs[0]).toHaveProperty('label');
  });

  it('returns industry list', () => {
    const industries = getIndustries();
    expect(industries.length).toBeGreaterThan(0);
    expect(industries[0]).toHaveProperty('id');
    expect(industries[0]).toHaveProperty('label');
  });

  it('returns roles for selected industries', () => {
    const roles = getRolesForIndustries(['healthcare', 'hospitality']);
    expect(roles).toContain('Nurses');
    expect(roles).toContain('Doctors');
    expect(roles).toContain('Servers');
    expect(roles).toContain('Bartenders');
  });

  it('returns empty array for no industries', () => {
    const roles = getRolesForIndustries([]);
    expect(roles).toEqual([]);
  });

  it('deduplicates roles across industries', () => {
    const roles = getRolesForIndustries(['healthcare', 'healthcare']);
    const unique = [...new Set(roles)];
    expect(roles.length).toBe(unique.length);
  });
});
