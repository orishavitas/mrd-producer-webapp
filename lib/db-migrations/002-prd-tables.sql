-- lib/db-migrations/002-prd-tables.sql
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id UUID NOT NULL REFERENCES documents(id),
  status             TEXT NOT NULL CHECK (status IN ('running','awaiting_approval','approved','completed','failed')),
  skeleton_json      JSONB,
  agent_progress     JSONB DEFAULT '{}',
  created_by         TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prd_documents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id             UUID NOT NULL REFERENCES pipeline_runs(id),
  source_document_id UUID NOT NULL REFERENCES documents(id),
  product_name       TEXT NOT NULL,
  qa_score           INTEGER CHECK (qa_score BETWEEN 0 AND 100),
  qa_suggestions     JSONB DEFAULT '[]',
  created_by         TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prd_frames (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prd_document_id UUID NOT NULL REFERENCES prd_documents(id),
  section_key     TEXT NOT NULL,
  section_order   INTEGER NOT NULL,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_source ON pipeline_runs(source_document_id);
CREATE INDEX IF NOT EXISTS idx_prd_documents_run ON prd_documents(run_id);
CREATE INDEX IF NOT EXISTS idx_prd_frames_document ON prd_frames(prd_document_id);
