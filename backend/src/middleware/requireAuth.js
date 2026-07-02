import { hasLocalSession, LOCAL_USER } from '../services/localAuthService.js';
import { getSession } from '../services/auth/sessionService.js';

const SESSION_COOKIE = 'novapromo_session';

export function resolveOwnerUid(req) {
  if (hasLocalSession(req)) {
    return LOCAL_USER.uid;
  }

  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (sessionId) {
    const session = getSession(sessionId);
    if (session?.uid) return session.uid;
  }

  return null;
}

export function requireAuth(req, res, next) {
  const ownerUid = resolveOwnerUid(req);
  if (!ownerUid) {
    return res.status(401).json({ error: 'Autenticazione richiesta' });
  }

  req.ownerUid = ownerUid;
  return next();
}
