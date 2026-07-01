/** PWA install / standalone detection helpers. */

export function isStandaloneDisplayMode() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.matchMedia('(display-mode: minimal-ui)').matches
    || window.navigator.standalone === true
  );
}

export function isPwaInstalled() {
  if (typeof window === 'undefined') return false;
  if (isStandaloneDisplayMode()) return true;
  if (localStorage.getItem('novapromo_pwa_installed') === '1') return true;
  return false;
}

export function markPwaInstalled() {
  try {
    localStorage.setItem('novapromo_pwa_installed', '1');
  } catch {
    // ignore quota / private mode
  }
}

export function isPwaSupportedPlatform() {
  if (typeof window === 'undefined') return false;
  const isElectron = Boolean(window.electronAPI?.isDesktop);
  if (isElectron) return false;
  return true;
}
