-- Migration 003: add version tracking to documents
-- version: '0.1' = draft, '1.0' = first published, '1.x' = subsequent revisions
-- version_history: array of snapshots [{version, saved_at, content_json}]

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS version TEXT NOT NULL DEFAULT '0.1',
  ADD COLUMN IF NOT EXISTS version_history JSONB NOT NULL DEFAULT '[]'::jsonb;
