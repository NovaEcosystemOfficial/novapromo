export default function BrandProgressHeader({ completionPercent, companyName, saving }) {
  return (
    <header className="bi-hero">
      <div className="bi-hero-glow" aria-hidden />
      <div className="bi-hero-content">
        <div className="bi-hero-badge">Nova Brand Intelligence</div>
        <h1 className="bi-hero-title">
          {companyName?.trim() ? companyName : 'Profilo Brand'}
        </h1>
        <p className="bi-hero-sub">
          Configura il tuo brand una volta. L&apos;AI lo userà automaticamente in ogni contenuto.
        </p>
        <div className="bi-progress-wrap">
          <div className="bi-progress-meta">
            <span>Profilo Brand</span>
            <strong>{completionPercent}% completato</strong>
          </div>
          <div className="bi-progress-track">
            <div
              className="bi-progress-fill"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
        {saving && <p className="bi-saving-hint">Salvataggio in corso…</p>}
      </div>
    </header>
  );
}
