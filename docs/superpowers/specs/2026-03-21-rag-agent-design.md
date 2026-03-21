# RAG Agent — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## What it does

A dedicated RAG (Retrieval-Augmented Generation) agent that:
1. **Ingests** logged one-pager documents (from Google Sheets) and embeds them as vectors
2. **Stores** embeddings in a vector store
3. **Retrieves** relevant past documents when a new description is entered
4. **Augments** the feature auto-fill prompt with retrieved context ("products like this typically need X")

This makes the feature auto-fill smarter over time as more one-pagers are logged.

## Architecture

```
Google Sheets (raw log)
        ↓
RAG Ingest Agent (scheduled or on-demand)
        ↓
Vector Store (Vercel Postgres + pgvector extension)
        ↓
RAG Retrieval Agent (called by suggest-features API)
        ↓
Augmented feature auto-fill prompt
```

## Vector Store

Use **Vercel Postgres with pgvector** extension:
- Table: `document_embeddings`
- Columns: `id`, `session_id`, `product_name`, `content_text` (full doc text), `embedding` (vector), `metadata` (JSONB), `created_at`
- `content_text` = concatenation of description + goal + use cases (the semantic core)
- Embeddings via **Google `text-embedding-004`** model (via Gemini API, already keyed)

## RAG Agent (`agent/agents/one-pager-beta/rag-agent.ts`)

Two responsibilities exposed as separate methods:

### 1. Ingest
```typescript
ingest(doc: OnePagerLogRow): Promise<void>
```
- Builds `content_text` from description + goal + use cases
- Calls Gemini embedding API
- Upserts into `document_embeddings` (keyed on `session_id`)
- Called from `log-document` API after sheet write (non-blocking)

### 2. Retrieve
```typescript
retrieve(query: string, topK = 5): Promise<RetrievedDoc[]>
```
- Embeds the query text
- Runs cosine similarity search in pgvector
- Returns top-K documents with their `mustHave`/`niceToHave` features and metadata
- Called from `suggest-features` API before building the AI prompt

## Augmented Feature Auto-Fill Prompt

When retrieval returns results, the suggest-features system prompt is extended:

```
Similar products in our database selected these features:
- [Product A]: Must Have: Wall Mount, Cable Management / Nice to Have: Auto-Rotate
- [Product B]: Must Have: Large (15"–24"), Locking Enclosure / Nice to Have: ...

Use this as additional signal, but prioritize the description.
```

If no similar products found (cold start), prompt runs without augmentation — graceful degradation.

## Ingest Trigger

Two modes:
1. **Real-time**: called from `log-document` API after successful sheet write (async, non-blocking)
2. **Backfill**: `POST /api/one-pager-beta/rag-backfill` — reads all rows from Google Sheets and ingests any not yet in the vector store (idempotent, keyed on sessionId)

## pgvector Setup

SQL migration to run once:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE document_embeddings (
  id SERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  product_name TEXT,
  content_text TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON document_embeddings USING ivfflat (embedding vector_cosine_ops);
```

Dimension 768 = Google `text-embedding-004` output size.

## Error Handling

- pgvector not enabled → log warning, skip embedding, ingest still writes to Sheets
- Embedding API failure → log warning, skip vector store write
- Retrieval failure → suggest-features runs without RAG context (graceful degradation)
- Never block the user-facing export or feature auto-fill

## Scope

Beta only. Dedicated agent at `agent/agents/one-pager-beta/rag-agent.ts`. New API routes under `app/api/one-pager-beta/`. DB migration script at `scripts/migrate-pgvector.sql`.
