import { config } from '../config.js';

const PROTOCOL = 'novapromo';

/**
 * Build redirect URL after OAuth — web uses APP_URL (Vercel), desktop uses novapromo:// protocol.
 */
export function buildAppRedirect(pathWithQuery) {
  const normalized = pathWithQuery.startsWith('/') ? pathWithQuery.slice(1) : pathWithQuery;

  if (config.runtime === 'desktop') {
    return `${PROTOCOL}://${normalized}`;
  }

  return `${config.frontendUrl}/${normalized}`;
}

export function buildLoginCallbackRedirect(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return buildAppRedirect(`auth/callback${qs ? `?${qs}` : ''}`);
}

export function buildAccountsRedirect(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return buildAppRedirect(`accounts${qs ? `?${qs}` : ''}`);
}
