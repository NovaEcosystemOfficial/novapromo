import { config } from '../config.js';
import { getFirebaseAdmin } from './firebase/admin.js';
import { useFirebaseDataStore } from './firebase/dataStore.js';
import { getDb } from '../db/index.js';
import { getUserPlan } from './planService.js';
import { logger } from '../utils/logger.js';

export const UNLIMITED_CREDITS = 999999;

export function getAdminEmails() {
  return (config.adminEmails || [])
    .map((e) => String(e).trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email) {
  if (!email) return false;
  return getAdminEmails().includes(String(email).trim().toLowerCase());
}

/**
 * @param {import('./planService.js').UserPlanRecord} user
 */
export function isAdmin(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return isAdminEmail(user.email);
}

export function hasUnlimitedCredits(user) {
  return isAdmin(user);
}

async function patchUser(docId, payload) {
  const now = new Date().toISOString();
  const data = { ...payload, updatedAt: now };

  if (useFirebaseDataStore()) {
    const admin = await getFirebaseAdmin();
    if (admin) {
      await admin.db.collection('users').doc(docId).set(data, { merge: true });
    }
    return;
  }

  const db = getDb();
  const sets = [];
  const vals = [];
  if (data.plan != null) { sets.push('plan = ?'); vals.push(data.plan); }
  if (data.ai_credits_limit != null || data.aiCreditsLimit != null) {
    sets.push('ai_credits_limit = ?');
    vals.push(data.aiCreditsLimit ?? data.ai_credits_limit);
  }
  if (data.premium_until != null || data.premiumUntil != null) {
    sets.push('premium_until = ?');
    vals.push(data.premiumUntil ?? data.premium_until);
  }
  if (data.credits != null) { sets.push('credits = ?'); vals.push(data.credits); }
  if (data.role != null) { sets.push('role = ?'); vals.push(data.role); }
  sets.push('updated_at = ?');
  vals.push(now, docId);
  if (sets.length > 1) {
    db.prepare(`UPDATE user_plans SET ${sets.join(', ')} WHERE user_doc_id = ?`).run(...vals);
  }
}

/** Regala giorni Premium (helper admin / coupon). */
export async function grantPremiumDays(docId, days) {
  const plan = await getUserPlan(docId);
  const now = new Date();
  const base = plan.premiumUntil && new Date(plan.premiumUntil) > now
    ? new Date(plan.premiumUntil)
    : now;
  base.setDate(base.getDate() + Math.max(1, Math.floor(days)));
  const premiumUntil = base.toISOString();

  await patchUser(docId, {
    plan: 'premium',
    premiumUntil,
    aiCreditsLimit: 300,
    role: isAdmin(plan) ? 'admin' : (plan.role || 'user'),
  });

  logger.info('Premium days granted', { docId, days, premiumUntil });
  return getUserPlan(docId);
}

/** Aggiunge crediti bonus al profilo. */
export async function grantCredits(docId, amount) {
  const plan = await getUserPlan(docId);
  const bonus = Math.max(0, Math.floor(Number(amount) || 0));
  const credits = (plan.credits || 0) + bonus;

  await patchUser(docId, { credits });
  logger.info('Bonus credits granted', { docId, amount: bonus, total: credits });
  return getUserPlan(docId);
}
