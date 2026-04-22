/**
 * PRD Gate Middleware Tests
 *
 * Tests the R&D email gate for /prd and /api/pipeline/prd routes.
 */

import { isRDEmail } from '@/lib/rd-email-gate';

describe('isRDEmail', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ALLOWED_RD_EMAILS: 'ori@compulocks.com,eng@compulocks.com',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('allows listed emails', () => {
    expect(isRDEmail('ori@compulocks.com')).toBe(true);
    expect(isRDEmail('eng@compulocks.com')).toBe(true);
  });

  it('allows case-insensitive matches', () => {
    expect(isRDEmail('ORI@COMPULOCKS.COM')).toBe(true);
    expect(isRDEmail('Eng@Compulocks.Com')).toBe(true);
  });

  it('rejects unlisted emails', () => {
    expect(isRDEmail('sales@compulocks.com')).toBe(false);
    expect(isRDEmail('random@example.com')).toBe(false);
  });

  it('rejects null and undefined', () => {
    expect(isRDEmail(null)).toBe(false);
    expect(isRDEmail(undefined)).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isRDEmail('')).toBe(false);
  });

  it('handles whitespace in allowed list', () => {
    process.env.ALLOWED_RD_EMAILS = '  ori@compulocks.com  ,  eng@compulocks.com  ';
    expect(isRDEmail('ori@compulocks.com')).toBe(true);
    expect(isRDEmail('eng@compulocks.com')).toBe(true);
  });

  it('returns false when env var is not set', () => {
    delete process.env.ALLOWED_RD_EMAILS;
    expect(isRDEmail('ori@compulocks.com')).toBe(false);
  });
});
