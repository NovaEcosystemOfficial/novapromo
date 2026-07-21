/**
 * Nova Creative Engine V2 — constants for director-led creative process.
 */

export const ENGINE_ID = 'creative-engine-v2';
export const ENGINE_LABEL = 'Nova Creative Engine V2';
export const ENGINE_VERSION = '2.1.0-beta';

/**
 * Director styles — chosen from Creative Brief (not random).
 */
export const DIRECTOR_STYLES = [
  'modern_tech',
  'startup',
  'premium',
  'editorial',
  'luxury',
  'minimal',
  'dark',
  'corporate',
  'product_launch',
  'apple_inspired',
  'canva_inspired',
  'notion_inspired',
];

/** @deprecated alias — kept for older concept ids mapped into DIRECTOR_STYLES */
export const VISUAL_CONCEPTS = DIRECTOR_STYLES;

/**
 * Layouts planned before image generation.
 */
export const LAYOUT_TYPES = [
  'hero',
  'split',
  'magazine',
  'centered',
  'grid',
  'floating_card',
  'glass',
  'minimal',
  'editorial',
];

export const PLATFORM_TEMPLATES = [
  'instagram_feed',
  'instagram_carousel',
  'instagram_story',
  'facebook',
  'linkedin',
  'tiktok_cover',
];

/**
 * Future output types — reserved hooks (not implemented yet).
 */
export const FUTURE_OUTPUT_TYPES = Object.freeze({
  image: { id: 'image', status: 'active', description: 'Singola immagine social' },
  carousel: { id: 'carousel', status: 'planned', description: 'Carosello multi-slide' },
  story: { id: 'story', status: 'planned', description: 'Story 9:16 dedicata' },
  reelCover: { id: 'reel_cover', status: 'planned', description: 'Cover reel' },
  productMockup: { id: 'product_mockup', status: 'planned', description: 'Mockup prodotto' },
});

export const FUTURE_CAPABILITIES = Object.freeze({
  videoAi: { id: 'video_ai', status: 'planned', description: 'Generazione video AI' },
  reelAi: { id: 'reel_ai', status: 'planned', description: 'Reel AI automatici' },
  voiceOver: { id: 'voice_over', status: 'planned', description: 'Voice over sintetico' },
  avatar: { id: 'avatar', status: 'planned', description: 'Avatar brand parlanti' },
  productMockup: { id: 'product_mockup', status: 'planned', description: 'Mockup prodotto' },
  brandKit: { id: 'brand_kit', status: 'planned', description: 'Brand kit unificato' },
  logoUpload: { id: 'logo_upload', status: 'planned', description: 'Upload logo ufficiale' },
  colorAnalysis: { id: 'color_analysis', status: 'planned', description: 'Analisi automatica colori' },
  fontAnalysis: { id: 'font_analysis', status: 'planned', description: 'Analisi font brand' },
  websiteAnalysis: { id: 'website_analysis', status: 'planned', description: 'Analisi sito web' },
  socialAnalysis: { id: 'social_analysis', status: 'planned', description: 'Analisi social esistenti' },
  ...FUTURE_OUTPUT_TYPES,
});

export const NEGATIVE_PROMPT_CORE = [
  'deformed hands',
  'extra fingers',
  'mutated limbs',
  'unreadable text',
  'gibberish typography',
  'invented logos',
  'fake UI screens',
  'plastic skin',
  'cartoon',
  'anime',
  'CGI render look',
  'low quality',
  'blurry',
  'watermark',
  'stock photo watermark',
  'oversaturated neon glow',
  'uncanny face',
  'asymmetrical eyes',
].join(', ');

/** Configurable quality threshold (0–100). Below → prepare auto-regeneration. */
export const QUALITY_SCORE_THRESHOLD = Number(process.env.CREATIVE_V2_QUALITY_THRESHOLD || 72);

export const QUALITY_MAX_REGENERATIONS = Number(process.env.CREATIVE_V2_QUALITY_MAX_REGEN || 1);

export const QUALITY_DIMENSIONS = [
  'brandCoherence',
  'readability',
  'composition',
  'cleanliness',
  'realism',
  'color',
  'contrast',
  'balance',
];
