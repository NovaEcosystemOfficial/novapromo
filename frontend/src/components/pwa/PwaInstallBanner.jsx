import { useState } from 'react';
import { usePwaInstall } from '../../hooks/usePwaInstall.js';

export default function PwaInstallBanner() {
  const { canInstall, installed, install, dismiss, showIosHint } = usePwaInstall();
  const [iosGuideOpen, setIosGuideOpen] = useState(false);

  if (installed) return null;

  if (showIosHint) {
    return (
      <>
        <div className="pwa-banner pwa-banner--ios pwa-banner--hint" role="region" aria-label="Installa NovaPromo su iPhone">
          <div className="pwa-banner__content">
            <strong>Installa NovaPromo</strong>
            <p>Aggiungila alla Home come un&apos;app, senza App Store.</p>
          </div>
          <div className="pwa-banner__actions">
            <button
              type="button"
              className="pwa-banner__btn pwa-banner__btn--primary"
              onClick={() => setIosGuideOpen(true)}
            >
              Come fare
            </button>
            <button type="button" className="pwa-banner__btn" onClick={dismiss}>
              Non ora
            </button>
          </div>
        </div>

        {iosGuideOpen && (
          <div
            className="pwa-update"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-ios-title"
            onClick={() => setIosGuideOpen(false)}
          >
            <div className="pwa-update__card pwa-ios-guide" onClick={(e) => e.stopPropagation()}>
              <h3 id="pwa-ios-title">Installa su iPhone / iPad</h3>
              <ol className="pwa-ios-guide__steps">
                <li>
                  Tocca <strong>Condividi</strong>
                  <span className="pwa-ios-guide__share" aria-hidden="true"> ⎋ </span>
                  in basso (o in alto su iPad)
                </li>
                <li>
                  Scorri e scegli <strong>Aggiungi alla schermata Home</strong>
                </li>
                <li>
                  Conferma con <strong>Aggiungi</strong>
                </li>
              </ol>
              <p className="pwa-ios-guide__note">
                Funziona da Safari. Dopo l&apos;installazione apri NovaPromo dall&apos;icona in Home.
              </p>
              <div className="pwa-update__actions">
                <button
                  type="button"
                  className="pwa-update__btn pwa-update__btn--primary"
                  onClick={() => {
                    setIosGuideOpen(false);
                    dismiss();
                  }}
                >
                  Ho capito
                </button>
              </div>
            </div>
          </div>
        )}
      </>
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
