import crypto from 'crypto';
import { config } from '../../config.js';
import { getFirebaseAdmin } from '../firebase/admin.js';
import { getCookieOptions, getClearCookieOptions } from '../../utils/cookieOptions.js';
import { logger } from '../../utils/logger.js';

export const FIREBASE_SESSION_COOKIE = 'novapromo_firebase';
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function signUid(uid) {
  const sig = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(uid)
    .digest('hex');
  return `${uid}.${sig}`;
}

function verifySignedSession(value) {
  if (!value || typeof value !== 'string') return null;
  const dot = value.lastIndexOf('.');
  if (dot <= 0) return null;
  const uid = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(uid)
    .digest('hex');
  if (sig.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return uid;
}

export function setFirebaseSessionCookie(res, uid) {
  res.cookie(FIREBASE_SESSION_COOKIE, signUid(uid), getCookieOptions(SESSION_MAX_AGE_MS));
}

export function clearFirebaseSessionCookie(res) {
  res.clearCookie(FIREBASE_SESSION_COOKIE, getClearCookieOptions());
}

export function readFirebaseSessionUid(req) {
  return verifySignedSession(req.cookies?.[FIREBASE_SESSION_COOKIE]);
}

/**
 * Verifica Firebase ID token e restituisce decoded token.
 */
export async function verifyFirebaseIdToken(idToken) {
  const admin = await getFirebaseAdmin();
  if (!admin) {
    const err = new Error('Firebase Admin non configurato sul backend');
    err.code = 'FIREBASE_NOT_CONFIGURED';
    err.status = 503;
    throw err;
  }

  try {
    return await admin.auth.verifyIdToken(idToken);
  } catch (err) {
    logger.warn('Firebase ID token invalid', { error: err.message });
    const e = new Error('Token Firebase non valido o scaduto');
    e.code = 'INVALID_FIREBASE_TOKEN';
    e.status = 401;
    throw e;
  }
}
