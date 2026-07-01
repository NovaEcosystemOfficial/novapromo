/** @typedef {'free' | 'trial' | 'premium' | 'business'} PlanId */

export const PLAN_IDS = ['free', 'trial', 'premium', 'business'];

export const PLAN_DEFINITIONS = {
  free: {
    id: 'free',
    label: 'Free',
    aiCreditsLimit: 30,
    aiEnabled: true,
    creativeStudio: false,
    description: 'Pubblicazione base, AI limitata',
  },
  trial: {
    id: 'trial',
    label: 'Trial',
    aiCreditsLimit: 100,
    aiEnabled: true,
    creativeStudio: true,
    description: '7 giorni — Creative Studio PRO incluso',
  },
  premium: {
    id: 'premium',
    label: 'Premium',
    aiCreditsLimit: 300,
    aiEnabled: true,
    creativeStudio: true,
    description: 'AI Studio completo + Creative Studio PRO',
  },
  business: {
    id: 'business',
    label: 'Business',
    aiCreditsLimit: 2000,
    aiEnabled: false,
    creativeStudio: true,
    description: 'Predisposto — attivazione manuale',
  },
};

export const DEFAULT_BRAND_ID = 'nova-ecosystem';

export function getPlanDefinition(planId) {
  return PLAN_DEFINITIONS[planId] || PLAN_DEFINITIONS.free;
}

export function currentCreditsMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function nextCreditsResetAt() {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + 1, 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}
