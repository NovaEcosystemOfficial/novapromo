/**
 * StyleEngine — maps visual concepts to palette, composition, type, light, depth.
 */

import { VISUAL_CONCEPTS } from './constants.js';

const STYLE_MAP = {
  apple_style: {
    label: 'Apple Style',
    palette: ['#F5F5F7', '#1D1D1F', '#0071E3'],
    composition: 'centered hero product, vast negative space, symmetrical balance',
    typography: 'SF Pro-like clean sans, sparse hierarchy, large title',
    lighting: 'soft diffused studio light, gentle rim, no harsh shadows',
    depth: 'shallow depth of field, subject isolation',
    graphics: 'minimal UI chrome, no clutter, one focal object',
    photographyRef: 'Apple product keynote photography',
  },
  editorial: {
    label: 'Editorial',
    palette: ['#111111', '#F4F0E8', '#8B1E1E'],
    composition: 'asymmetric magazine crop, strong leading lines',
    typography: 'serif display + clean sans body',
    lighting: 'natural window light with editorial contrast',
    depth: 'layered foreground / midground / background',
    graphics: 'subtle rules, pull-quote energy without busy overlays',
    photographyRef: 'Vogue / high-end editorial',
  },
  luxury: {
    label: 'Luxury',
    palette: ['#0B0B0B', '#C9A96E', '#F7F3EA'],
    composition: 'sparse, prestigious framing, object as jewel',
    typography: 'elegant serif, restrained letter-spacing',
    lighting: 'dramatic chiaroscuro, specular highlights on materials',
    depth: 'velvet darkness with selective focus',
    graphics: 'thin gold accents, no busy patterns',
    photographyRef: 'luxury fashion campaign',
  },
  startup: {
    label: 'Startup',
    palette: ['#0F172A', '#6366F1', '#F8FAFC'],
    composition: 'dynamic diagonal energy, product + people context',
    typography: 'modern geometric sans, confident hierarchy',
    lighting: 'bright, optimistic, soft daylight',
    depth: 'medium depth, workspace context',
    graphics: 'subtle gradients, clean shapes',
    photographyRef: 'YC / modern SaaS brand photography',
  },
  corporate: {
    label: 'Corporate',
    palette: ['#0A2540', '#FFFFFF', '#00D4FF'],
    composition: 'structured grid, trustworthy balance',
    typography: 'neutral professional sans',
    lighting: 'even, clear, credible office light',
    depth: 'moderate, architecture and people',
    graphics: 'clean charts-of-feeling without fake UI data',
    photographyRef: 'enterprise brand photography',
  },
  minimal: {
    label: 'Minimal',
    palette: ['#FFFFFF', '#111111', '#E5E5E5'],
    composition: 'extreme negative space, single subject',
    typography: 'thin weight sans, tiny supporting text',
    lighting: 'flat soft light',
    depth: 'almost graphic flatness with slight shadow',
    graphics: 'almost none',
    photographyRef: 'Japanese minimal product photography',
  },
  lifestyle: {
    label: 'Lifestyle',
    palette: ['#F6EFE7', '#2C2C2C', '#D4A373'],
    composition: 'in-situ product use, candid framing',
    typography: 'friendly humanist sans',
    lighting: 'golden hour / warm ambient',
    depth: 'environmental bokeh',
    graphics: 'organic textures, soft overlays',
    photographyRef: 'lifestyle brand campaign',
  },
  fashion: {
    label: 'Fashion',
    palette: ['#111111', '#FFFFFF', '#FF4D6D'],
    composition: 'tall crop, bold pose energy (no deformed anatomy)',
    typography: 'bold condensed display',
    lighting: 'studio strobe with fashion edge',
    depth: 'strong subject separation',
    graphics: 'graphic blocks, runway attitude',
    photographyRef: 'fashion lookbook',
  },
  dark_premium: {
    label: 'Dark Premium',
    palette: ['#0A0A0F', '#7C3AED', '#F97316'],
    composition: 'dark canvas, luminous accent subject',
    typography: 'tech display, high contrast',
    lighting: 'controlled neon accent + soft key',
    depth: 'cinematic fog / volumetric subtlety',
    graphics: 'subtle glow, no plastic CGI',
    photographyRef: 'premium tech dark campaign',
  },
  canva_style: {
    label: 'Canva Style',
    palette: ['#7B61FF', '#FFFFFF', '#00C4B4'],
    composition: 'friendly social layout, clear zones for title / visual',
    typography: 'rounded modern sans, playful hierarchy',
    lighting: 'bright, even, inviting',
    depth: 'flat-to-soft illustration-friendly photography',
    graphics: 'clean shapes, approachable composition',
    photographyRef: 'Canva-ready social creative',
  },
  notion_style: {
    label: 'Notion Style',
    palette: ['#FFFFFF', '#37352F', '#2EAADC'],
    composition: 'calm workspace still life, tidy desk geometry',
    typography: 'neutral sans, documentation clarity',
    lighting: 'soft daylight over desk',
    depth: 'gentle desk depth',
    graphics: 'paper, notebook, laptop as props — no fake UI text',
    photographyRef: 'Notion aesthetic workspace',
  },
  stripe_style: {
    label: 'Stripe Style',
    palette: ['#0A2540', '#635BFF', '#FFFFFF'],
    composition: 'precise product/UI-feeling without invented screens',
    typography: 'Inter-like precision sans',
    lighting: 'crisp, modern, high clarity',
    depth: 'clean gradients as atmosphere not CGI plastic',
    graphics: 'abstract mesh / gradient fields, professional restraint',
    photographyRef: 'Stripe brand system aesthetic',
  },
  tech_workspace: {
    label: 'Tech Workspace',
    palette: ['#111827', '#60A5FA', '#F3F4F6'],
    composition: 'laptop, tools, thoughtful maker environment',
    typography: 'modern mono accents + sans',
    lighting: 'monitor glow balanced with ambient',
    depth: 'desk layers with soft bokeh',
    graphics: 'cables/tools as texture, no fake code screens',
    photographyRef: 'developer workspace photography',
  },
  product_launch: {
    label: 'Product Launch',
    palette: ['#000000', '#FFFFFF', '#FF6B00'],
    composition: 'hero product center stage, announcement energy',
    typography: 'bold launch title hierarchy',
    lighting: 'spotlight key + soft fill',
    depth: 'stage-like subject isolation',
    graphics: 'motion blur hints without chaos',
    photographyRef: 'product launch key visual',
  },
  hero_shot: {
    label: 'Hero Shot',
    palette: ['#0F0F0F', '#E8E8E8', '#3B82F6'],
    composition: 'single dominant hero subject filling frame intent',
    typography: 'secondary — visual first',
    lighting: 'cinematic key light',
    depth: 'very shallow DoF',
    graphics: 'none competing with hero',
    photographyRef: 'campaign hero still',
  },
  split_layout: {
    label: 'Split Layout',
    palette: ['#FFFFFF', '#111111', '#2563EB'],
    composition: '50/50 photo vs text zone planning',
    typography: 'clear left/right hierarchy',
    lighting: 'matched exposure across split',
    depth: 'photo side depth, text side flat',
    graphics: 'hard or soft divider',
    photographyRef: 'split social ad',
  },
  magazine: {
    label: 'Magazine',
    palette: ['#F7F2EA', '#1A1A1A', '#B91C1C'],
    composition: 'cover-like hierarchy, masthead space reserved',
    typography: 'editorial masthead + deck',
    lighting: 'cover-worthy portrait/product light',
    depth: 'print-like tonal range',
    graphics: 'subtle cover lines',
    photographyRef: 'magazine cover',
  },
  modern_ui: {
    label: 'Modern UI',
    palette: ['#0B1020', '#8B5CF6', '#F8FAFC'],
    composition: 'product-in-context, abstract interface vibe without fake text',
    typography: 'UI sans clarity',
    lighting: 'glass and screen reflections careful',
    depth: 'layered panels as shapes only',
    graphics: 'blurred panels, no readable invented UI copy',
    photographyRef: 'modern product UI campaign',
  },
  glassmorphism: {
    label: 'Glassmorphism',
    palette: ['#E0E7FF', '#FFFFFF', '#6366F1'],
    composition: 'frosted glass planes over soft gradient',
    typography: 'light sans on glass cards',
    lighting: 'translucent refraction, soft specular',
    depth: 'layered frosted planes',
    graphics: 'blur, translucency, thin borders',
    photographyRef: 'glassmorphic brand visual',
  },
  soft_minimal: {
    label: 'Soft Minimal',
    palette: ['#FAF7F2', '#6B7280', '#A78BFA'],
    composition: 'airy, pastel calm, gentle subject',
    typography: 'soft rounded sans',
    lighting: 'diffused pastel light',
    depth: 'feather-soft shadows',
    graphics: 'organic soft shapes',
    photographyRef: 'soft lifestyle minimal',
  },
  brand_photography: {
    label: 'Brand Photography',
    palette: ['#F5F5F5', '#1A1A1A', '#4B5563'],
    composition: 'real photography direction — Apple / Nike / Adobe / Canva / Samsung / Notion / Figma level',
    typography: 'secondary to photographic truth',
    lighting: 'professional studio or location lighting, real physics',
    depth: 'true optical depth of field, real lens character',
    graphics: 'none that scream AI — no CGI plastic, no cartoon',
    photographyRef: 'professional brand photoshoot (not AI art)',
  },
};

