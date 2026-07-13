-- Migration 007: drop the old PRD pipeline tables.
-- The pre-rebuild PRD pipeline (analyst/architect/writer/QA agents, skeleton
-- approval gate) never produced a successfully reviewed PRD end-to-end —
-- confirmed with the user 2026-07-08. No data migration needed; these are
-- dropped, not moved to GCS. The current PRD Producer pipeline stores
-- documents as versioned JSON envelopes in GCS (see lib/gcs/documents.ts),
-- not in these Postgres tables.
--
-- Do NOT run this migration against production until Tasks 1-7 of the
-- GCS/Drive PRD rebuild plan are verified working end-to-end in an
-- environment pointed at real GCS/Drive.
DROP TABLE IF EXISTS prd_frames;
DROP TABLE IF EXISTS prd_documents;
DROP TABLE IF EXISTS pipeline_runs;
