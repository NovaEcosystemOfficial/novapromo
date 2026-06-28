import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Host Vite dev — localhost per BrowserRouter */
export const DEV_HOST = 'localhost';

/** Host OAuth Meta desktop — deve coincidere con Meta Developers */
export const OAUTH_HOST = '127.0.0.1';

export const BACKEND_PORT = parseInt(process.env.NOVAPROMO_BACKEND_PORT || '3001', 10);
export const FRONTEND_PORT = parseInt(process.env.NOVAPROMO_FRONTEND_PORT || '5173', 10);

const frontendOrigin =
  process.env.VITE_DEV_SERVER_URL || `http://${DEV_HOST}:${FRONTEND_PORT}`;

export const FRONTEND_DEV_URL = frontendOrigin.replace(/\/$/, '');

/** URL iniziale Electron dev — BrowserRouter, path /dashboard */
export const FRONTEND_DEV_DASHBOARD_URL = `${FRONTEND_DEV_URL}/dashboard`;

export const BACKEND_DEV_URL = `http://${DEV_HOST}:${BACKEND_PORT}`;

/** URL backend per OAuth Meta (redirect URI su Meta Developers) */
export const OAUTH_BACKEND_URL = `http://${OAUTH_HOST}:${BACKEND_PORT}`;

export const PROTOCOL = 'novapromo';

export function getProjectRoot() {
  return path.resolve(__dirname, '..');
}

export function getBackendEntry(isPackaged, resourcesPath) {
  if (isPackaged) {
    return path.join(resourcesPath, 'backend', 'src', 'index.js');
  }
  return path.join(getProjectRoot(), 'backend', 'src', 'index.js');
}

export function getFrontendDist(isPackaged, resourcesPath) {
  if (isPackaged) {
    return path.join(resourcesPath, 'frontend', 'dist');
  }
  return path.join(getProjectRoot(), 'frontend', 'dist');
}

export function getFrontendIndexHtml(isPackaged, resourcesPath) {
  return path.join(getFrontendDist(isPackaged, resourcesPath), 'index.html');
}

export function getPreloadPath() {
  return path.join(__dirname, 'preload.js');
}

export function getIconPath() {
  return path.join(getProjectRoot(), 'build', 'icon.png');
}
