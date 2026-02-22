-- Run in Vercel Postgres dashboard or via psql
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

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_tool_type ON documents(tool_type);
CREATE INDEX idx_documents_deleted_at ON documents(deleted_at);
