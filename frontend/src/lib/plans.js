export const PLAN_LABELS = {
  free: 'Free',
  premium: 'NovaPromo PRO',
  business: 'Business',
};

export const PREMIUM_PRICING = {
  monthly: {
    id: 'monthly',
    label: 'Mensile',
    price: '9,99 €',
    period: '/mese',
    note: 'Flessibile, disdici quando vuoi',
  },
  yearly: {
    id: 'yearly',
    label: 'Annuale',
    price: '99 €',
    period: '/anno',
    note: 'Risparmia ~17% rispetto al mensile',
    highlighted: true,
  },
};

export const PRO_BENEFITS = [
  {
    title: 'Creative Studio PRO',
    description: 'Pacchetti completi con caption, hashtag, CTA, script Reel e immagini AI.',
  },
  {
    title: 'Brand Intelligence',
    description: 'Memoria del brand, tono coerente e varianti multi-piattaforma.',
  },
  {
    title: 'Immagini AI',
    description: 'Generazione e rigenerazione immagini social pronte per Instagram e Facebook.',
  },
  {
    title: 'Pubblicazione social',
    description: 'Instagram e Facebook dal calendario, bozze e pubblicazione programmata.',
  },
  {
    title: 'Calendario e bozze',
    description: 'Pianifica campagne, salva bozze e pubblica da un unico hub.',
  },
  {
    title: 'In arrivo',
    description: 'Analytics avanzate e video AI — già predisposti nel piano PRO.',
  },
];

export const PLAN_COMPARISON = [
  {
    id: 'free',
    label: 'Free',
    price: '€0',
    aiCredits: 30,
    features: [
      'Dashboard e calendario',
      'Pubblicazione Instagram/Facebook',
      'AI limitata (30/mese)',
      '3 prove Creative Studio PRO (benvenuto)',
    ],
  },
  {
    id: 'premium',
    label: 'NovaPromo PRO',
    price: '9,99 €/mese',
    aiCredits: 300,
    features: [
      'Creative Studio PRO illimitato',
      '300 crediti AI / mese',
      'Immagini AI e rigenerazione',
      'Brand Intelligence',
      'Scheduling avanzato',
      'Analytics e video AI (in arrivo)',
    ],
    highlighted: true,
  },
];

export function getDemoBillingStatus() {
  return {
    plan: 'free',
    planLabel: 'Free',
    planDescription: 'Funzioni base, AI limitata',
    aiCreditsUsed: 0,
    aiCreditsLimit: 30,
    aiCreditsRemaining: 30,
    welcomeProCredits: 3,
    welcomeProCreditsTotal: 3,
    welcomeProCreditsUsed: 0,
    aiCreditsMonth: new Date().toISOString().slice(0, 7),
    isPremium: false,
    businessActive: false,
    aiConfigured: false,
    aiAvailable: false,
    aiLockReason: 'Backend non disponibile in demo',
    aiLockCode: 'DEMO_MODE',
    paymentsEnabled: true,
    paymentsMode: 'mock',
    mockCheckoutAvailable: true,
    testMode: true,
    stripeTestMode: false,
    stripeCustomerId: null,
    canManageSubscription: false,
    hasStripeCustomer: false,
    billingStatus: null,
    upgradeNote: 'Collega il backend per testare il flusso PRO',
    plans: PLAN_COMPARISON.map((p) => ({
      id: p.id,
      label: p.label,
      aiCreditsLimit: p.aiCredits,
      aiEnabled: true,
      description: p.features[0],
    })),
  };
}
