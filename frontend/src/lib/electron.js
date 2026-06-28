import { isDesktopApp } from './runtime.js';

export const electron = isDesktopApp() ? window.electronAPI : null;

export async function openOAuthUrl(url) {
  if (electron) {
    await electron.openOAuth(url, 'external');
    return;
  }
  window.location.href = url;
}

export async function pickMediaFiles({ multiple = false } = {}) {
  if (electron) {
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
