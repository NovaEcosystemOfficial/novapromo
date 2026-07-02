import { getPlanDefinition } from '../constants/plans.js';
import { isAdmin, hasUnlimitedCredits } from './adminService.js';
import { computeCreditsRemaining, getWelcomeProRemaining } from './planService.js';

/**
 * @param {import('./planService.js').UserPlanRecord} userPlan
 */
export function canUseAI(userPlan) {
  if (!userPlan) {
    return { allowed: false, reason: 'Utente non trovato', code: 'USER_NOT_FOUND' };
  }

  if (hasUnlimitedCredits(userPlan)) {
    return {
      allowed: true,
      creditsUsed: userPlan.aiCreditsUsedThisMonth,
      creditsLimit: null,
      remaining: null,
      unlimited: true,
    };
  }

  const def = getPlanDefinition(userPlan.plan);

  if (userPlan.plan === 'business' && !userPlan.businessActive) {
    return {
      allowed: false,
      reason: 'Piano Business in arrivo — contattaci per l\'attivazione',
      code: 'BUSINESS_NOT_ACTIVE',
    };
  }

  if (!def.aiEnabled && userPlan.plan !== 'trial' && userPlan.plan !== 'premium'
    && !(userPlan.plan === 'business' && userPlan.businessActive)) {
    return { allowed: false, reason: 'AI non inclusa nel piano attuale', code: 'PLAN_AI_DISABLED' };
  }

  const remaining = computeCreditsRemaining(userPlan);
  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `Limite AI raggiunto (${userPlan.aiCreditsLimit})`,
      code: 'AI_CREDITS_EXHAUSTED',
      creditsUsed: userPlan.aiCreditsUsedThisMonth,
      creditsLimit: userPlan.aiCreditsLimit,
    };
  }

  return {
    allowed: true,
    creditsUsed: userPlan.aiCreditsUsedThisMonth,
    creditsLimit: userPlan.aiCreditsLimit,
    remaining,
  };
}

/**
 * @param {import('./planService.js').UserPlanRecord} userPlan
 */
export function isPremiumPlan(userPlan) {
  if (!userPlan) return false;
  if (isAdmin(userPlan)) return true;
  if (userPlan.plan === 'trial') return true;
  if (userPlan.plan === 'premium') return true;
  if (userPlan.plan === 'business' && userPlan.businessActive) return true;
  return false;
}

/**
 * Creative Studio PRO — premium, trial legacy, crediti benvenuto, admin.
 * @param {import('./planService.js').UserPlanRecord} userPlan
 */
export function canUseCreativeStudio(userPlan) {
  if (!userPlan) {
    return { allowed: false, reason: 'Utente non trovato', code: 'USER_NOT_FOUND' };
  }

  if (hasUnlimitedCredits(userPlan)) {
    return {
      allowed: true,
      creditsUsed: userPlan.aiCreditsUsedThisMonth,
      creditsLimit: null,
      remaining: null,
      unlimited: true,
    };
  }

  if (userPlan.plan === 'free') {
    const welcomeRemaining = getWelcomeProRemaining(userPlan);
    if (welcomeRemaining > 0) {
      return {
        allowed: true,
        usingWelcomeCredits: true,
        welcomeProCreditsRemaining: welcomeRemaining,
        creditsUsed: userPlan.aiCreditsUsedThisMonth,
        creditsLimit: userPlan.aiCreditsLimit,
        remaining: computeCreditsRemaining(userPlan),
      };
    }
    return {
      allowed: false,
      reason: 'Creative Studio PRO richiede NovaPromo PRO o crediti benvenuto esauriti',
      code: 'CREATIVE_STUDIO_PREMIUM_ONLY',
      welcomeProCreditsRemaining: 0,
    };
  }

  if (!isPremiumPlan(userPlan)) {
    return {
      allowed: false,
      reason: 'Creative Studio PRO è disponibile solo con NovaPromo PRO',
      code: 'CREATIVE_STUDIO_PREMIUM_ONLY',
    };
  }

  if (userPlan.plan === 'business' && !userPlan.businessActive) {
    return {
      allowed: false,
      reason: 'Piano Business in arrivo — contattaci per l\'attivazione',
      code: 'BUSINESS_NOT_ACTIVE',
    };
  }

  const remaining = computeCreditsRemaining(userPlan);
  if (remaining <= 0) {
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
    remaining,
  };
}

/**
 * Rigenerazione immagine — solo PRO (non crediti benvenuto).
 * @param {import('./planService.js').UserPlanRecord} userPlan
 */
export function canRegenerateCreativeImage(userPlan) {
  if (!userPlan) {
    return { allowed: false, reason: 'Utente non trovato', code: 'USER_NOT_FOUND' };
  }
  if (hasUnlimitedCredits(userPlan) || isPremiumPlan(userPlan)) {
    return canUseCreativeStudio(userPlan);
  }
  return {
    allowed: false,
    reason: 'Rigenera immagine disponibile solo con NovaPromo PRO',
    code: 'CREATIVE_STUDIO_PREMIUM_ONLY',
    welcomeProCreditsRemaining: getWelcomeProRemaining(userPlan),
  };
}
