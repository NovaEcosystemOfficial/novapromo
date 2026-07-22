/** Detect NovaPromo runtime (web vs Electron desktop). */

export function isDesktopApp() {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.isDesktop);
}

/**
 * Electron shell che carica l'app cloud (https://…), stessa origine del web.
 * Auth, API e OAuth sono identici a Vercel.
 */
export function isCloudDesktopShell() {
  if (!isDesktopApp() || typeof window === 'undefined') return false;
  return /^https?:/i.test(window.location.protocol);
}

/**
 * Build desktop locale legacy (VITE_RUNTIME=desktop + file:// / API dedicata).
 * Il thin client cloud non usa questo percorso.
 */
export function isLocalDesktopBuild() {
  return import.meta.env.VITE_RUNTIME === 'desktop';
}

export function isDesktopProduction() {
  return isDesktopApp() && import.meta.env.PROD;
}

/**
 * HashRouter solo per UI desktop locale packaged (file://).
 * Thin client cloud e web usano BrowserRouter.
 */
export function shouldUseHashRouter() {
  return isLocalDesktopBuild() && import.meta.env.PROD;
}

export function getApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  // Solo build desktop locale esplicita — non usare isDesktopApp() a runtime,
  // altrimenti il web caricato in Electron punterebbe a localhost.
  if (isLocalDesktopBuild()) {
    return (import.meta.env.VITE_DESKTOP_API_URL || '').replace(/\/$/, '');
  }
  return '';
}
