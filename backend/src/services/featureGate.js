import { getPlanDefinition } from '../constants/plans.js';

/**
 * @param {import('./planService.js').UserPlanRecord} userPlan
 */
export function canUseAI(userPlan) {
  if (!userPlan) {
    return { allowed: false, reason: 'Utente non trovato', code: 'USER_NOT_FOUND' };
  }

  const def = getPlanDefinition(userPlan.plan);

  if (userPlan.plan === 'business' && !userPlan.businessActive) {
    return {
      allowed: false,
      reason: 'Piano Business in arrivo — contattaci per l\'attivazione',
      code: 'BUSINESS_NOT_ACTIVE',
    };
  }

  if (!def.aiEnabled && userPlan.plan !== 'premium' && !(userPlan.plan === 'business' && userPlan.businessActive)) {
    return { allowed: false, reason: 'AI non inclusa nel piano attuale', code: 'PLAN_AI_DISABLED' };
  }

  if (userPlan.aiCreditsUsedThisMonth >= userPlan.aiCreditsLimit) {
    return {
      allowed: false,
      reason: `Limite AI mensile raggiunto (${userPlan.aiCreditsLimit})`,
      code: 'AI_CREDITS_EXHAUSTED',
      creditsUsed: userPlan.aiCreditsUsedThisMonth,
      creditsLimit: userPlan.aiCreditsLimit,
    };
  }

  return {
    allowed: true,
    creditsUsed: userPlan.aiCreditsUsedThisMonth,
    creditsLimit: userPlan.aiCreditsLimit,
    remaining: userPlan.aiCreditsLimit - userPlan.aiCreditsUsedThisMonth,
  };
}

/**
 * @param {import('./planService.js').UserPlanRecord} userPlan
 */
export function isPremiumPlan(userPlan) {
  if (!userPlan) return false;
  if (userPlan.plan === 'premium') return true;
  if (userPlan.plan === 'business' && userPlan.businessActive) return true;
  return false;
}
