import { Router } from 'express';
import { requireSession } from '../middleware/sessionUser.js';
import { getBillingStatus } from '../services/planService.js';
import { isOpenAIConfigured } from '../services/openaiService.js';
import { canUseAI } from '../services/featureGate.js';
import { getUserPlan } from '../services/planService.js';

const router = Router();

router.get('/status', requireSession, async (req, res) => {
  try {
    const billing = await getBillingStatus(req.sessionUser.docId);
    const plan = await getUserPlan(req.sessionUser.docId);
    const aiGate = canUseAI(plan);

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
      paymentsEnabled: false,
      upgradeNote: 'Pagamenti Stripe in arrivo — attivazione manuale disponibile per test',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
