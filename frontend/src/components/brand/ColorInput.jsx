import { useRef, useState } from 'react';

export default function ColorInput({ label, colors = [], onChange }) {
  const [draft, setDraft] = useState('#6c5ce7');
  const inputRef = useRef(null);

  const add = () => {
    if (colors.includes(draft)) return;
    onChange([...colors, draft]);
  };

  return (
    <div className="bi-field">
      {label && <label>{label}</label>}
      <div className="bi-color-row">
        <input
          ref={inputRef}
          type="color"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="bi-color-picker"
        />
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="bi-color-text"
        />
        <button type="button" className="btn btn-secondary" onClick={add}>
          Aggiungi
        </button>
      </div>
      <div className="bi-color-swatches">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            className="bi-swatch"
            style={{ background: color }}
            title={color}
            onClick={() => onChange(colors.filter((c) => c !== color))}
          />
        ))}
      </div>
    </div>
  );
}
