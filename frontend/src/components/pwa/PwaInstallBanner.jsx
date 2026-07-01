import { usePwaInstall } from '../../hooks/usePwaInstall.js';

export default function PwaInstallBanner() {
  const { canInstall, installed, install, dismiss, showIosHint } = usePwaInstall();

  if (installed) return null;

  if (showIosHint) {
    return (
      <div className="pwa-banner pwa-banner--ios pwa-banner--hint" role="region" aria-label="Installa NovaPromo su iPhone">
        <div className="pwa-banner__content">
          <strong>Installa NovaPromo</strong>
          <p>
            Per installare NovaPromo: <strong>Condividi</strong> → <strong>Aggiungi alla schermata Home</strong>
          </p>
        </div>
        <button type="button" className="pwa-banner__close" onClick={dismiss} aria-label="Chiudi">
          ×
        </button>
      </div>
    );
  }

  if (!canInstall) return null;

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
