import { useState } from 'react';

export default function TagInput({ label, value = [], onChange, placeholder, hint }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const next = draft.trim();
    if (!next || value.includes(next)) {
      setDraft('');
      return;
    }
    onChange([...value, next]);
    setDraft('');
  };

  const remove = (item) => onChange(value.filter((v) => v !== item));

  return (
    <div className="bi-field bi-field--tags">
      {label && <label>{label}</label>}
      {hint && <p className="bi-field-hint">{hint}</p>}
      <div className="bi-tag-list">
        {value.map((item) => (
          <button
            key={item}
            type="button"
            className="bi-tag"
            aria-label={`Rimuovi ${item}`}
            onClick={() => remove(item)}
          >
            {item} <span aria-hidden>×</span>
          </button>
        ))}
      </div>
      <div className="bi-tag-input-row">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn btn-secondary" onClick={add}>
          Aggiungi
        </button>
      </div>
    </div>
  );
}
