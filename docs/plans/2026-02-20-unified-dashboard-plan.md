# Unified Dashboard & Auth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Google OAuth login, a dashboard homepage with tool cards + documents table, Vercel Postgres for document metadata, and Google Drive sync stub.

**Architecture:** NextAuth.js v5 handles auth with Google OAuth (including `drive.file` scope). Protected by middleware. Dashboard at `/` shows tool cards grid + documents list. Current MRD form moves to `/mrd`. Vercel Postgres stores document metadata. Drive sync endpoint prepared but folder structure TBD.

**Tech Stack:** NextAuth.js v5, @vercel/postgres, Google Drive API v3, Next.js App Router, CSS Modules with M3 Expressive tokens.

**Design doc:** `docs/plans/2026-02-20-unified-dashboard-design.md`

**Brand reference:** `compulocks-brand-system` repo — use M3 vars already in `globals.css` (`--md-sys-color-primary`, `--font-barlow-condensed`, `--radius-xl`, etc.)

---

### Task 1: Create feature branch

**Files:** None

**Step 1: Create and switch to branch**

```bash
git checkout -b feature/unified-dashboard
```

**Step 2: Commit placeholder**

No commit needed yet — branch is ready.

---

### Task 2: Install dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install NextAuth.js v5 and Vercel Postgres**

```bash
npm install next-auth@beta @auth/core @vercel/postgres
```

**Step 2: Install Google APIs client**

```bash
npm install googleapis
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add next-auth, vercel-postgres, googleapis deps"
```

---

### Task 3: NextAuth.js configuration

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Modify: `.env.local` (manual — do NOT commit)

**Step 1: Create auth config**

Create `lib/auth.ts`:

```typescript
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
```

**Step 2: Create NextAuth route handler**

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

**Step 3: Create type augmentation**

Create `types/next-auth.d.ts`:

```typescript
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
  }
}
```

**Step 4: Add env vars to `.env.local` (DO NOT COMMIT)**

```
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
```

**Step 5: Commit (excluding .env.local)**

```bash
git add lib/auth.ts app/api/auth/ types/next-auth.d.ts
git commit -m "feat: add NextAuth.js v5 config with Google OAuth + Drive scope"
```

---

### Task 4: Auth middleware

**Files:**
- Create: `middleware.ts` (project root)

**Step 1: Create middleware**

Create `middleware.ts`:

```typescript
export { auth as middleware } from '@/lib/auth';

export const config = {
  matcher: [
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

**Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add auth middleware protecting all routes except /login"
```

---

### Task 5: Login page

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/login/page.module.css`

**Step 1: Create login page**

Create `app/login/page.tsx`:

```typescript
import { signIn } from '@/lib/auth';

export default function LoginPage() {
  return (
    <main className="page">
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="card" style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>MRD Producer</h1>
          <p style={{ color: 'var(--on-surface-variant)', marginBottom: '2rem' }}>
            Sign in to access your tools and documents
          </p>
          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: '/' });
            }}
          >
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
              Sign in with Google
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add app/login/
git commit -m "feat: add branded login page with Google OAuth sign-in"
```

---

### Task 6: Database schema

**Files:**
- Create: `lib/db.ts`
- Create: `lib/db-schema.sql` (reference only — run manually or via Vercel dashboard)

**Step 1: Create DB helper**

Create `lib/db.ts`:

```typescript
import { sql } from '@vercel/postgres';

