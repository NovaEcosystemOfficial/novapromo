import { getFirebaseAdmin } from './firebase/admin.js';
import { useFirebaseDataStore } from './firebase/dataStore.js';
import { grantPremiumDays, grantCredits } from './adminService.js';
import { getUserPlan } from './planService.js';
import { logger } from '../utils/logger.js';

async function getCoupon(code) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return null;

  if (!useFirebaseDataStore()) {
    const err = new Error('Coupon disponibili solo con Firestore');
    err.code = 'COUPONS_FIRESTORE_ONLY';
    err.status = 503;
    throw err;
  }

  const admin = await getFirebaseAdmin();
  if (!admin) {
    const err = new Error('Firebase non configurato');
    err.status = 503;
    throw err;
  }

  const snap = await admin.db.collection('coupons').doc(normalized).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function incrementCouponUse(code) {
  const admin = await getFirebaseAdmin();
  if (!admin) return;
  const ref = admin.db.collection('coupons').doc(code);
  const snap = await ref.get();
  if (!snap.exists) return;
  const used = (snap.data().usedCount || 0) + 1;
  await ref.set({ usedCount: used, updatedAt: new Date().toISOString() }, { merge: true });
}

/**
 * @param {string} docId
 * @param {string} code
 */
export async function redeemCoupon(docId, code) {
  const coupon = await getCoupon(code);
  if (!coupon) {
    const err = new Error('Coupon non valido');
    err.code = 'COUPON_INVALID';
    err.status = 404;
    throw err;
  }

  if (coupon.active === false) {
    const err = new Error('Coupon non più attivo');
    err.code = 'COUPON_INACTIVE';
    err.status = 400;
    throw err;
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    const err = new Error('Coupon scaduto');
    err.code = 'COUPON_EXPIRED';
    err.status = 400;
    throw err;
  }

  if (coupon.maxUses != null && (coupon.usedCount || 0) >= coupon.maxUses) {
    const err = new Error('Coupon esaurito');
    err.code = 'COUPON_EXHAUSTED';
    err.status = 400;
    throw err;
  }

  let result;
  if (coupon.type === 'premium_days') {
    result = await grantPremiumDays(docId, coupon.value || 30);
  } else if (coupon.type === 'credits') {
    result = await grantCredits(docId, coupon.value || 10);
  } else {
    const err = new Error('Tipo coupon non supportato');
    err.code = 'COUPON_INVALID_TYPE';
    err.status = 400;
    throw err;
  }

  await incrementCouponUse(coupon.id || String(code).trim().toUpperCase());
  logger.info('Coupon redeemed', { docId, code: coupon.code || code, type: coupon.type });

  return {
    success: true,
    type: coupon.type,
    value: coupon.value,
    plan: result.plan,
    credits: result.credits,
    premiumUntil: result.premiumUntil,
  };
}
