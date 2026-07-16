import { Router } from 'express';
import { requireSession } from '../middleware/sessionUser.js';
import { getBillingStatus } from '../services/planService.js';
import { isOpenAIConfigured } from '../services/openaiService.js';
import { canUseAI, canUseCreativeStudio } from '../services/featureGate.js';
import { getUserPlan } from '../services/planService.js';
import { AI_CREDIT_COSTS, CREATIVE_STUDIO_DAILY_LIMIT } from '../constants/aiCredits.js';
import { redeemCoupon } from '../services/couponService.js';
import {
  createCheckoutSession,
  activateMockPremium,
  createBillingPortalSession,
  getPaymentsInfo,
} from '../services/billingCheckoutService.js';

const router = Router();

router.get('/status', requireSession, async (req, res) => {
  try {
    const billing = await getBillingStatus(req.sessionUser.docId);
    const plan = await getUserPlan(req.sessionUser.docId);
    const aiGate = canUseAI(plan);
    const creativeGate = canUseCreativeStudio(plan);
    const payments = getPaymentsInfo();

    res.json({
      ...billing,
      aiConfigured: isOpenAIConfigured(),
      aiAvailable: aiGate.allowed && isOpenAIConfigured(),
      aiLockReason: !isOpenAIConfigured()
        ? 'AI non configurata sul server'
        : aiGate.allowed
          ? null
          : aiGate.reason,
      aiLockCode: !isOpenAIConfigured() ? 'AI_NOT_CONFIGURED' : aiGate.code || null,
      creativeStudioAvailable: creativeGate.allowed && isOpenAIConfigured(),
      creativeStudioLockReason: !isOpenAIConfigured()
        ? 'AI non configurata sul server'
        : creativeGate.allowed
          ? null
          : creativeGate.reason,
      creativeStudioLockCode: !isOpenAIConfigured() ? 'AI_NOT_CONFIGURED' : creativeGate.code || null,
      creativeStudioUsingWelcomeCredits: creativeGate.usingWelcomeCredits === true,
      creativeStudioWelcomeRemaining: creativeGate.welcomeProCreditsRemaining ?? billing.welcomeProCredits,
      creativeStudioCreditCosts: AI_CREDIT_COSTS,
      creativeStudioDailyLimit: billing.isAdmin ? null : CREATIVE_STUDIO_DAILY_LIMIT,
      paymentsEnabled: payments.paymentsEnabled,
      paymentsMode: payments.paymentsMode,
      stripeConfigured: payments.stripeConfigured,
      mockCheckoutAvailable: payments.mockCheckoutAvailable,
      testMode: payments.testMode,
      stripeTestMode: payments.stripeTestMode,
      upgradeNote: billing.isAdmin
        ? 'Account Admin — accesso PRO illimitato, nessun pagamento richiesto'
        : payments.stripeConfigured
          ? (payments.stripeTestMode ? 'Stripe Test Mode attivo' : 'Pagamenti Stripe attivi')
          : 'Modalità test — attiva PRO senza pagamento reale',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/create-checkout-session', requireSession, async (req, res) => {
  try {
    const interval = req.body?.plan || req.body?.interval || 'monthly';
    const plan = await getUserPlan(req.sessionUser.docId);
    const result = await createCheckoutSession(req.sessionUser.docId, {
      email: plan.email || req.sessionUser.email,
      interval,
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.message,
      code: err.code || 'CHECKOUT_ERROR',
    });
  }
});

router.post('/create-portal-session', requireSession, async (req, res) => {
  try {
    const result = await createBillingPortalSession(req.sessionUser.docId);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.message,
      code: err.code || 'PORTAL_ERROR',
    });
  }
});

router.post('/mock-activate', requireSession, async (req, res) => {
  try {
    const interval = req.body?.plan || req.body?.interval || 'monthly';
    const result = await activateMockPremium(req.sessionUser.docId, { interval });
    const billing = await getBillingStatus(req.sessionUser.docId);
    res.json({ ...result, billing });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.message,
      code: err.code || 'MOCK_ACTIVATE_ERROR',
    });
  }
});

router.post('/redeem-coupon', requireSession, async (req, res) => {
  try {
    const code = req.body?.code;
    if (!code) {
      return res.status(400).json({ error: 'Codice coupon richiesto', code: 'VALIDATION_ERROR' });
    }
    const result = await redeemCoupon(req.sessionUser.docId, code);
    const billing = await getBillingStatus(req.sessionUser.docId);
    res.json({ ...result, billing });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.message,
      code: err.code || 'COUPON_ERROR',
    });
  }
});

export default router;
