import { config } from '../config.js';

/**
 * Cookie options: httpOnly always.
 * Local HTTP: Secure=false, SameSite=Lax.
 * Production HTTPS (same-origin or cross-origin): Secure=true; SameSite=None if cross-origin.
 */
export function isCrossOriginDeploy() {
  try {
    const front = new URL(config.frontendUrl);
    const back = new URL(config.backendUrl);
    return front.origin !== back.origin;
  } catch {
    return false;
  }
}

function isSecureCookieContext() {
  try {
    const base = config.isDesktop ? config.backendUrl : config.appUrl;
    return new URL(base).protocol === 'https:';
  } catch {
    return config.isProduction && !config.isDesktop;
  }
}

export function getCookieOptions(maxAgeMs) {
  const crossOrigin = isCrossOriginDeploy();
  const secure = isSecureCookieContext();

  return {
    httpOnly: true,
    secure,
    sameSite: secure && crossOrigin ? 'none' : 'lax',
    maxAge: maxAgeMs,
    path: '/',
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
  };
}

export function getClearCookieOptions() {
  const crossOrigin = isCrossOriginDeploy();
  const secure = isSecureCookieContext();

  return {
    path: '/',
    secure,
    sameSite: secure && crossOrigin ? 'none' : 'lax',
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
  };
}
