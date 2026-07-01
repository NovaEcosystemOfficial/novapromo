import { usePwaInstall } from '../../hooks/usePwaInstall.js';

export default function PwaInstallBanner() {
  const { canInstall, installed, install, dismiss, isIosSafari } = usePwaInstall();

  if (installed || (!canInstall && !isIosSafari)) {
    return null;
  }

  if (isIosSafari) {
    return (
      <div className="pwa-banner pwa-banner--ios" role="region" aria-label="Installa NovaPromo">
        <div className="pwa-banner__content">
          <strong>Installa NovaPromo</strong>
          <p>
            Tocca <span className="pwa-banner__ios-share" aria-hidden>⎋</span> Condividi,
            poi <strong>Aggiungi a Home</strong>.
          </p>
        </div>
        <button type="button" className="pwa-banner__close" onClick={dismiss} aria-label="Chiudi">
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="pwa-banner" role="region" aria-label="Installa NovaPromo">
      <div className="pwa-banner__content">
        <strong>Installa NovaPromo</strong>
        <p>Aggiungi l&apos;app alla Home e usala senza barra del browser.</p>
      </div>
      <div className="pwa-banner__actions">
        <button type="button" className="pwa-banner__btn pwa-banner__btn--primary" onClick={install}>
          Installa
        </button>
        <button type="button" className="pwa-banner__btn" onClick={dismiss}>
          Non ora
        </button>
      </div>
    </div>
  );
}
