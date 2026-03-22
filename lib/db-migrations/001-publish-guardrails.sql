-- Migration 001: Publish flow + content guardrails schema
-- Run against Neon before deploying Phase 2+

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS creator_name  TEXT,
  ADD COLUMN IF NOT EXISTS creator_email TEXT;

CREATE TABLE IF NOT EXISTS guardrail_violations (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT        NOT NULL,
  user_name      TEXT,
  user_email     TEXT,
  ip             TEXT,
  user_agent     TEXT,
  action_type    TEXT        NOT NULL,
  input_text     TEXT        NOT NULL,
  violation_type TEXT[]      NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guardrail_violations_user_id
  ON guardrail_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_guardrail_violations_created_at
  ON guardrail_violations(created_at DESC);

CREATE TABLE IF NOT EXISTS banned_users (
  user_id         TEXT        PRIMARY KEY,
  banned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason          TEXT,
  violation_count INT         NOT NULL DEFAULT 2
);
