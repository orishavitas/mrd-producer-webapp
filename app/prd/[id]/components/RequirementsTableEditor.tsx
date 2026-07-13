'use client';

import { RequirementRow, SectionPriority } from '@/agent/agents/prd/prd-document-types';

interface Props {
  rows: RequirementRow[];
  onChange: (rows: RequirementRow[]) => void;
}

export default function RequirementsTableEditor({ rows, onChange }: Props) {
  function updateRow(index: number, patch: Partial<RequirementRow>) {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange(next);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  function moveRow(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function addRow() {
    const nextNum = rows.length + 1;
    onChange([...rows, { id: `FR-${nextNum}`, category: '', requirement: '', priority: 'Must' as SectionPriority }]);
  }

  return (
    <table>
      <thead>
        <tr>
          <th>ID</th><th>Category</th><th>Requirement</th><th>Priority</th><th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            <td><input value={row.id} onChange={(e) => updateRow(i, { id: e.target.value })} /></td>
            <td><input value={row.category} onChange={(e) => updateRow(i, { category: e.target.value })} /></td>
            <td><input value={row.requirement} onChange={(e) => updateRow(i, { requirement: e.target.value })} /></td>
            <td>
              <select value={row.priority} onChange={(e) => updateRow(i, { priority: e.target.value as SectionPriority })}>
                <option value="Must">Must</option>
                <option value="Nice to have">Nice to have</option>
              </select>
            </td>
            <td>
              <button type="button" onClick={() => moveRow(i, -1)} aria-label="Move up">↑</button>
              <button type="button" onClick={() => moveRow(i, 1)} aria-label="Move down">↓</button>
              <button type="button" onClick={() => removeRow(i)} aria-label="Remove row">✕</button>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr><td colSpan={5}><button type="button" onClick={addRow}>+ Add requirement</button></td></tr>
      </tfoot>
    </table>
  );
}
