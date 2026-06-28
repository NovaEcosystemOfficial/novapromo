const OAUTH_RETURN_KEY = 'novapromo_post_oauth_path';

export function markOAuthReturn(path = '/accounts') {
  try {
    sessionStorage.setItem(OAUTH_RETURN_KEY, path);
  } catch {
    // ignore private mode / blocked storage
  }
}

export function consumeOAuthReturn(fallback = '/dashboard') {
  try {
    const stored = sessionStorage.getItem(OAUTH_RETURN_KEY);
    if (stored) {
      sessionStorage.removeItem(OAUTH_RETURN_KEY);
      return normalizeReturnPath(stored, fallback);
    }
  } catch {
    // ignore
  }
  return fallback;
}

export function normalizeReturnPath(path, fallback = '/dashboard') {
  if (!path || !path.startsWith('/')) return fallback;
  if (path === '/' || path.startsWith('/login')) return fallback;
  return path;
}

export function resolveAuthReturnPath(location, fallback = '/dashboard') {
  const fromState = location.state?.from;
  if (typeof fromState === 'string' && fromState.startsWith('/')) {
    return normalizeReturnPath(fromState, fallback);
  }
  return consumeOAuthReturn(fallback);
}
