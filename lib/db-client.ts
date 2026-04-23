/**
 * Shared PostgreSQL connection pool.
 * Works with Vercel Postgres, Neon, Cloud SQL, or any standard Postgres URL.
 *
 * Usage:
 *   import { query } from '@/lib/db-client';
 *   const { rows } = await query('SELECT * FROM documents WHERE user_id = $1', [userId]);
 *
 * Tagged-template helper:
 *   import { sql } from '@/lib/db-client';
 *   const { rows } = await sql`SELECT * FROM documents WHERE user_id = ${userId}`;
 */

import { Pool } from 'pg';
import { config } from './config';

function getPool(): Pool {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) throw new Error('POSTGRES_URL environment variable is not set');
  return new Pool({ connectionString, max: config.db.poolMax });
}

// Singleton pool — reused across requests in the same Node.js process.
// On serverless (Vercel / Cloud Run), each instance gets its own pool.
let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) _pool = getPool();
  return _pool;
}

/** Run a parameterized query. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T = Record<string, any>>(
  text: string,
  values?: unknown[]
): Promise<{ rows: T[] }> {
  const result = await pool().query(text, values);
  return { rows: result.rows as T[] };
}

/**
 * Tagged-template SQL helper — provides the same ergonomics as @vercel/postgres `sql\`...\``.
 *
 * Usage:
 *   const { rows } = await sql`SELECT * FROM documents WHERE id = ${id}`;
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sql<T = Record<string, any>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<{ rows: T[] }> {
  // Rebuild parameterized query: $1, $2, …
  let text = '';
  strings.forEach((s, i) => {
    text += s;
    if (i < values.length) text += `$${i + 1}`;
  });
  return query<T>(text, values);
}
