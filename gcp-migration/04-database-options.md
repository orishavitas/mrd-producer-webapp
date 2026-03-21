# Database Options
> **Audience:** IT team — choose the right database before starting migration. This decision affects cost, maintenance overhead, and how much code the development team needs to change.

---

## Current Database

The app currently uses **Vercel Postgres** — a managed PostgreSQL service provided by Vercel.

The app has one table: `documents` — storing metadata for user-created MRDs and One-Pagers.

**Schema (from `lib/db-schema.sql`):**
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  tool_type TEXT NOT NULL,        -- 'mrd' or 'one-pager'
  status TEXT DEFAULT 'draft',
  drive_file_id TEXT,
  drive_folder TEXT,
  content_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ          -- soft delete
);
```

---

## Option Comparison

| | Cloud SQL (PostgreSQL) | Firestore | Cloud Spanner |
|---|---|---|---|
| **Type** | Managed relational DB | Serverless NoSQL | Distributed relational DB |
| **Cost** | ~$10–50/mo (db-f1-micro to db-g1-small) | $0 at low usage; pay per read/write | ~$300+/mo minimum |
| **Code changes** | Minimal — swap npm package + connection string | Significant — rewrite all queries | Minimal — standard SQL |
| **Migration effort** | Low — `pg_dump` / `pg_restore` | High — data transformation required | Low — standard SQL |
| **Maintenance** | Patch versions, backups (automated) | Zero — fully managed | Zero — fully managed |
| **Best for** | This app at current scale | High-traffic, globally distributed apps | Enterprise global scale |
| **Scales to** | Thousands of users easily | Millions of users | Billions of operations |

---

## Recommendation: Cloud SQL (PostgreSQL)

**Use Cloud SQL.** It is the lowest-effort migration path for this app:
- Existing PostgreSQL schema works as-is
- Only one file needs changing in the codebase (`lib/db.ts` — swap `@vercel/postgres` for `pg`)
- Data migrates cleanly via `pg_dump` / `pg_restore`
- Automated backups and point-in-time recovery built in
- Can scale up instance size as user base grows

---

## Cloud SQL Setup

### 1. Create the instance

```bash
gcloud sql instances create mrd-producer-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=europe-west1 \
  --storage-auto-increase \
  --backup \
  --backup-start-time=02:00
```

> **Tier:** `db-f1-micro` (~$10/mo) is sufficient for internal R&D use. Upgrade to `db-g1-small` (~$50/mo) if response times degrade.

### 2. Create the database and user

```bash
gcloud sql databases create mrd_producer --instance=mrd-producer-db

gcloud sql users create app_user \
  --instance=mrd-producer-db \
  --password=STRONG_RANDOM_PASSWORD
```

### 3. Run the schema

```bash
# First, install and run Cloud SQL Auth Proxy locally:
# Download: https://cloud.google.com/sql/docs/postgres/connect-auth-proxy#install
./cloud-sql-proxy YOUR_PROJECT_ID:europe-west1:mrd-producer-db &

# Then run the schema (proxy listens on 127.0.0.1:5432 by default):
psql "host=127.0.0.1 port=5432 dbname=mrd_producer user=app_user" \
  -f lib/db-schema.sql
```

### 4. Migrate existing data from Vercel Postgres

```bash
# Export from Vercel Postgres (substitute the actual connection string from your Vercel dashboard)
VERCEL_POSTGRES_URL="postgresql://user:password@host/dbname"
pg_dump "$VERCEL_POSTGRES_URL" --no-owner --no-acl -f vercel-backup.sql

# Import to Cloud SQL
psql "host=127.0.0.1 port=5432 dbname=mrd_producer user=app_user" \
  -f vercel-backup.sql
```

---

## Connecting Cloud Run to Cloud SQL

> **Important:** Cloud Run is serverless — it cannot use a persistent TCP connection to Cloud SQL. You must use the **Cloud SQL Auth Proxy** or the built-in **Unix socket** method.

### Unix socket method (recommended for Cloud Run)

Cloud Run has built-in support for Cloud SQL connections via Unix socket — no sidecar needed.

Add to your `gcloud run deploy` command:
```bash
--add-cloudsql-instances=YOUR_PROJECT_ID:europe-west1:mrd-producer-db
```

For Cloud Run, the `pg` Node.js package requires the socket path as the `host` config field, not as a URL query parameter.

Update the connection code in `lib/db.ts` to use this pattern:

```typescript
import { Pool } from 'pg';
const pool = new Pool({
  user: 'app_user',
  password: process.env.DB_PASSWORD,
  database: 'mrd_producer',
  host: '/cloudsql/YOUR_PROJECT_ID:europe-west1:mrd-producer-db',
});
```

> Store `DB_PASSWORD` as a separate secret in Secret Manager. Do not embed passwords in connection strings.

### Grant Cloud Run access to Cloud SQL

```bash
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

---

## Code Change Required (Development Team)

The app currently uses `@vercel/postgres`. After migration, `lib/db.ts` must be updated to use the `pg` package.

**Before (Vercel Postgres):**
```typescript
import { sql } from '@vercel/postgres';
const result = await sql`SELECT * FROM documents WHERE user_id = ${userId}`;
```

**After (standard pg):**
```typescript
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const result = await pool.query('SELECT * FROM documents WHERE user_id = $1', [userId]);
```

This change is isolated to `lib/db.ts`. The development team will handle this alongside the migration.

---

## Why Not Firestore?

Firestore requires rewriting all database queries from SQL to Firestore's document/collection model. The effort is disproportionate for the current scale of this app and would require significant developer time and testing. Cloud SQL is the right choice unless the app scales to millions of users.

## Why Not Cloud Spanner?

Cloud Spanner starts at ~$300/mo and is designed for globally distributed, high-throughput workloads. This app serves a small internal team — the cost and complexity are unjustified.
