'use client';
import { useEffect, useState } from 'react';
import type { OnePagerState } from '../lib/one-pager-state';
import styles from './VersionHistoryPanel.module.css';

interface Snapshot {
  version: string;
  saved_at: string;
  content_json: Record<string, unknown>;
}

interface Props {
  documentId: string;
  currentVersion: string;
  onRollback: (snapshot: OnePagerState) => void;
}

export default function VersionHistoryPanel({ documentId, currentVersion, onRollback }: Props) {
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/documents/${documentId}/versions`)
      .then((r) => r.json())
      .then((data) => {
        setHistory((data.history ?? []).slice().reverse()); // newest first
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load version history');
        setLoading(false);
      });
  }, [documentId]);

  async function handleRollback(snapshot: Snapshot) {
    if (!window.confirm(`Roll back to version ${snapshot.version}? Current unsaved changes will be lost.`)) return;
    setRolling(snapshot.version);
    try {
      const res = await fetch(`/api/documents/${documentId}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: snapshot.version }),
      });
      if (!res.ok) throw new Error('Rollback failed');
      onRollback(snapshot.content_json as unknown as OnePagerState);
    } catch (e) {
      alert('Rollback failed. Please try again.');
    } finally {
      setRolling(null);
    }
  }

  if (loading) return <p className={styles.hint}>Loading history…</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (history.length === 0) return <p className={styles.hint}>No previous versions saved yet. Save a draft to create a checkpoint.</p>;

  return (
    <div className={styles.root}>
      <p className={styles.currentVer}>Current: <strong>v{currentVersion}</strong></p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Version</th>
            <th>Saved</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {history.map((snap) => (
            <tr key={`${snap.version}-${snap.saved_at}`}>
              <td className={styles.verCell}>v{snap.version}</td>
              <td className={styles.dateCell}>{new Date(snap.saved_at).toLocaleString()}</td>
              <td>
                <button
                  className={styles.rollbackBtn}
                  onClick={() => handleRollback(snap)}
                  disabled={rolling !== null}
                >
                  {rolling === snap.version ? 'Restoring…' : 'Restore'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
