/**
 * StyleEngine — selects a director style from the Creative Brief (never random).
 */

import { DIRECTOR_STYLES } from './constants.js';

const STYLE_MAP = {
  modern_tech: {
    id: 'modern_tech',
    label: 'Modern Tech',
    palette: ['#0B1020', '#6366F1', '#F8FAFC'],
    composition: 'precise product/tech framing, clean futuristic calm',
    typography: 'modern geometric sans, confident hierarchy',
    lighting: 'crisp key light with cool fill, subtle screen glow',
    depth: 'medium depth, layered tech atmosphere',
    graphics: 'abstract mesh fields, no fake UI text',
    photographyRef: 'modern SaaS / Stripe-grade tech photography',
    camera: '50mm prime, full-frame',
    materials: 'matte aluminum, glass, soft fabric',
  },
  startup: {
    id: 'startup',
    label: 'Startup',
    palette: ['#0F172A', '#6366F1', '#F8FAFC'],
    composition: 'dynamic optimistic energy, product + maker context',
    typography: 'friendly geometric sans',
    lighting: 'bright daylight, optimistic',
    depth: 'workspace depth with soft bokeh',
    graphics: 'clean shapes, subtle gradients',
    photographyRef: 'YC / startup brand photography',
    camera: '35mm, full-frame',
    materials: 'desk wood, laptop, paper, plant',
  },
  premium: {
    id: 'premium',
    label: 'Premium',
    palette: ['#0A0A0F', '#7C3AED', '#F97316'],
    composition: 'dark canvas, luminous premium subject',
    typography: 'tech display, high contrast',
    lighting: 'controlled accent + soft key',
    depth: 'cinematic selective focus',
    graphics: 'subtle glow, no plastic CGI',
    photographyRef: 'premium dark campaign',
    camera: '85mm prime',
    materials: 'velvet dark, brushed metal accents',
  },
  editorial: {
    id: 'editorial',
    label: 'Editorial',
    palette: ['#111111', '#F4F0E8', '#8B1E1E'],
    composition: 'asymmetric magazine crop, strong leading lines',
    typography: 'serif display + clean sans body',
    lighting: 'natural window light with editorial contrast',
    depth: 'layered foreground / midground / background',
    graphics: 'subtle rules, pull-quote energy without busy overlays',
    photographyRef: 'high-end editorial',
    camera: '85mm or 50mm',
    materials: 'paper texture, fabric, natural skin/surfaces',
  },
  luxury: {
    id: 'luxury',
    label: 'Luxury',
    palette: ['#0B0B0B', '#C9A96E', '#F7F3EA'],
    composition: 'sparse prestigious framing, object as jewel',
    typography: 'elegant serif, restrained letter-spacing',
    lighting: 'dramatic chiaroscuro, specular highlights',
    depth: 'velvet darkness with selective focus',
    graphics: 'thin gold accents only',
    photographyRef: 'luxury fashion campaign',
    camera: '85–100mm',
    materials: 'silk, gold, marble, glass',
  },
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    palette: ['#FFFFFF', '#111111', '#E5E5E5'],
    composition: 'extreme negative space, single subject',
    typography: 'thin weight sans',
    lighting: 'flat soft light',
    depth: 'almost graphic flatness with slight shadow',
    graphics: 'almost none',
    photographyRef: 'Japanese minimal product photography',
    camera: '50mm',
    materials: 'matte ceramic, paper, clean surfaces',
  },
  dark: {
    id: 'dark',
    label: 'Dark',
    palette: ['#050505', '#A78BFA', '#F8FAFC'],
    composition: 'low-key drama, subject emerges from black',
    typography: 'high-contrast sans',
    lighting: 'rim + soft key in darkness',
    depth: 'deep blacks with focused subject',
    graphics: 'minimal neon accents',
    photographyRef: 'dark cinematic product still',
    camera: '50–85mm',
    materials: 'black matte, brushed steel',
  },
  corporate: {
    id: 'corporate',
    label: 'Corporate',
    palette: ['#0A2540', '#FFFFFF', '#00D4FF'],
    composition: 'structured trustworthy balance',
    typography: 'neutral professional sans',
    lighting: 'even clear credible light',
    depth: 'moderate architecture/people depth',
    graphics: 'clean restrained shapes',
    photographyRef: 'enterprise brand photography',
    camera: '35–50mm',
    materials: 'glass, concrete, fabric suits',
  },
  product_launch: {
    id: 'product_launch',
    label: 'Product Launch',
    palette: ['#000000', '#FFFFFF', '#FF6B00'],
    composition: 'hero product center stage, announcement energy',
    typography: 'bold launch hierarchy',
    lighting: 'spotlight key + soft fill',
    depth: 'stage-like subject isolation',
    graphics: 'motion hint without chaos',
    photographyRef: 'product launch key visual',
    camera: '50–85mm',
    materials: 'product surfaces, studio seamless',
  },
  apple_inspired: {
    id: 'apple_inspired',
    label: 'Apple Inspired',
    palette: ['#F5F5F7', '#1D1D1F', '#0071E3'],
    composition: 'centered hero, vast negative space, symmetrical balance',
    typography: 'SF Pro-like clean sans, sparse hierarchy',
    lighting: 'soft diffused studio light, gentle rim',
    depth: 'shallow DoF, subject isolation',
    graphics: 'no clutter, one focal object',
    photographyRef: 'Apple product keynote photography',
    camera: '85mm or 50mm prime',
    materials: 'anodized aluminum, glass, soft white infinity',
  },
  canva_inspired: {
    id: 'canva_inspired',
    label: 'Canva Inspired',
    palette: ['#7B61FF', '#FFFFFF', '#00C4B4'],
    composition: 'friendly social layout zones, clear title/visual split',
    typography: 'rounded modern sans, playful hierarchy',
    lighting: 'bright even inviting',
    depth: 'soft photography-friendly flatness',
    graphics: 'clean shapes, approachable composition',
    photographyRef: 'Canva-ready social creative',
    camera: '35–50mm',
    materials: 'paper, props, bright surfaces',
  },
  notion_inspired: {
    id: 'notion_inspired',
    label: 'Notion Inspired',
    palette: ['#FFFFFF', '#37352F', '#2EAADC'],
    composition: 'calm workspace still life, tidy desk geometry',
    typography: 'neutral sans, documentation clarity',
    lighting: 'soft daylight over desk',
    depth: 'gentle desk depth',
    graphics: 'notebook/laptop props — no fake UI text',
    photographyRef: 'Notion aesthetic workspace',
    camera: '35mm',
    materials: 'paper, wood desk, ceramic mug',
  },
};

