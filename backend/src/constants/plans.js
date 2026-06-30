/** @typedef {'free' | 'premium' | 'business'} PlanId */

export const PLAN_IDS = ['free', 'premium', 'business'];

export const PLAN_DEFINITIONS = {
  free: {
    id: 'free',
    label: 'Free',
    aiCreditsLimit: 3,
    aiEnabled: true,
    description: 'Funzioni base, AI limitata',
  },
  premium: {
    id: 'premium',
    label: 'Premium',
    aiCreditsLimit: 300,
    aiEnabled: true,
    description: 'AI Studio completo',
  },
  business: {
    id: 'business',
    label: 'Business',
    aiCreditsLimit: 2000,
    aiEnabled: false,
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
