export const PLAN_LABELS = {
  free: 'Free',
  premium: 'Premium',
  business: 'Business',
};

export const PLAN_COMPARISON = [
  {
    id: 'free',
    label: 'Free',
    price: '€0',
    aiCredits: 30,
    features: ['Dashboard e calendario', 'Pubblicazione Instagram/Facebook', 'AI limitata (30/mese)'],
  },
  {
    id: 'trial',
    label: 'Trial',
    price: '7 giorni',
    aiCredits: 100,
    features: ['Creative Studio PRO incluso', '100 crediti trial', 'Poi passa a Free'],
  },
  {
    id: 'premium',
    label: 'Premium',
    price: 'In arrivo',
    aiCredits: 300,
    features: ['AI Studio completo', 'Content pack e trasformazioni', '300 generazioni/mese', 'Brand memory'],
    highlighted: true,
  },
  {
    id: 'business',
    label: 'Business',
    price: 'In arrivo',
    aiCredits: 2000,
    features: ['Tutto Premium', '2000 generazioni/mese', 'Multi-brand (futuro)', 'Attivazione manuale'],
  },
];

export function getDemoBillingStatus() {
  return {
    plan: 'free',
    planLabel: 'Free',
    planDescription: 'Funzioni base, AI limitata',
    aiCreditsUsed: 0,
    aiCreditsLimit: 3,
    aiCreditsRemaining: 3,
    aiCreditsMonth: new Date().toISOString().slice(0, 7),
    isPremium: false,
    businessActive: false,
    aiConfigured: false,
    aiAvailable: false,
    aiLockReason: 'Backend non disponibile in demo',
    aiLockCode: 'DEMO_MODE',
    paymentsEnabled: false,
    upgradeNote: 'Collega il backend per testare AI Studio',
    plans: PLAN_COMPARISON.map((p) => ({
      id: p.id,
      label: p.label,
      aiCreditsLimit: p.aiCredits,
      aiEnabled: p.id !== 'business',
      description: p.features[0],
    })),
  };
}