/**
 * Select style deterministically from Creative Brief.
 */
export function selectStyleFromBrief(brief) {
  const scores = Object.fromEntries(DIRECTOR_STYLES.map((id) => [id, 0]));

  const sector = String(brief.brand?.sector || '').toLowerCase();
  const objective = String(brief.objective || '').toLowerCase();
  const idea = String(brief.idea || '').toLowerCase();
  const tones = (brief.toneOfVoice || []).map((t) => String(t).toLowerCase());
  const graphic = (brief.brand?.graphicStyles || []).map((g) => String(g).toLowerCase());
  const hint = String(brief.userStyleHint || '').toLowerCase();

  // Graphic styles from Brand Intelligence
  if (graphic.includes('luxury')) scores.luxury += 5;
  if (graphic.includes('minimal')) scores.minimal += 5;
  if (graphic.includes('corporate')) scores.corporate += 5;
  if (graphic.includes('tech') || graphic.includes('premium')) scores.modern_tech += 3;
  if (graphic.includes('creative')) scores.editorial += 3;
  if (graphic.includes('premium')) scores.premium += 4;

  // Sector
  if (/saas|software|ai|tech|digital/.test(sector)) {
    scores.modern_tech += 4;
    scores.startup += 2;
    scores.notion_inspired += 1;
  }
  if (/fashion|beauty|gioiell/.test(sector)) scores.luxury += 4;
  if (/finance|banca|assicur|legal/.test(sector)) scores.corporate += 4;
  if (/media|editoria|magazine/.test(sector)) scores.editorial += 4;
  if (/design|creative|agenzia/.test(sector)) {
    scores.canva_inspired += 2;
    scores.editorial += 2;
  }

  // Objective
  if (/launch|lancio|product_launch|release/.test(objective) || /lancio|launch|nuovo prodotto/.test(idea)) {
    scores.product_launch += 6;
    scores.apple_inspired += 2;
  }
  if (/vendite|lead|demo/.test(objective)) scores.startup += 2;
  if (/brand_awareness|community/.test(objective)) scores.premium += 2;

  // Tone
  if (tones.includes('elegante')) {
    scores.luxury += 3;
    scores.premium += 2;
  }
  if (tones.includes('minimal')) scores.minimal += 4;
  if (tones.includes('corporate') || tones.includes('professionale')) scores.corporate += 2;
  if (tones.includes('tecnico')) scores.modern_tech += 3;
  if (tones.includes('amichevole')) scores.canva_inspired += 3;
  if (tones.includes('ispirazionale')) scores.editorial += 2;

  // User legacy style hint from Creative Studio
  if (hint === 'premium') scores.premium += 4;
  if (hint === 'minimal') scores.minimal += 4;
  if (hint === 'tech') {
    scores.modern_tech += 4;
    scores.dark += 1;
  }
  if (hint === 'cinematic') {
    scores.dark += 3;
    scores.premium += 2;
  }

  // Palette darkness hint
  const darkPalette = (brief.palette || []).some((c) => isDarkHex(c));
  if (darkPalette) {
    scores.dark += 2;
    scores.premium += 1;
  }

  // Default soft preference for Apple if product-focused minimal brand
  if (/product|app|device/.test(idea) && scores.minimal >= 2) {
    scores.apple_inspired += 2;
  }

  let best = 'modern_tech';
  let bestScore = -1;
  for (const id of DIRECTOR_STYLES) {
    if (scores[id] > bestScore) {
      bestScore = scores[id];
      best = id;
    }
  }

  return resolveStyle(best, { palette: brief.palette, rationaleScores: scores });
}

