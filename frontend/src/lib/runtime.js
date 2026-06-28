/** Detect NovaPromo runtime (web vs Electron desktop). */

export function isDesktopApp() {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.isDesktop);
}

export function isDesktopProduction() {
  return isDesktopApp() && import.meta.env.PROD;
}

/**
 * HashRouter solo nel build packaged (file:// + index.html).
 * Dev Electron usa BrowserRouter + http://localhost:5173/dashboard
 */
export function shouldUseHashRouter() {
  return isDesktopProduction();
}

export function getApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  if (isDesktopApp() || import.meta.env.VITE_RUNTIME === 'desktop') {
    return (import.meta.env.VITE_DESKTOP_API_URL || 'http://localhost:3001').replace(/\/$/, '');
  }
  return '';
}
