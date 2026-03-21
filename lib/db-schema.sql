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
