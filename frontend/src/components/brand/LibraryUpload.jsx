import { useRef, useState } from 'react';
import { api } from '../../api/client.js';

export default function LibraryUpload({ category, label, items = [], onUploaded }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const result = await api.uploadBrandLibraryAsset(category, file);
      onUploaded(result.profile);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="bi-library-block">
      <div className="bi-library-head">
        <h4>{label}</h4>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Caricamento…' : 'Upload'}
        </button>
        <input ref={inputRef} type="file" hidden onChange={handleFile} />
      </div>
      {error && <p className="bi-field-error">{error}</p>}
      <div className="bi-library-grid">
        {items.length === 0 && <p className="bi-empty-hint">Nessun file caricato</p>}
        {items.map((item) => (
          <a
            key={item.id || item.url}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="bi-library-item"
          >
            {item.mimeType?.startsWith('image/') ? (
              <img src={item.url} alt={item.name} />
            ) : (
              <span className="bi-library-file">{item.name}</span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
