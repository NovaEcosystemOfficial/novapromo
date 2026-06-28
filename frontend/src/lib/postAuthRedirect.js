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
      return stored;
    }
  } catch {
    // ignore
  }
  return fallback;
}

export function resolveAuthReturnPath(location, fallback = '/dashboard') {
  const fromState = location.state?.from;
  if (typeof fromState === 'string' && fromState.startsWith('/')) {
    return fromState;
  }
  return consumeOAuthReturn(fallback);
}
