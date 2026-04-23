/**
 * Centralized configuration for magic constants.
 * Environment variables override defaults.
 */

export const config = {
  ai: {
    geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-pro',
    geminiFlashModel: process.env.GEMINI_FLASH_MODEL ?? 'gemini-2.5-flash',
    maxTokens: 4096,
    prdCoverageThreshold: parseFloat(process.env.PRD_COVERAGE_THRESHOLD ?? '0.85'),
    prdQualityThreshold: parseFloat(process.env.PRD_QUALITY_THRESHOLD ?? '0.80'),
    prdMaxRetries: parseInt(process.env.PRD_MAX_RETRIES ?? '2', 10),
  },
  db: {
    poolMax: parseInt(process.env.DB_POOL_MAX ?? '10', 10),
  },
  security: {
    allowedDomain: process.env.ALLOWED_DOMAIN ?? 'compulocks.com',
    banThreshold: parseInt(process.env.BAN_THRESHOLD ?? '2', 10),
  },
  input: {
    maxDescriptionLength: 2000,
  },
} as const;
