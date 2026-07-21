/**
 * Nova Creative Engine V2 — shared constants & future capability stubs.
 * Present modules may improve independently without breaking the pipeline.
 */

export const ENGINE_ID = 'creative-engine-v2';
export const ENGINE_LABEL = 'Nova Creative Engine V2';
export const ENGINE_VERSION = '2.0.0-beta';

/** Visual concepts the Creative Director may choose autonomously. */
export const VISUAL_CONCEPTS = [
  'apple_style',
  'editorial',
  'luxury',
  'startup',
  'corporate',
  'minimal',
  'lifestyle',
  'fashion',
  'dark_premium',
  'canva_style',
  'notion_style',
  'stripe_style',
  'tech_workspace',
  'product_launch',
  'hero_shot',
  'split_layout',
  'magazine',
  'modern_ui',
  'glassmorphism',
  'soft_minimal',
  'brand_photography',
];

export const LAYOUT_TYPES = [
  'hero_stack',
  'split',
  'magazine',
  'apple_keynote',
  'canva_social',
  'product_hero',
  'editorial_column',
  'story_vertical',
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
 * Future capabilities — reserved hooks only (not implemented yet).
 * Creative Engine V2 is prepared so these can plug in without redesign.
 */
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

export const QUALITY_MAX_REGENERATIONS = 1;
