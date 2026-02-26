'use client';
import { useState, useRef } from 'react';
import styles from './PhotoPicker.module.css';

interface PhotoPickerProps {
  candidates: string[];
  selected: string | undefined;
  onSelect: (url: string) => void;
}

type Tab = 'candidates' | 'upload' | 'link';

export function PhotoPicker({ candidates, selected, onSelect }: PhotoPickerProps) {
  const [tab, setTab] = useState<Tab>(candidates.length > 0 ? 'candidates' : 'upload');
  const [linkInput, setLinkInput] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) onSelect(e.target.result as string);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className={styles.picker}>
      <div className={styles.tabs}>
        {candidates.length > 0 && (
          <button
            className={tab === 'candidates' ? styles.tabActive : styles.tab}
            onClick={() => setTab('candidates')}
          >
            From page ({candidates.length})
          </button>
        )}
        <button
          className={tab === 'upload' ? styles.tabActive : styles.tab}
          onClick={() => setTab('upload')}
        >
          Upload
        </button>
        <button
          className={tab === 'link' ? styles.tabActive : styles.tab}
          onClick={() => setTab('link')}
        >
          Link
        </button>
      </div>

      {tab === 'candidates' && (
        <div className={styles.thumbnailGrid}>
          {candidates.map((url) => (
            <button
              key={url}
              className={`${styles.thumbnail} ${selected === url ? styles.thumbnailSelected : ''}`}
              onClick={() => onSelect(url)}
              title={url}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Product" className={styles.thumbImg} />
              {selected === url && <span className={styles.checkBadge}>&#10003;</span>}
            </button>
          ))}
        </div>
      )}

      {tab === 'upload' && (
        <div
          className={`${styles.dropZone} ${dragging ? styles.dragging : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => fileRef.current?.click()}
        >
          <p>Drag &amp; drop or click to upload</p>
          <p className={styles.hint}>JPG, PNG, WEBP</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={styles.hiddenInput}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {selected?.startsWith('data:') && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected} alt="Uploaded" className={styles.uploadPreview} />
          )}
        </div>
      )}

      {tab === 'link' && (
        <div className={styles.linkTab}>
          <input
            type="url"
            placeholder="https://example.com/photo.jpg"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            className={styles.linkInput}
          />
          <button
            className={styles.linkConfirm}
            onClick={() => { if (linkInput) { onSelect(linkInput); setLinkInput(''); } }}
            disabled={!linkInput}
          >
            Use image
          </button>
          {selected && !selected.startsWith('data:') && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected} alt="Preview" className={styles.uploadPreview} />
          )}
        </div>
      )}
    </div>
  );
}
