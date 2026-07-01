import { getFirebaseAdmin } from './firebase/admin.js';
import { useFirebaseDataStore } from './firebase/dataStore.js';
import { getDb } from '../db/index.js';
import { currentCreditsMonth, PLAN_DEFINITIONS } from '../constants/plans.js';
import { isAdminEmail } from './adminService.js';
import { UNLIMITED_CREDITS } from './adminService.js';
import { logger } from '../utils/logger.js';

const TRIAL_DAYS = 7;
const TRIAL_CREDITS = 100;
const FREE_MONTHLY_CREDITS = 30;

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function buildTrialProfile(uid, email, displayName) {
  const now = new Date().toISOString();
  return {
    uid,
    email: email || null,
    displayName: displayName || email?.split('@')[0] || 'Utente',
    role: 'user',
    plan: 'trial',
    credits: TRIAL_CREDITS,
    creditsResetAt: currentCreditsMonth(),
    trialStartedAt: now,
    trialEndsAt: addDays(now, TRIAL_DAYS),
    premiumUntil: null,
    aiCreditsUsedThisMonth: 0,
    aiCreditsLimit: TRIAL_CREDITS,
    aiCreditsMonth: currentCreditsMonth(),
    businessActive: false,
    provider: 'firebase',
    createdAt: now,
    updatedAt: now,
  };
}

function buildAdminProfile(uid, email, displayName) {
  const now = new Date().toISOString();
  return {
    uid,
    email: email || null,
    displayName: displayName || 'Admin',
    role: 'admin',
    plan: 'premium',
    credits: UNLIMITED_CREDITS,
    creditsResetAt: currentCreditsMonth(),
    trialStartedAt: null,
    trialEndsAt: null,
    premiumUntil: null,
    aiCreditsUsedThisMonth: 0,
    aiCreditsLimit: UNLIMITED_CREDITS,
    aiCreditsMonth: currentCreditsMonth(),
    businessActive: false,
    provider: 'firebase',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Crea o aggiorna users/{uid} dopo login Firebase Auth.
 */
export async function upsertUserFromFirebaseAuth({ uid, email, displayName }) {
  const now = new Date().toISOString();

  if (useFirebaseDataStore()) {
    const admin = await getFirebaseAdmin();
    if (!admin) {
      throw Object.assign(new Error('Firebase non configurato'), { status: 503 });
    }

    const ref = admin.db.collection('users').doc(uid);
    const snap = await ref.get();

    if (!snap.exists) {
      const doc = isAdminEmail(email)
        ? buildAdminProfile(uid, email, displayName)
        : buildTrialProfile(uid, email, displayName);
      await ref.set(doc);
      logger.info('New Firebase user profile', { uid, plan: doc.plan, role: doc.role });
      return doc;
    }

    const data = snap.data();
    const updates = {
      email: email || data.email || null,
      displayName: displayName || data.displayName || null,
      updatedAt: now,
    };

    if (isAdminEmail(email) && data.role !== 'admin') {
      Object.assign(updates, {
        role: 'admin',
        plan: 'premium',
        credits: UNLIMITED_CREDITS,
        aiCreditsLimit: UNLIMITED_CREDITS,
      });
    }

    await ref.set(updates, { merge: true });
    return { ...data, ...updates, uid };
  }

  const db = getDb();
  const row = db.prepare('SELECT * FROM user_plans WHERE user_doc_id = ?').get(uid);

  if (!row) {
    const doc = isAdminEmail(email)
      ? buildAdminProfile(uid, email, displayName)
      : buildTrialProfile(uid, email, displayName);
    db.prepare(`
      INSERT INTO user_plans (
        user_doc_id, uid, email, display_name, role, plan, credits,
        trial_started_at, trial_ends_at, premium_until, credits_reset_at,
        ai_credits_used, ai_credits_limit, ai_credits_month, business_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      uid, uid, doc.email, doc.displayName, doc.role, doc.plan, doc.credits,
      doc.trialStartedAt, doc.trialEndsAt, doc.premiumUntil, doc.creditsResetAt,
      0, doc.aiCreditsLimit, doc.aiCreditsMonth,
      doc.createdAt, doc.updatedAt
    );
    return doc;
  }

  db.prepare(`
    UPDATE user_plans SET email = ?, display_name = ?, updated_at = ? WHERE user_doc_id = ?
  `).run(email || row.email, displayName || row.display_name, now, uid);

  return {
    uid,
    email: email || row.email,
    displayName: displayName || row.display_name,
    role: row.role,
    plan: row.plan,
  };
}
