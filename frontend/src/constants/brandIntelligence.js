export const GRAPHIC_STYLES = [
  { id: 'minimal', label: 'Minimal' },
  { id: 'luxury', label: 'Luxury' },
  { id: 'tech', label: 'Tech' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'creative', label: 'Creative' },
  { id: 'premium', label: 'Premium' },
];

export const TONE_OF_VOICE_OPTIONS = [
  { id: 'professionale', label: 'Professionale' },
  { id: 'amichevole', label: 'Amichevole' },
  { id: 'tecnico', label: 'Tecnico' },
  { id: 'elegante', label: 'Elegante' },
  { id: 'ironico', label: 'Ironico' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'ispirazionale', label: 'Ispirazionale' },
  { id: 'vendita', label: 'Vendita' },
];

export const MARKETING_GOALS = [
  { id: 'vendite', label: 'Vendite' },
  { id: 'brand_awareness', label: 'Brand Awareness' },
  { id: 'community', label: 'Community' },
  { id: 'lead', label: 'Lead' },
  { id: 'traffico_sito', label: 'Traffico sito' },
  { id: 'download', label: 'Download' },
  { id: 'prenotazioni', label: 'Prenotazioni' },
];

export const CTA_PRESETS = [
  'Scopri di più',
  'Scarica ora',
  'Contattaci',
  'Richiedi demo',
  'Acquista',
  'Prenota',
];

export const LIBRARY_SECTIONS = [
  { id: 'logos', label: 'Logo', icon: '◆' },
  { id: 'logoVariants', label: 'Varianti logo', icon: '◇' },
  { id: 'fonts', label: 'Font', icon: 'Aa' },
  { id: 'colors', label: 'Colori', icon: '◉' },
  { id: 'photos', label: 'Foto', icon: '📷' },
  { id: 'videos', label: 'Video', icon: '🎬' },
  { id: 'templates', label: 'Template', icon: '▦' },
];

export const AUDIENCE_TYPES = [
  { id: 'b2b', label: 'B2B' },
  { id: 'b2c', label: 'B2C' },
  { id: 'both', label: 'B2B + B2C' },
];

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

export function createEmptyBrandProfile() {
  return {
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
  };
}
