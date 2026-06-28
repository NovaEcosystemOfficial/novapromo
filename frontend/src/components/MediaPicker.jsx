import { useCallback, useRef, useState } from 'react';
import { isDesktopApp } from '../lib/runtime.js';
import { pickMediaFiles } from '../lib/electron.js';
import '../styles/media-picker.css';

const ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime';

/**
 * Media input with drag-and-drop + native desktop file picker.
 * @returns {{ file: File|null, localPath: string|null, preview: string|null, ... }}
 */
export default function MediaPicker({ value, onChange, label = 'Media (immagine/video)' }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const setMedia = useCallback(
    (next) => {
      onChange(next);
    },
    [onChange]
  );

  const handleFiles = useCallback(
    (files) => {
      const file = files?.[0];
      if (!file) return;
      setMedia({ file, localPath: file.path || null, name: file.name });
    },
    [setMedia]
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const browseDesktop = async () => {
    const picked = await pickMediaFiles();
    if (!picked?.length) return;
    const item = picked[0];
    setMedia({ file: null, localPath: item.path, name: item.name });
  };

  const clear = () => setMedia(null);

  const displayName = value?.name || value?.file?.name;

  return (
    <div className="media-picker">
      <label>{label}</label>
      <div
        className={`media-picker-drop${dragOver ? ' drag-over' : ''}${displayName ? ' has-file' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        {displayName ? (
          <div className="media-picker-file">
            <span className="media-picker-icon">{value?.localPath ? '🎬' : '📎'}</span>
            <span className="media-picker-name">{displayName}</span>
            <button type="button" className="media-picker-clear" onClick={(e) => { e.stopPropagation(); clear(); }}>
              ×
            </button>
          </div>
        ) : (
          <>
            <span className="media-picker-hint">Trascina un video o un&apos;immagine qui</span>
            <span className="media-picker-sub">oppure clicca per sfogliare</span>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      {isDesktopApp() && (
        <button type="button" className="btn btn-secondary btn-sm media-picker-browse" onClick={browseDesktop}>
          Sfoglia PC…
        </button>
      )}
    </div>
  );
}

export function appendMediaToFormData(fd, media) {
  if (!media) return fd;
  if (media.file) {
    fd.append('media', media.file);
  } else if (media.localPath) {
    fd.append('localMediaPath', media.localPath);
  }
  return fd;
}
