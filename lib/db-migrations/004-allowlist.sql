-- Migration 004: move feature allowlist from config/allowlist.txt into Postgres
-- Cloud Run images are immutable — a file baked in at build time can't be edited
-- by an admin UI at runtime. This table replaces the file as source of truth.
-- features: integer array matching FEATURE_MAP in lib/feature-gate.ts
--   1=mrd-generator 2=one-pager 3=brief-helper 4=one-pager-beta
--   5=prd-producer 6=one-pager-alpha 7=rd-viewer

CREATE TABLE IF NOT EXISTS allowlist (
  email TEXT PRIMARY KEY,
  features INTEGER[] NOT NULL DEFAULT '{}',
  invited_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed with current config/allowlist.txt contents, minus the `*` wildcard row
-- (wildcard removed intentionally — access is invite-only going forward)
INSERT INTO allowlist (email, features, invited_by) VALUES
  ('ori@compulocks.com',    ARRAY[1,2,3,4,5,6,7], 'migration'),
  ('danny@compulocks.com',  ARRAY[1,2,3,4,5,6],   'migration'),
  ('shahar@compulocks.com', ARRAY[2,4,5,7],       'migration'),
  ('chloe@compulocks.com',  ARRAY[2,7],           'migration'),
  ('shmuel@compulocks.com', ARRAY[2,4],           'migration'),
  ('emanuele@compulocks.com', ARRAY[2],           'migration')
ON CONFLICT (email) DO NOTHING;
