import { Router } from 'express';
import { requireSession } from '../middleware/sessionUser.js';
import { getBillingStatus } from '../services/planService.js';
import { isOpenAIConfigured } from '../services/openaiService.js';
import { canUseAI, canUseCreativeStudio } from '../services/featureGate.js';
import { getUserPlan } from '../services/planService.js';
import { AI_CREDIT_COSTS, CREATIVE_STUDIO_DAILY_LIMIT } from '../constants/aiCredits.js';
import { redeemCoupon } from '../services/couponService.js';

const router = Router();

router.get('/status', requireSession, async (req, res) => {
  try {
    const billing = await getBillingStatus(req.sessionUser.docId);
    const plan = await getUserPlan(req.sessionUser.docId);
    const aiGate = canUseAI(plan);
    const creativeGate = canUseCreativeStudio(plan);

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
      creativeStudioCreditCosts: AI_CREDIT_COSTS,
      creativeStudioDailyLimit: billing.isAdmin ? null : CREATIVE_STUDIO_DAILY_LIMIT,
      paymentsEnabled: false,
      upgradeNote: 'Pagamenti Stripe in arrivo — usa un coupon o contattaci per Premium',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