export interface Document {
  id: string;
  user_id: string;
  title: string;
  tool_type: 'mrd' | 'one-pager' | 'brief';
  status: 'draft' | 'complete';
  drive_file_id: string | null;
  drive_folder: string | null;
  content_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export async function listDocuments(userId: string, toolType?: string): Promise<Document[]> {
  if (toolType && toolType !== 'all') {
    const { rows } = await sql`
      SELECT * FROM documents
      WHERE user_id = ${userId} AND deleted_at IS NULL AND tool_type = ${toolType}
      ORDER BY updated_at DESC
    `;
    return rows as Document[];
  }
  const { rows } = await sql`
    SELECT * FROM documents
    WHERE user_id = ${userId} AND deleted_at IS NULL
    ORDER BY updated_at DESC
  `;
  return rows as Document[];
}

export async function createDocument(
  userId: string,
  title: string,
  toolType: 'mrd' | 'one-pager' | 'brief',
  contentJson?: Record<string, unknown>
): Promise<Document> {
  const { rows } = await sql`
    INSERT INTO documents (id, user_id, title, tool_type, status, content_json, created_at, updated_at)
    VALUES (gen_random_uuid(), ${userId}, ${title}, ${toolType}, 'draft', ${JSON.stringify(contentJson || {})}, NOW(), NOW())
    RETURNING *
  `;
  return rows[0] as Document;
}

export async function updateDocument(
  id: string,
  userId: string,
  updates: Partial<Pick<Document, 'title' | 'status' | 'content_json' | 'drive_file_id' | 'drive_folder'>>
): Promise<Document> {
  const setClauses: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.title !== undefined) { setClauses.push(`title = $${paramIndex++}`); values.push(updates.title); }
  if (updates.status !== undefined) { setClauses.push(`status = $${paramIndex++}`); values.push(updates.status); }
  if (updates.content_json !== undefined) { setClauses.push(`content_json = $${paramIndex++}`); values.push(JSON.stringify(updates.content_json)); }
  if (updates.drive_file_id !== undefined) { setClauses.push(`drive_file_id = $${paramIndex++}`); values.push(updates.drive_file_id); }
  if (updates.drive_folder !== undefined) { setClauses.push(`drive_folder = $${paramIndex++}`); values.push(updates.drive_folder); }

  const { rows } = await sql.query(
    `UPDATE documents SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex} RETURNING *`,
    [...values, id, userId]
  );
  return rows[0] as Document;
}

export async function softDeleteDocument(id: string, userId: string): Promise<void> {
  await sql`
    UPDATE documents SET deleted_at = NOW(), updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
  `;
}
```

**Step 2: Create schema reference file**

Create `lib/db-schema.sql`:

```sql
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
```

**Step 3: Commit**

```bash
git add lib/db.ts lib/db-schema.sql
git commit -m "feat: add Vercel Postgres document model with CRUD helpers"
```

---

### Task 7: Documents API endpoints

**Files:**
- Create: `app/api/documents/route.ts`
- Create: `app/api/documents/[id]/route.ts`

**Step 1: Create list/create endpoint**

Create `app/api/documents/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listDocuments, createDocument } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const toolType = req.nextUrl.searchParams.get('toolType') || 'all';
  const docs = await listDocuments(session.user.email, toolType);
  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const doc = await createDocument(session.user.email, body.title, body.toolType, body.contentJson);
  return NextResponse.json(doc);
}
```

**Step 2: Create delete endpoint**

Create `app/api/documents/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { softDeleteDocument } from '@/lib/db';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await softDeleteDocument(params.id, session.user.email);
  return NextResponse.json({ ok: true });
}
```

**Step 3: Commit**

```bash
git add app/api/documents/
git commit -m "feat: add documents API endpoints (list, create, delete)"
```

---

### Task 8: Drive sync stub endpoint

**Files:**
- Create: `app/api/drive/sync/route.ts`

**Step 1: Create Drive sync stub**

Create `app/api/drive/sync/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { documentId } = body;

  // TODO: Implement Drive sync when folder structure is defined
  // Will use: googleapis with session.accessToken
  // Will create MRD Producer/ folder on first sync
  // Will upload exported file and store drive_file_id in DB

  return NextResponse.json({
    ok: true,
    message: 'Drive sync not yet configured — folder structure TBD',
    documentId,
  });
}
```

**Step 2: Commit**

```bash
git add app/api/drive/
git commit -m "feat: add Drive sync stub endpoint (folder structure TBD)"
```

---

### Task 9: Move MRD form to /mrd

**Files:**
- Move: `app/page.tsx` → `app/mrd/page.tsx`
- Create: `app/mrd/page.module.css` (if needed)

**Step 1: Copy current page.tsx to mrd/**

```bash
mkdir -p app/mrd
cp app/page.tsx app/mrd/page.tsx
```

No changes needed to the code — it works standalone at any route.

**Step 2: Commit**

```bash
git add app/mrd/page.tsx
git commit -m "feat: move MRD generator form to /mrd route"
```

---

### Task 10: Dashboard page

**Files:**
- Create: `app/page.tsx` (replaces old one)
- Create: `app/page.module.css`
- Create: `app/components/ToolCard.tsx`
- Create: `app/components/ToolCard.module.css`
- Create: `app/components/DocumentsTable.tsx`
- Create: `app/components/DocumentsTable.module.css`
- Create: `app/components/TopBar.tsx`
- Create: `app/components/TopBar.module.css`

**Step 1: Create TopBar component**

Create `app/components/TopBar.tsx`:

```typescript
import { auth, signOut } from '@/lib/auth';
import styles from './TopBar.module.css';

