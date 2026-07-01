import { SESSION_COOKIE } from '../routes/auth.js';
import { getSession } from '../services/auth/sessionService.js';
import { hasLocalSession, LOCAL_USER } from '../services/localAuthService.js';
import { readFirebaseSessionUid } from '../services/auth/firebaseSessionService.js';
import { getUserPlan } from '../services/planService.js';

/**
 * Resolve authenticated user for premium/AI routes.
 */
export async function resolveSessionUser(req) {
  const firebaseUid = readFirebaseSessionUid(req);
  if (firebaseUid) {
    const plan = await getUserPlan(firebaseUid);
    return {
      uid: firebaseUid,
      openId: null,
      docId: firebaseUid,
      email: plan.email || null,
      displayName: plan.displayName || null,
      username: plan.email?.split('@')[0] || null,
      role: plan.role || 'user',
      mode: 'firebase',
    };
  }

  if (hasLocalSession(req)) {
    return {
      uid: LOCAL_USER.uid,
      openId: null,
      docId: 'local-desktop',
      displayName: LOCAL_USER.displayName,
      username: LOCAL_USER.username,
      role: 'user',
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
    role: 'user',
    mode: 'tiktok',
  };
}

export async function requireSession(req, res, next) {
  const user = await resolveSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Autenticazione richiesta', code: 'AUTH_REQUIRED' });
  }
  req.sessionUser = user;
  next();
}
