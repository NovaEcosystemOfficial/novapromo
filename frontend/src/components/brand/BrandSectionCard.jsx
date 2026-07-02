import { useState } from 'react';

export default function BrandSectionCard({
  index,
  title,
  subtitle,
  children,
  delay = 0,
  accordion = false,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen || index === 1);

  if (accordion) {
    return (
      <section
        className={`bi-section-card bi-section-card--accordion mobile-card${open ? ' is-open' : ''}`}
        style={{ '--bi-delay': `${delay}ms` }}
      >
        <button
          type="button"
          className="bi-section-head bi-section-head--toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="bi-section-index">{String(index).padStart(2, '0')}</span>
          <div className="bi-section-head__text">
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <span className="bi-section-chevron" aria-hidden>{open ? '−' : '+'}</span>
        </button>
        {open && <div className="bi-section-body">{children}</div>}
      </section>
    );
  }

  return (
    <section
      className="bi-section-card"
      style={{ '--bi-delay': `${delay}ms` }}
    >
      <div className="bi-section-head">
        <span className="bi-section-index">{String(index).padStart(2, '0')}</span>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <div className="bi-section-body">{children}</div>
    </section>
  );
}