export default async function TopBar() {
  const session = await auth();

  return (
    <header className={styles.topBar}>
      <div className={styles.logo}>
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>MRD Producer</h2>
      </div>
      <div className={styles.user}>
        {session?.user?.image && (
          <img src={session.user.image} alt="" className={styles.avatar} />
        )}
        <span className={styles.name}>{session?.user?.name}</span>
        <form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }); }}>
          <button type="submit" className="btn-ghost" style={{ fontSize: '0.8125rem' }}>
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
```

Create `app/components/TopBar.module.css`:

```css
.topBar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--surface-variant);
}

.user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
}

.name {
  font-size: 0.875rem;
  color: var(--on-surface-variant);
}
```

**Step 2: Create ToolCard component**

Create `app/components/ToolCard.tsx`:

```typescript
import Link from 'next/link';
import styles from './ToolCard.module.css';

interface ToolCardProps {
  name: string;
  description: string;
  href: string;
  lastUsed?: string;
}

export default function ToolCard({ name, description, href, lastUsed }: ToolCardProps) {
  return (
    <Link href={href} className={styles.card}>
      <h3 className={styles.name}>{name}</h3>
      <p className={styles.description}>{description}</p>
      {lastUsed && <span className={styles.lastUsed}>Last used: {lastUsed}</span>}
    </Link>
  );
}
```

Create `app/components/ToolCard.module.css`:

```css
.card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.5rem;
  background: var(--surface);
  border: 1px solid var(--surface-variant);
  border-radius: var(--radius-xl);
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.2s, transform 0.2s;
  box-shadow: var(--elevation-1);
}

.card:hover {
  box-shadow: var(--elevation-2);
  transform: translateY(-2px);
}

.name {
  font-family: var(--font-barlow-condensed);
  font-size: 1.5rem;
  font-weight: 500;
  margin: 0;
  color: var(--md-sys-color-primary);
}

.description {
  font-size: 0.95rem;
  color: var(--on-surface-variant);
  margin: 0;
}

.lastUsed {
  font-size: 0.75rem;
  color: var(--outline);
  font-style: italic;
}
```

**Step 3: Create DocumentsTable component**

Create `app/components/DocumentsTable.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import styles from './DocumentsTable.module.css';

interface Doc {
  id: string;
  title: string;
  tool_type: string;
  status: string;
  updated_at: string;
}

const FILTERS = ['all', 'mrd', 'one-pager', 'brief', 'draft'] as const;
const FILTER_LABELS: Record<string, string> = {
  all: 'All', mrd: 'MRD', 'one-pager': 'One-Pager', brief: 'Brief Helper', draft: 'Drafts',
};
const TOOL_ROUTES: Record<string, string> = {
  mrd: '/mrd', 'one-pager': '/one-pager', brief: '/brief',
};

