import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Host Vite dev — localhost per BrowserRouter */
export const DEV_HOST = 'localhost';

export const BACKEND_PORT = parseInt(process.env.NOVAPROMO_BACKEND_PORT || '3001', 10);
export const FRONTEND_PORT = parseInt(process.env.NOVAPROMO_FRONTEND_PORT || '5173', 10);

const frontendOrigin =
  process.env.VITE_DEV_SERVER_URL || `http://${DEV_HOST}:${FRONTEND_PORT}`;

export const FRONTEND_DEV_URL = frontendOrigin.replace(/\/$/, '');

/** URL iniziale Electron vs Vite locale (solo se NOVAPROMO_APP_URL non è impostato in dev) */
export const FRONTEND_DEV_DASHBOARD_URL = `${FRONTEND_DEV_URL}/dashboard`;

export const BACKEND_DEV_URL = `http://${DEV_HOST}:${BACKEND_PORT}`;

/**
 * Thin-client cloud shell — stessa app del web (Vercel).
 * Override: NOVAPROMO_CLOUD_APP_URL / NOVAPROMO_APP_URL
 */
export const CLOUD_APP_ORIGIN = (
  process.env.NOVAPROMO_CLOUD_APP_URL
  || process.env.NOVAPROMO_APP_ORIGIN
  || 'https://novapromo.vercel.app'
).replace(/\/$/, '');

export const CLOUD_APP_START_URL = (
  process.env.NOVAPROMO_APP_URL
  || `${CLOUD_APP_ORIGIN}/dashboard`
).replace(/\/$/, '');

export const PROTOCOL = 'novapromo';

export function getProjectRoot() {
  return path.resolve(__dirname, '..');
}

/** @deprecated Local backend packaging — kept for optional NOVAPROMO_SPAWN_BACKEND=1 */
export function getBackendEntry(isPackaged, resourcesPath) {
  if (isPackaged) {
    return path.join(resourcesPath, 'backend', 'src', 'index.js');
  }
  return path.join(getProjectRoot(), 'backend', 'src', 'index.js');
}

/** @deprecated Local UI packaging — thin client loads cloud URL */
export function getFrontendDist(isPackaged, resourcesPath) {
  if (isPackaged) {
    return path.join(resourcesPath, 'frontend', 'dist');
  }
  return path.join(getProjectRoot(), 'frontend', 'dist');
}

/** @deprecated */
export function getFrontendIndexHtml(isPackaged, resourcesPath) {
  return path.join(getFrontendDist(isPackaged, resourcesPath), 'index.html');
}

export function getPreloadPath() {
  return path.join(__dirname, 'preload.js');
}

export function getIconPath() {
  return path.join(getProjectRoot(), 'build', 'icon.png');
}

/**
 * Resolve the URL Electron should open.
 * - Packaged: always cloud (or NOVAPROMO_APP_URL)
 * - Dev: NOVAPROMO_APP_URL if set, else local Vite dashboard
 */
export function getAppStartUrl(isPackaged) {
  if (process.env.NOVAPROMO_APP_URL) {
    return process.env.NOVAPROMO_APP_URL.replace(/\/$/, '');
  }
  if (isPackaged || process.env.NOVAPROMO_USE_CLOUD === '1') {
    return CLOUD_APP_START_URL;
  }
  return FRONTEND_DEV_DASHBOARD_URL;
}
