export default function BrandSectionCard({ index, title, subtitle, children, delay = 0 }) {
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
