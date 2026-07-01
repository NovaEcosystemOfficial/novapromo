import { usePwaUpdate } from '../../hooks/usePwaUpdate.js';

export default function PwaUpdatePrompt() {
  const { needRefresh, offlineReady, refreshApp, dismissOfflineNotice } = usePwaUpdate();

  if (!needRefresh && !offlineReady) {
    return null;
  }

  if (needRefresh) {
    return (
      <div className="pwa-update" role="alertdialog" aria-labelledby="pwa-update-title">
        <div className="pwa-update__card">
          <h3 id="pwa-update-title">Aggiornamento disponibile</h3>
          <p>È disponibile una nuova versione di NovaPromo. Aggiorna per continuare con le ultime funzioni.</p>
          <div className="pwa-update__actions">
            <button type="button" className="pwa-update__btn pwa-update__btn--primary" onClick={refreshApp}>
              Aggiorna ora
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pwa-toast" role="status">
      <span>NovaPromo è pronta per l&apos;uso offline.</span>
      <button type="button" className="pwa-toast__close" onClick={dismissOfflineNotice} aria-label="Chiudi">
        ×
      </button>
    </div>
  );
}
