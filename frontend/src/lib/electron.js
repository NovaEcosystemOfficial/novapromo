import { isCloudDesktopShell, isDesktopApp, isLocalDesktopBuild } from './runtime.js';

export const electron = isDesktopApp() ? window.electronAPI : null;

/**
 * OAuth: nel thin client cloud naviga in-app come il web.
 * Solo il desktop locale legacy apre browser/sistema esterno.
 */
export async function openOAuthUrl(url) {
  if (electron && isLocalDesktopBuild() && !isCloudDesktopShell()) {
    await electron.openOAuth(url, 'external');
    return;
  }
  window.location.href = url;
}

export async function pickMediaFiles({ multiple = false } = {}) {
  if (electron && isLocalDesktopBuild() && !isCloudDesktopShell()) {
    const result = await electron.selectMediaFiles({ multiple });
    if (result.canceled) return [];
    return result.files;
  }
  return null;
}

export function showDesktopNotification(title, body) {
  if (electron) {
    return electron.showNotification(title, body);
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

export function onOAuthCallback(handler) {
  if (!electron) return () => {};
  return electron.onOAuthCallback(handler);
}
