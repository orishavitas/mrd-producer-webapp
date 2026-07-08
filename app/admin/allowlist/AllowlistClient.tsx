'use client';

import { useEffect, useState } from 'react';

const FEATURE_OPTIONS: { num: number; label: string }[] = [
  { num: 1, label: 'MRD Generator' },
  { num: 2, label: 'One-Pager' },
  { num: 3, label: 'Brief Helper' },
  { num: 4, label: 'One-Pager Beta' },
  { num: 5, label: 'PRD Producer' },
  { num: 6, label: 'One-Pager Alpha' },
  { num: 7, label: 'R&D Viewer' },
];

interface Entry {
  email: string;
  features: number[];
  invited_by: string | null;
  created_at: string;
}

export default function AllowlistClient() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newFeatures, setNewFeatures] = useState<number[]>([2]);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/allowlist');
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data = await res.json();
      setEntries(data.entries);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load allowlist');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addOrUpdate(email: string, features: number[]) {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/allowlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, features }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to save');
      await load();
      setNewEmail('');
      setNewFeatures([2]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function remove(email: string) {
    if (!confirm(`Remove access for ${email}?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/allowlist/${encodeURIComponent(email)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to remove');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove');
    } finally {
      setSaving(false);
    }
  }

  function toggleFeature(list: number[], num: number): number[] {
    return list.includes(num) ? list.filter((n) => n !== num) : [...list, num].sort();
  }

  return (
    <main style={{ maxWidth: '860px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Feature Allowlist</h1>
      <p style={{ color: 'var(--muted, #666)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
        Invite-only access. Add a Google account email and the tools they can use.
      </p>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fdecea', color: '#611a15', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <div style={{ border: '1px solid var(--border, #e0e0e0)', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>Invite a guest</h2>
        <input
          type="email"
          placeholder="name@example.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border, #ccc)', marginBottom: '0.75rem', fontSize: '0.9rem' }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {FEATURE_OPTIONS.map((f) => (
            <button
              key={f.num}
              type="button"
              aria-pressed={newFeatures.includes(f.num)}
              onClick={() => setNewFeatures((prev) => toggleFeature(prev, f.num))}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '999px',
                border: '1px solid var(--border, #ccc)',
                background: newFeatures.includes(f.num) ? 'var(--brand-green-dark, #009966)' : '#fff',
                color: newFeatures.includes(f.num) ? '#fff' : '#333',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!newEmail.trim() || saving}
          onClick={() => addOrUpdate(newEmail.trim(), newFeatures)}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            background: 'var(--brand-primary, #1D1F4A)',
            color: '#fff',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: !newEmail.trim() || saving ? 'not-allowed' : 'pointer',
            opacity: !newEmail.trim() || saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Grant access'}
        </button>
      </div>

      <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>Current access ({entries.length})</h2>
      {loading ? (
        <p style={{ color: 'var(--muted, #666)', fontSize: '0.9rem' }}>Loading…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {entries.map((entry) => (
            <div
              key={entry.email}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                border: '1px solid var(--border, #e0e0e0)',
                borderRadius: '10px',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{entry.email}</div>
                <div style={{ color: 'var(--muted, #666)', fontSize: '0.78rem' }}>
                  {entry.features
                    .map((n) => FEATURE_OPTIONS.find((f) => f.num === n)?.label ?? n)
                    .join(', ') || 'No features'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(entry.email)}
                disabled={saving}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #c0392b',
                  background: 'transparent',
                  color: '#c0392b',
                  fontSize: '0.8rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
