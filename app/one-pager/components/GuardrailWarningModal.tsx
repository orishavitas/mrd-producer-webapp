'use client';

import styles from './GuardrailWarningModal.module.css';

interface GuardrailWarningModalProps {
  violationTypes: string[];
  isBanned: boolean;
  onAcknowledge?: () => void;
}

export default function GuardrailWarningModal({
  violationTypes,
  isBanned,
  onAcknowledge,
}: GuardrailWarningModalProps) {
  if (isBanned) {
    return (
      <div className={styles.overlay} role="alert" aria-live="assertive">
        <div className={styles.card}>
          <p className={styles.bannedText}>
            Your account has been suspended. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  const typeList = violationTypes.join(', ');

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="gwm-title">
      <div className={styles.card}>
        <h2 className={styles.heading} id="gwm-title">Content Policy Violation</h2>
        <p className={styles.body}>
          Your input was flagged for <strong>{typeList}</strong>. This platform only accepts product
          specification content.{' '}
          <strong>This acknowledgement is binding.</strong> Further attempts to bypass content
          policies will result in account suspension and will be reported to administrators.
        </p>
        <div className={styles.actions}>
          <button className={styles.ackBtn} onClick={onAcknowledge}>
            I understand
          </button>
        </div>
      </div>
    </div>
  );
}
