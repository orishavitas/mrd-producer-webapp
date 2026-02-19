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
        <label className={styles.label}>4. Who (Target Audience)</label>
        <p className={styles.hint}>Select industries in the "Where" section above to see relevant roles.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <label className={styles.label}>4. Who (Target Audience)</label>

      {availableRoles.length > 0 && (
        <div className={styles.roleGrid}>
          {availableRoles.map((role) => (
            <label key={role} className={styles.roleLabel}>
              <input
                type="checkbox"
                checked={selectedRoles.includes(role)}
                onChange={() => onToggleRole(role)}
                className={styles.checkbox}
              />
              <span>{role}</span>
            </label>
          ))}
        </div>
      )}

      {customRoles.length > 0 && (
        <div className={styles.customRoles}>
          <span className={styles.customLabel}>Custom roles:</span>
          <div className={styles.chipContainer}>
            {customRoles.map((role) => (
              <span key={role} className={styles.chip}>
                {role}
                <button
                  className={styles.chipRemove}
                  onClick={() => onRemoveCustom(role)}
                  aria-label={`Remove ${role}`}
                >
                  x
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
          className={styles.addButton}
          onClick={handleAddCustom}
          disabled={!customInput.trim()}
        >
          Add
        </button>
      </div>
    </div>
  );
}
