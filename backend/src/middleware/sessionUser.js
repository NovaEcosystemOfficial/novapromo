import { SESSION_COOKIE } from '../routes/auth.js';
import { getSession } from '../services/auth/sessionService.js';
import { hasLocalSession, LOCAL_USER } from '../services/localAuthService.js';

/**
 * Resolve authenticated user for premium/AI routes.
 * Does not block unauthenticated callers — use requireSession for that.
 */
export function resolveSessionUser(req) {
  if (hasLocalSession(req)) {
    return {
      uid: LOCAL_USER.uid,
      openId: null,
      docId: 'local-desktop',
      displayName: LOCAL_USER.displayName,
      username: LOCAL_USER.username,
      mode: 'local',
    };
  }

  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (!sessionId) return null;

  const session = getSession(sessionId);
  if (!session) return null;

  return {
    uid: session.uid,
    openId: session.openId,
    docId: session.openId,
    displayName: session.displayName,
    username: session.username,
    mode: 'tiktok',
  };
}

export function requireSession(req, res, next) {
  const user = resolveSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Autenticazione richiesta', code: 'AUTH_REQUIRED' });
  }
  req.sessionUser = user;
  next();
}