/**
 * Resolve style package for a concept id.
 * @param {string} conceptId
 * @param {{ palette?: string[], graphicStyles?: string[] }} brandHints
 */
export function resolveStyle(conceptId, brandHints = {}) {
  const id = VISUAL_CONCEPTS.includes(conceptId) ? conceptId : 'dark_premium';
  const base = STYLE_MAP[id] || STYLE_MAP.dark_premium;
  const brandPalette = Array.isArray(brandHints.palette) ? brandHints.palette.filter(Boolean) : [];

  return {
    conceptId: id,
    ...base,
    palette: brandPalette.length ? mergePalette(brandPalette, base.palette) : base.palette,
    brandGraphicStyles: brandHints.graphicStyles || [],
  };
}

/**
 * Heuristic concept suggestion from brand + user style preference.
 */
export function suggestConceptFromHints({ style, graphicStyles = [], sector = '' } = {}) {
  const gs = graphicStyles.map((s) => String(s).toLowerCase());
  if (gs.includes('luxury')) return 'luxury';
  if (gs.includes('minimal')) return 'minimal';
  if (gs.includes('corporate')) return 'corporate';
  if (gs.includes('tech') || /saas|software|tech|ai/i.test(sector)) return 'stripe_style';
  if (gs.includes('creative')) return 'editorial';

  const map = {
    premium: 'dark_premium',
    minimal: 'soft_minimal',
    tech: 'tech_workspace',
    cinematic: 'hero_shot',
  };
  return map[style] || 'brand_photography';
}

function mergePalette(brand, style) {
  const merged = [...brand];
  for (const c of style) {
    if (merged.length >= 5) break;
    if (!merged.some((x) => x.toLowerCase() === c.toLowerCase())) merged.push(c);
  }
  return merged;
}

export function listConcepts() {
  return VISUAL_CONCEPTS.map((id) => ({
    id,
    label: STYLE_MAP[id]?.label || id,
  }));
}