/**
 * Resolve full style package.
 */
export function resolveStyle(styleId, brandHints = {}) {
  const id = DIRECTOR_STYLES.includes(styleId) ? styleId : mapLegacyConcept(styleId);
  const base = STYLE_MAP[id] || STYLE_MAP.modern_tech;
  const brandPalette = Array.isArray(brandHints.palette) ? brandHints.palette.filter(Boolean) : [];

  return {
    ...base,
    id: base.id,
    conceptId: base.id, // backward compat with older assembler fields
    palette: brandPalette.length ? mergePalette(brandPalette, base.palette) : [...base.palette],
    brandGraphicStyles: brandHints.graphicStyles || [],
    selectionScores: brandHints.rationaleScores || null,
  };
}

/** @deprecated — use selectStyleFromBrief */
export function suggestConceptFromHints({ style, graphicStyles = [], sector = '' } = {}) {
  const briefLike = {
    userStyleHint: style,
    brand: { graphicStyles, sector },
    toneOfVoice: [],
    palette: [],
    objective: '',
    idea: '',
  };
  return selectStyleFromBrief(briefLike).id;
}

export function listConcepts() {
  return DIRECTOR_STYLES.map((id) => ({
    id,
    label: STYLE_MAP[id]?.label || id,
  }));
}

export function listStyles() {
  return listConcepts();
}

function mapLegacyConcept(id) {
  const map = {
    apple_style: 'apple_inspired',
    dark_premium: 'premium',
    canva_style: 'canva_inspired',
    notion_style: 'notion_inspired',
    stripe_style: 'modern_tech',
    tech_workspace: 'modern_tech',
    hero_shot: 'product_launch',
    split_layout: 'startup',
    magazine: 'editorial',
    modern_ui: 'modern_tech',
    glassmorphism: 'modern_tech',
    soft_minimal: 'minimal',
    brand_photography: 'apple_inspired',
    lifestyle: 'canva_inspired',
    fashion: 'luxury',
  };
  return map[id] || 'modern_tech';
}

function mergePalette(brand, style) {
  const merged = [...brand];
  for (const c of style) {
    if (merged.length >= 5) break;
    if (!merged.some((x) => String(x).toLowerCase() === String(c).toLowerCase())) merged.push(c);
  }
  return merged;
}

function isDarkHex(color) {
  const hex = String(color || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 80;
}
