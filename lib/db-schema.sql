-- Run against any PostgreSQL instance (Vercel Postgres, Neon, Cloud SQL, local).
-- For pgvector support, the database must have the vector extension enabled:
--   CREATE EXTENSION IF NOT EXISTS vector;
-- Neon and Vercel Postgres enable this automatically.
-- On Cloud SQL: enable the "pgvector" database flag in the GCP console first.
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  tool_type TEXT NOT NULL CHECK (tool_type IN ('mrd', 'one-pager', 'brief')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'complete')),
  drive_file_id TEXT,
  drive_folder TEXT,
  content_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_tool_type ON documents(tool_type);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at);

-- ── RAG vector store ──────────────────────────────────────────────────────────
-- Requires the pgvector extension. text-embedding-004 produces 768-dim vectors.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS document_embeddings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   TEXT NOT NULL UNIQUE,   -- one-pager sessionId, used for upsert
  product_name TEXT,
  content_text TEXT NOT NULL,          -- concatenated description + goal + useCases
  embedding    vector(768) NOT NULL,   -- Gemini text-embedding-004
  metadata     JSONB DEFAULT '{}',     -- { mustHave, niceToHave, environments, industries }
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IVFFlat index for approximate nearest-neighbour search (cosine distance).
-- lists=100 is a reasonable default for up to ~1M rows; tune up as the table grows.
CREATE INDEX IF NOT EXISTS idx_document_embeddings_vector
  ON document_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_session_id
  ON document_embeddings(session_id);

-- ── PRD pipeline tables ───────────────────────────────────────────────────────
-- Three-table schema for MRD→PRD transformation pipeline with approval gates.

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
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_source ON pipeline_runs(source_document_id);
CREATE INDEX IF NOT EXISTS idx_prd_documents_run ON prd_documents(run_id);
CREATE INDEX IF NOT EXISTS idx_prd_frames_document ON prd_frames(prd_document_id);