export default function DocumentsTable() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = filter === 'draft' ? '' : `?toolType=${filter}`;
    fetch(`/api/documents${params}`)
      .then(r => r.json())
      .then(data => {
        const filtered = filter === 'draft' ? data.filter((d: Doc) => d.status === 'draft') : data;
        setDocs(filtered);
      })
      .finally(() => setLoading(false));
  }, [filter]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    setDocs(prev => prev.filter(d => d.id !== id));
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>My Documents</h2>
      <div className={styles.filters}>
        {FILTERS.map(f => (
          <button
            key={f}
            className={`${styles.chip} ${filter === f ? styles.chipActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>
      {loading ? (
        <p style={{ color: 'var(--outline)' }}>Loading...</p>
      ) : docs.length === 0 ? (
        <p className={styles.empty}>No documents yet — pick a tool above to get started</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Status</th>
              <th>Last Modified</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map(doc => (
              <tr key={doc.id}>
                <td>
                  <a href={TOOL_ROUTES[doc.tool_type] || '#'}>{doc.title}</a>
                </td>
                <td>{FILTER_LABELS[doc.tool_type] || doc.tool_type}</td>
                <td><span className={`${styles.badge} ${styles[doc.status]}`}>{doc.status}</span></td>
                <td>{new Date(doc.updated_at).toLocaleDateString()}</td>
                <td>
                  <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0 0.75rem', height: '1.75rem' }} onClick={() => handleDelete(doc.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
```

Create `app/components/DocumentsTable.module.css`:

```css
.section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.heading {
  font-family: var(--font-barlow-condensed);
  font-size: 1.75rem;
  font-weight: 500;
  margin: 0;
}

.filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.chip {
  height: 2rem;
  padding: 0 1rem;
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 500;
  border: 1px solid var(--outline);
  background: transparent;
  color: var(--on-surface);
  cursor: pointer;
  transition: all 0.15s;
}

.chipActive {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  border-color: var(--md-sys-color-primary);
}

.empty {
  color: var(--outline);
  font-style: italic;
  padding: 2rem 0;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--outline);
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--surface-variant);
}

.table td {
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  border-bottom: 1px solid var(--surface-variant);
}

.table a {
  color: var(--md-sys-color-primary);
  text-decoration: none;
  font-weight: 500;
}

.badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.draft {
  background: var(--surface-variant);
  color: var(--on-surface-variant);
}

.complete {
  background: #dcfce7;
  color: #166534;
}
```

**Step 4: Create new dashboard page.tsx**

Replace `app/page.tsx`:

```typescript
import TopBar from './components/TopBar';
import ToolCard from './components/ToolCard';
import DocumentsTable from './components/DocumentsTable';

const TOOLS = [
  { name: 'MRD Producer', description: 'Generate full 12-section Market Requirements Documents with AI research', href: '/mrd' },
  { name: 'One-Pager', description: 'Guided 7-section product spec with split-screen preview', href: '/one-pager' },
  { name: 'Brief Helper', description: 'AI-assisted product brief with gap detection', href: '/brief' },
];

export default function DashboardPage() {
  return (
    <>
      <TopBar />
      <main className="page">
        <div className="container page-shell">
          <header className="page-hero">
            <p className="eyebrow">Product Tools</p>
            <h1>Dashboard</h1>
          </header>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {TOOLS.map(tool => (
              <ToolCard key={tool.href} {...tool} />
            ))}
          </div>

          <DocumentsTable />
        </div>
      </main>
    </>
  );
}
```

**Step 5: Commit**

```bash
git add app/page.tsx app/components/ app/page.module.css
git commit -m "feat: add dashboard with TopBar, ToolCard grid, DocumentsTable"
```

---

### Task 11: Verify and test

**Step 1: Ensure build passes**

```bash
npm run build
```

Fix any TypeScript or import errors.

**Step 2: Test auth flow locally**

- Set up Google Cloud OAuth credentials (redirect URI: `http://localhost:3000/api/auth/callback/google`)
- Add creds to `.env.local`
- Run `npm run dev`
- Verify: unauthenticated → redirected to `/login`
- Verify: sign in → lands on dashboard
- Verify: `/mrd` shows old MRD form
- Verify: `/one-pager` still works

**Step 3: Test documents API**

```bash
# Via browser console once logged in:
fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Test MRD', toolType: 'mrd' }) }).then(r => r.json()).then(console.log)
fetch('/api/documents').then(r => r.json()).then(console.log)
```

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: unified dashboard with auth, documents, and tool routing"
```

---

### Task Summary

| # | Task | Commit message |
|---|------|---------------|
| 1 | Create feature branch | — |
| 2 | Install deps | `chore: add next-auth, vercel-postgres, googleapis deps` |
| 3 | NextAuth config | `feat: add NextAuth.js v5 config with Google OAuth + Drive scope` |
| 4 | Auth middleware | `feat: add auth middleware protecting all routes except /login` |
| 5 | Login page | `feat: add branded login page with Google OAuth sign-in` |
| 6 | DB schema + helpers | `feat: add Vercel Postgres document model with CRUD helpers` |
| 7 | Documents API | `feat: add documents API endpoints (list, create, delete)` |
| 8 | Drive sync stub | `feat: add Drive sync stub endpoint (folder structure TBD)` |
| 9 | Move MRD to /mrd | `feat: move MRD generator form to /mrd route` |
| 10 | Dashboard page | `feat: add dashboard with TopBar, ToolCard grid, DocumentsTable` |
| 11 | Verify and test | `feat: unified dashboard with auth, documents, and tool routing` |
