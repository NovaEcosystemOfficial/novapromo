export const GRAPHIC_STYLES = [
  'minimal',
  'luxury',
  'tech',
  'corporate',
  'creative',
  'premium',
];

export const TONE_OF_VOICE_OPTIONS = [
  'professionale',
  'amichevole',
  'tecnico',
  'elegante',
  'ironico',
  'corporate',
  'minimal',
  'ispirazionale',
  'vendita',
];

export const MARKETING_GOALS = [
  'vendite',
  'brand_awareness',
  'community',
  'lead',
  'traffico_sito',
  'download',
  'prenotazioni',
];

export const CTA_PRESETS = [
  'Scopri di più',
  'Scarica ora',
  'Contattaci',
  'Richiedi demo',
  'Acquista',
  'Prenota',
];

export const LIBRARY_CATEGORIES = [
  'logos',
  'logoVariants',
  'fonts',
  'colors',
  'photos',
  'videos',
  'templates',
];

export const BRAND_TONE_TO_GENERATOR = {
  professionale: 'professionale',
  amichevole: 'motivazionale',
  tecnico: 'professionale',
  elegante: 'professionale',
  ironico: 'ironico',
  corporate: 'professionale',
  minimal: 'professionale',
  ispirazionale: 'motivazionale',
  vendita: 'hype',
};

export function createEmptyBrandProfile(ownerUid) {
  return {
    brandId: ownerUid,
    ownerUid,
    identity: {
      companyName: '',
      logoUrl: '',
      sector: '',
      website: '',
      email: '',
      phone: '',
      social: '',
      foundedYear: '',
      shortDescription: '',
      mission: '',
      vision: '',
      values: [],
    },
    brand: {
      primaryColors: [],
      secondaryColors: [],
      palette: [],
      fonts: [],
      graphicStyles: [],
    },
    target: {
      ageRange: '',
      profession: '',
      country: '',
      language: '',
      audienceType: '',
      interests: [],
      problems: [],
      goals: [],
    },
    toneOfVoice: [],
    marketingGoals: [],
    preferredCtas: [],
    words: {
      use: [],
      avoid: [],
      hashtags: [],
      emojis: [],
    },
    competitors: [],
    library: {
      logos: [],
      logoVariants: [],
      fonts: [],
      colors: [],
      photos: [],
      videos: [],
      templates: [],
    },
    completionPercent: 0,
    createdAt: null,
    updatedAt: null,
  };
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasItems(arr) {
  return Array.isArray(arr) && arr.length > 0;
}

export function calculateBrandCompletion(profile) {
  const checks = [
    hasText(profile.identity?.companyName),
    hasText(profile.identity?.sector),
    hasText(profile.identity?.shortDescription),
    hasText(profile.identity?.mission),
    hasItems(profile.brand?.primaryColors),
    hasItems(profile.brand?.graphicStyles),
    hasText(profile.target?.ageRange) || hasText(profile.target?.profession),
    hasText(profile.target?.country) || hasText(profile.target?.language),
    hasItems(profile.toneOfVoice),
    hasItems(profile.marketingGoals),
    hasItems(profile.preferredCtas),
    hasItems(profile.words?.hashtags) || hasItems(profile.words?.use),
    hasItems(profile.competitors),
    hasItems(profile.library?.logos) || hasItems(profile.library?.photos),
  ];

  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

export function normalizeBrandProfile(input, ownerUid) {
  const base = createEmptyBrandProfile(ownerUid);
  const merged = {
    ...base,
    ...input,
    brandId: ownerUid,
    ownerUid,
    identity: { ...base.identity, ...(input?.identity || {}) },
    brand: { ...base.brand, ...(input?.brand || {}) },
    target: { ...base.target, ...(input?.target || {}) },
    words: { ...base.words, ...(input?.words || {}) },
    library: { ...base.library, ...(input?.library || {}) },
    toneOfVoice: Array.isArray(input?.toneOfVoice) ? input.toneOfVoice : base.toneOfVoice,
    marketingGoals: Array.isArray(input?.marketingGoals) ? input.marketingGoals : base.marketingGoals,
    preferredCtas: Array.isArray(input?.preferredCtas) ? input.preferredCtas : base.preferredCtas,
    competitors: Array.isArray(input?.competitors) ? input.competitors : base.competitors,
  };

  merged.completionPercent = calculateBrandCompletion(merged);
  return merged;
}

export function resolveBrandToneForGenerator(toneOfVoice = []) {
  if (!toneOfVoice.length) return null;
  const primary = toneOfVoice[0];
  return BRAND_TONE_TO_GENERATOR[primary] || 'professionale';
}

export function buildBrandAiContext(profile) {
  if (!profile) return null;

  return {
    companyName: profile.identity?.companyName || '',
    sector: profile.identity?.sector || '',
    shortDescription: profile.identity?.shortDescription || '',
    mission: profile.identity?.mission || '',
    vision: profile.identity?.vision || '',
    values: profile.identity?.values || [],
    primaryColors: profile.brand?.primaryColors || [],
    graphicStyles: profile.brand?.graphicStyles || [],
    target: profile.target || {},
    toneOfVoice: profile.toneOfVoice || [],
    marketingGoals: profile.marketingGoals || [],
    preferredCtas: profile.preferredCtas || [],
    wordsToUse: profile.words?.use || [],
    wordsToAvoid: profile.words?.avoid || [],
    hashtags: profile.words?.hashtags || [],
    emojis: profile.words?.emojis || [],
    competitors: profile.competitors || [],
    generatorTone: resolveBrandToneForGenerator(profile.toneOfVoice),
  };
}
