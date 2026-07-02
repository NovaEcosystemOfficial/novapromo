export default function ChipSelect({ options, value = [], onChange, multiple = true }) {
  const toggle = (id) => {
    if (multiple) {
      onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
      return;
    }
    onChange(value.includes(id) ? [] : [id]);
  };

  return (
    <div className="bi-chip-grid">
      {options.map((opt) => (
        <button
          key={opt.id || opt}
          type="button"
          className={`bi-chip${value.includes(opt.id || opt) ? ' selected' : ''}`}
          onClick={() => toggle(opt.id || opt)}
        >
          {opt.label || opt}
        </button>
      ))}
    </div>
  );
}
