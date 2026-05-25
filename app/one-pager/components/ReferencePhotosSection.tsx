'use client';

import { useState } from 'react';
import { PhotoPicker } from './PhotoPicker';
import type { ReferencePhotoEntry } from '../lib/one-pager-state';
import styles from './ReferencePhotosSection.module.css';

interface ReferencePhotosSectionProps {
  photos: ReferencePhotoEntry[];
  onAdd: (photo: ReferencePhotoEntry) => void;
  onRemove: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateUrl: (id: string, url: string) => void;
}

export default function ReferencePhotosSection({
  photos,
  onAdd,
  onRemove,
  onUpdateNotes,
  onUpdateUrl,
}: ReferencePhotosSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  function handleSelect(url: string) {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    onAdd({ id, url, notes: '' });
    setPickerOpen(false);
  }

  return (
    <div className={styles.root}>
      {/* Existing photo cards */}
      {photos.length > 0 && (
        <div className={styles.photoList}>
          {photos.map((photo) => (
            <div key={photo.id} className={styles.photoCard}>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => onRemove(photo.id)}
                title="Remove photo"
                aria-label="Remove photo"
              >
                ×
              </button>
              <div className={styles.photoCardInner}>
                {/* Thumbnail */}
                <div className={styles.thumbWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt="Reference"
                    className={styles.thumb}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                {/* Notes */}
                <div className={styles.notesWrap}>
                  <label className={styles.notesLabel}>Notes / Description</label>
                  <textarea
                    value={photo.notes}
                    onChange={(e) => onUpdateNotes(photo.id, e.target.value)}
                    placeholder="Add context, reference notes, or design directions…"
                    className={styles.notesTextarea}
                    rows={3}
                  />
                  {/* Allow URL replacement */}
                  <label className={styles.notesLabel} style={{ marginTop: 8 }}>Image URL</label>
                  <input
                    type="url"
                    value={photo.url.startsWith('data:') ? '' : photo.url}
                    onChange={(e) => { if (e.target.value) onUpdateUrl(photo.id, e.target.value); }}
                    placeholder={photo.url.startsWith('data:') ? '(uploaded file)' : photo.url}
                    className={styles.urlInput}
                    disabled={photo.url.startsWith('data:')}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add photo button / inline picker */}
      {pickerOpen ? (
        <div className={styles.pickerWrap}>
          <div className={styles.pickerHeader}>
            <span className={styles.pickerTitle}>Add Reference Photo</span>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setPickerOpen(false)}
            >
              Cancel
            </button>
          </div>
          <PhotoPicker
            candidates={[]}
            selected={[]}
            onSelect={handleSelect}
          />
        </div>
      ) : (
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => setPickerOpen(true)}
        >
          + Add Photo
        </button>
      )}
    </div>
  );
}
