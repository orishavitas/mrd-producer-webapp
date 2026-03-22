'use client';

import styles from './PublishGateModal.module.css';

interface PublishGateModalProps {
  onPublish: () => void;
  onCancel: () => void;
  pending: 'docx' | 'html' | 'pdf' | null;
}

export default function PublishGateModal({ onPublish, onCancel }: PublishGateModalProps) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="pgm-title">
      <div className={styles.card}>
        <h2 className={styles.heading} id="pgm-title">Document not published</h2>
        <p className={styles.body}>
          You need to publish this document before downloading or printing it.
        </p>
        <div className={styles.actions}>
          <button className={styles.publishBtn} onClick={onPublish}>
            Publish Now
          </button>
          <button className={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
