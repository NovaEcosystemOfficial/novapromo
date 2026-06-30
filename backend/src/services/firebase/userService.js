import { logger } from '../../utils/logger.js';
import { getFirebaseAdmin } from './admin.js';
import { ensureUserPlan } from '../planService.js';
import { currentCreditsMonth, PLAN_DEFINITIONS } from '../../constants/plans.js';
export async function upsertTikTokUser(profile, tokens) {
  const admin = await getFirebaseAdmin();
  const now = new Date().toISOString();
  const uid = `tiktok:${profile.openId}`;

  const userDoc = {
    uid,
    provider: 'tiktok',
    openId: profile.openId,
    displayName: profile.displayName,
    username: profile.username,
    avatarUrl: profile.avatarUrl,
    tiktokAccessTokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
    updatedAt: now,
  };

  if (admin) {
    const ref = admin.db.collection('users').doc(profile.openId);
    const existing = await ref.get();
    const month = currentCreditsMonth();
    const planDefaults = {
      plan: existing.exists ? existing.data()?.plan || 'free' : 'free',
      aiCreditsLimit: existing.exists
        ? existing.data()?.aiCreditsLimit ?? PLAN_DEFINITIONS.free.aiCreditsLimit
        : PLAN_DEFINITIONS.free.aiCreditsLimit,
      aiCreditsUsedThisMonth: existing.exists && existing.data()?.aiCreditsMonth === month
        ? existing.data()?.aiCreditsUsedThisMonth ?? 0
        : 0,
      aiCreditsMonth: month,
      businessActive: existing.exists ? Boolean(existing.data()?.businessActive) : false,
    };

    await ref.set(
      {
        ...userDoc,
        ...planDefaults,
        createdAt: existing.exists ? existing.data()?.createdAt || now : now,
      },
      { merge: true }
    );

    try {
      await admin.auth.getUser(uid);
    } catch {
      await admin.auth.createUser({
        uid,
        displayName: profile.displayName,
        photoURL: profile.avatarUrl || undefined,
      });
    }

    await admin.auth.updateUser(uid, {
      displayName: profile.displayName,
      photoURL: profile.avatarUrl || undefined,
    });

    const customToken = await admin.auth.createCustomToken(uid, {
      provider: 'tiktok',
      openId: profile.openId,
    });

    return { uid, customToken, storedIn: 'firestore' };
  }

  logger.warn('Firebase Admin non configurato — utente salvato solo in sessione');
  return { uid, customToken: null, storedIn: 'session_only' };
}

export async function getFirestoreUser(openId) {
  const admin = await getFirebaseAdmin();
  if (!admin) return null;
  const snap = await admin.db.collection('users').doc(openId).get();
  return snap.exists ? snap.data() : null;
}

export async function createCustomTokenForSession(session) {
  const admin = await getFirebaseAdmin();
  if (!admin) return null;

  try {
    await admin.auth.getUser(session.uid);
  } catch {
    await admin.auth.createUser({
      uid: session.uid,
      displayName: session.displayName,
      photoURL: session.avatarUrl || undefined,
    });
  }

  return admin.auth.createCustomToken(session.uid, {
    provider: 'tiktok',
    openId: session.openId,
  });
}
