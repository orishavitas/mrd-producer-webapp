'use client';

import { useState, useEffect, useMemo } from 'react';
import styles from './DynamicRoleSelector.module.css';

interface RoleConfig {
  rolesByIndustry: Record<string, string[]>;
}

interface DynamicRoleSelectorProps {
  selectedIndustries: string[];
  selectedRoles: string[];
  customRoles: string[];
  onToggleRole: (role: string) => void;
  onAddCustom: (role: string) => void;
  onRemoveCustom: (role: string) => void;
}

export default function DynamicRoleSelector({
  selectedIndustries,
  selectedRoles,
  customRoles,
  onToggleRole,
  onAddCustom,
  onRemoveCustom,
}: DynamicRoleSelectorProps) {
  const [config, setConfig] = useState<RoleConfig | null>(null);
  const [customInput, setCustomInput] = useState('');

  useEffect(() => {
    fetch('/api/one-pager/config')
      .then((r) => r.json())
      .then((data) => setConfig(data))
      .catch(console.error);
  }, []);

  const availableRoles = useMemo(() => {
    if (!config) return [];
    const roleSet = new Set<string>();
    for (const industryId of selectedIndustries) {
      const roles = config.rolesByIndustry[industryId];
      if (roles) roles.forEach((r) => roleSet.add(r));
    }
    return Array.from(roleSet).sort();
  }, [config, selectedIndustries]);

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !customRoles.includes(trimmed)) {
      onAddCustom(trimmed);
      setCustomInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustom();
    }
  };

  if (selectedIndustries.length === 0) {
    return (
      <div className={styles.container}>
        <span className={styles.label}>4. Who (Target Audience)</span>
        <p className={styles.hint}>Select industries above to see relevant roles.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <span className={styles.label}>4. Who (Target Audience)</span>

      {availableRoles.length > 0 && (
        <div className={styles.roleGrid}>
          {availableRoles.map((role) => (
            <button
              key={role}
              type="button"
              className={selectedRoles.includes(role) ? styles.chipSelected : styles.chip}
              onClick={() => onToggleRole(role)}
              aria-pressed={selectedRoles.includes(role)}
            >
              {selectedRoles.includes(role) && <span className={styles.checkMark}>✓</span>}
              {role}
            </button>
          ))}
        </div>
      )}

      {customRoles.length > 0 && (
        <div className={styles.customRoles}>
          <span className={styles.customLabel}>Custom roles</span>
          <div className={styles.chipContainer}>
            {customRoles.map((role) => (
              <span key={role} className={styles.inputChip}>
                {role}
                <button
                  className={styles.chipRemove}
                  onClick={() => onRemoveCustom(role)}
                  aria-label={`Remove ${role}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.addCustom}>
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add custom role..."
          className={styles.customInput}
        />
        <button
          type="button"
          className={styles.addButton}
          onClick={handleAddCustom}
          disabled={!customInput.trim()}
        >
          + Add
        </button>
      </div>
    </div>
  );
}
