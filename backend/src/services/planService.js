import { getFirebaseAdmin } from './firebase/admin.js';
import { useFirebaseDataStore } from './firebase/dataStore.js';
import { getDb } from '../db/index.js';
import {
  getPlanDefinition,
  currentCreditsMonth,
  PLAN_DEFINITIONS,
} from '../constants/plans.js';
import { logger } from '../utils/logger.js';

/**
 * @typedef {Object} UserPlanRecord
 * @property {string} docId
 * @property {string} [uid]
 * @property {'free'|'premium'|'business'} plan
 * @property {number} aiCreditsUsedThisMonth
 * @property {number} aiCreditsLimit
 * @property {string} aiCreditsMonth
 * @property {boolean} businessActive
 * @property {string} createdAt
 * @property {string} updatedAt
 */

function buildDefaultPlan(docId, uid = null) {
  const now = new Date().toISOString();
  const def = PLAN_DEFINITIONS.free;
  return {
    docId,
    uid,
    plan: 'free',
    aiCreditsUsedThisMonth: 0,
    aiCreditsLimit: def.aiCreditsLimit,
    aiCreditsMonth: currentCreditsMonth(),
    businessActive: false,
    createdAt: now,
    updatedAt: now,
  };
}

function normalizePlanRecord(raw, docId) {
  const month = currentCreditsMonth();
  const plan = raw.plan || 'free';
  const def = getPlanDefinition(plan);
  let used = raw.aiCreditsUsedThisMonth ?? 0;
  let creditsMonth = raw.aiCreditsMonth || month;

  if (creditsMonth !== month) {
    used = 0;
    creditsMonth = month;
  }

  return {
    docId,
    uid: raw.uid || null,
    plan,
    aiCreditsUsedThisMonth: used,
    aiCreditsLimit: raw.aiCreditsLimit ?? def.aiCreditsLimit,
    aiCreditsMonth: creditsMonth,
    businessActive: Boolean(raw.businessActive),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

async function getFirestorePlan(docId) {
  const admin = await getFirebaseAdmin();
  if (!admin) return null;
  const snap = await admin.db.collection('users').doc(docId).get();
  if (!snap.exists) return null;
  return normalizePlanRecord(snap.data(), docId);
}

async function ensureFirestorePlan(docId, { uid, displayName, username } = {}) {
  const admin = await getFirebaseAdmin();
  if (!admin) return buildDefaultPlan(docId, uid);

  const ref = admin.db.collection('users').doc(docId);
  const snap = await ref.get();
  const now = new Date().toISOString();
  const month = currentCreditsMonth();

  if (!snap.exists) {
    const def = buildDefaultPlan(docId, uid);
    await ref.set({
      uid: uid || docId,
      displayName: displayName || null,
      username: username || null,
      plan: def.plan,
      aiCreditsUsedThisMonth: 0,
      aiCreditsLimit: def.aiCreditsLimit,
      aiCreditsMonth: month,
      businessActive: false,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
    return def;
  }

  const data = snap.data();
  const normalized = normalizePlanRecord(data, docId);
  const updates = { updatedAt: now };

  if (!data.plan) updates.plan = 'free';
  if (data.aiCreditsLimit == null) updates.aiCreditsLimit = getPlanDefinition(data.plan || 'free').aiCreditsLimit;
  if (data.aiCreditsMonth !== month) {
    updates.aiCreditsUsedThisMonth = 0;
    updates.aiCreditsMonth = month;
  }
  if (data.businessActive == null) updates.businessActive = false;

  if (Object.keys(updates).length > 1) {
    await ref.set(updates, { merge: true });
  }

  return { ...normalized, ...updates };
}

function getSqlitePlan(docId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM user_plans WHERE user_doc_id = ?').get(docId);
  if (!row) return null;
  return normalizePlanRecord({
    uid: row.uid,
    plan: row.plan,
    aiCreditsUsedThisMonth: row.ai_credits_used,
    aiCreditsLimit: row.ai_credits_limit,
    aiCreditsMonth: row.ai_credits_month,
    businessActive: row.business_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }, docId);
}

function ensureSqlitePlan(docId, { uid } = {}) {
  const existing = getSqlitePlan(docId);
  if (existing) {
    const month = currentCreditsMonth();
    if (existing.aiCreditsMonth !== month) {
      const db = getDb();
      db.prepare(`
        UPDATE user_plans
        SET ai_credits_used = 0, ai_credits_month = ?, updated_at = ?
        WHERE user_doc_id = ?
      `).run(month, new Date().toISOString(), docId);
      return { ...existing, aiCreditsUsedThisMonth: 0, aiCreditsMonth: month };
    }
    return existing;
  }

  const def = buildDefaultPlan(docId, uid);
  const db = getDb();
  db.prepare(`
    INSERT INTO user_plans (user_doc_id, uid, plan, ai_credits_used, ai_credits_limit, ai_credits_month, business_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    docId,
    uid || docId,
    def.plan,
    0,
    def.aiCreditsLimit,
    def.aiCreditsMonth,
    def.createdAt,
    def.updatedAt
  );
  return def;
}

export async function ensureUserPlan(docId, profile = {}) {
  if (useFirebaseDataStore()) {
    return ensureFirestorePlan(docId, profile);
  }
  return ensureSqlitePlan(docId, profile);
}

export async function getUserPlan(docId) {
  if (useFirebaseDataStore()) {
    const plan = await getFirestorePlan(docId);
    if (plan) return plan;
    return ensureFirestorePlan(docId);
  }
  const plan = getSqlitePlan(docId);
  if (plan) return plan;
  return ensureSqlitePlan(docId);
}

export async function consumeAICredit(docId) {
  const plan = await getUserPlan(docId);
  const month = currentCreditsMonth();
  const used = plan.aiCreditsUsedThisMonth + 1;
  const now = new Date().toISOString();

  if (useFirebaseDataStore()) {
    const admin = await getFirebaseAdmin();
    if (admin) {
      await admin.db.collection('users').doc(docId).set({
        aiCreditsUsedThisMonth: used,
        aiCreditsMonth: month,
        updatedAt: now,
      }, { merge: true });
    }
  } else {
    const db = getDb();
    db.prepare(`
      UPDATE user_plans
      SET ai_credits_used = ?, ai_credits_month = ?, updated_at = ?
      WHERE user_doc_id = ?
    `).run(used, month, now, docId);
  }

  return { ...plan, aiCreditsUsedThisMonth: used, aiCreditsMonth: month, updatedAt: now };
}

export async function getBillingStatus(docId) {
  const userPlan = await ensureUserPlan(docId);
  const def = getPlanDefinition(userPlan.plan);
  return {
    plan: userPlan.plan,
    planLabel: def.label,
    planDescription: def.description,
    aiCreditsUsed: userPlan.aiCreditsUsedThisMonth,
    aiCreditsLimit: userPlan.aiCreditsLimit,
    aiCreditsRemaining: Math.max(0, userPlan.aiCreditsLimit - userPlan.aiCreditsUsedThisMonth),
    aiCreditsMonth: userPlan.aiCreditsMonth,
    isPremium: userPlan.plan === 'premium' || (userPlan.plan === 'business' && userPlan.businessActive),
    businessActive: userPlan.businessActive,
    plans: Object.values(PLAN_DEFINITIONS).map((p) => ({
      id: p.id,
      label: p.label,
      aiCreditsLimit: p.aiCreditsLimit,
      aiEnabled: p.id === 'business' ? false : p.aiEnabled,
      description: p.description,
    })),
  };
}

export async function setUserPlan(docId, planId, { businessActive } = {}) {
  if (!PLAN_DEFINITIONS[planId]) {
    throw Object.assign(new Error('Piano non valido'), { status: 400 });
  }
  const def = getPlanDefinition(planId);
  const now = new Date().toISOString();
  const payload = {
    plan: planId,
    aiCreditsLimit: def.aiCreditsLimit,
    updatedAt: now,
  };
  if (planId === 'business' && businessActive != null) {
    payload.businessActive = Boolean(businessActive);
  }

  if (useFirebaseDataStore()) {
    const admin = await getFirebaseAdmin();
    if (admin) {
      await admin.db.collection('users').doc(docId).set(payload, { merge: true });
    }
  } else {
    const db = getDb();
    db.prepare(`
      UPDATE user_plans SET plan = ?, ai_credits_limit = ?, business_active = ?, updated_at = ?
      WHERE user_doc_id = ?
    `).run(
      planId,
      def.aiCreditsLimit,
      planId === 'business' && businessActive ? 1 : 0,
      now,
      docId
    );
  }

  logger.info('User plan updated', { docId, plan: planId });
  return getUserPlan(docId);
}
