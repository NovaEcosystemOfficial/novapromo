/**
 * LayoutPlanner — designs layout structure BEFORE image generation.
 */

import { LAYOUT_TYPES } from './constants.js';

const LAYOUTS = {
  hero_stack: {
    id: 'hero_stack',
    label: 'Hero grande → Titolo → Sottotitolo → CTA',
    zones: [
      { id: 'hero', role: 'dominant visual', weight: 0.55 },
      { id: 'title', role: 'primary headline', weight: 0.2 },
      { id: 'subtitle', role: 'supporting line', weight: 0.15 },
      { id: 'cta', role: 'call to action', weight: 0.1 },
    ],
    flow: 'vertical stack, top-heavy hero',
  },
  split: {
    id: 'split',
    label: 'Split — Foto | Testo',
    zones: [
      { id: 'photo', role: 'visual half', weight: 0.5 },
      { id: 'copy', role: 'title + subtitle + CTA', weight: 0.5 },
    ],
    flow: 'horizontal split, balanced',
  },
  magazine: {
    id: 'magazine',
    label: 'Magazine cover',
    zones: [
      { id: 'masthead', role: 'brand / section', weight: 0.1 },
      { id: 'hero', role: 'cover image', weight: 0.6 },
      { id: 'headline', role: 'cover story title', weight: 0.2 },
      { id: 'deck', role: 'short deck', weight: 0.1 },
    ],
    flow: 'cover hierarchy',
  },
  apple_keynote: {
    id: 'apple_keynote',
    label: 'Apple Keynote',
    zones: [
      { id: 'product', role: 'centered product hero', weight: 0.7 },
      { id: 'title', role: 'sparse title under/over', weight: 0.2 },
      { id: 'sub', role: 'one calm line', weight: 0.1 },
    ],
    flow: 'center stage, massive negative space',
  },
  canva_social: {
    id: 'canva_social',
    label: 'Canva Social',
    zones: [
      { id: 'visual', role: 'engaging visual block', weight: 0.45 },
      { id: 'headline', role: 'bold social headline', weight: 0.25 },
      { id: 'support', role: 'short support', weight: 0.15 },
      { id: 'cta', role: 'friendly CTA', weight: 0.15 },
    ],
    flow: 'friendly social template zones',
  },
  product_hero: {
    id: 'product_hero',
    label: 'Product Hero',
    zones: [
      { id: 'product', role: 'hero product', weight: 0.65 },
      { id: 'badge', role: 'optional launch cue', weight: 0.1 },
      { id: 'title', role: 'product name line', weight: 0.15 },
      { id: 'cta', role: 'CTA', weight: 0.1 },
    ],
    flow: 'product-first announcement',
  },
  editorial_column: {
    id: 'editorial_column',
    label: 'Editorial column',
    zones: [
      { id: 'image', role: 'editorial photo', weight: 0.5 },
      { id: 'headline', role: 'serif headline', weight: 0.25 },
      { id: 'body', role: 'short body tease', weight: 0.25 },
    ],
    flow: 'magazine column rhythm',
  },
  story_vertical: {
    id: 'story_vertical',
    label: 'Story vertical',
    zones: [
      { id: 'safe_top', role: 'avoid UI chrome', weight: 0.12 },
      { id: 'hero', role: 'vertical hero', weight: 0.55 },
      { id: 'copy', role: 'large short copy', weight: 0.2 },
      { id: 'cta', role: 'bottom CTA zone', weight: 0.13 },
    ],
    flow: '9:16 safe-zone aware',
  },
};

const CONCEPT_TO_LAYOUT = {
  apple_style: 'apple_keynote',
  editorial: 'editorial_column',
  luxury: 'hero_stack',
  startup: 'canva_social',
  corporate: 'split',
  minimal: 'apple_keynote',
  lifestyle: 'hero_stack',
  fashion: 'magazine',
  dark_premium: 'hero_stack',
  canva_style: 'canva_social',
  notion_style: 'split',
  stripe_style: 'split',
  tech_workspace: 'split',
  product_launch: 'product_hero',
  hero_shot: 'product_hero',
  split_layout: 'split',
  magazine: 'magazine',
  modern_ui: 'split',
  glassmorphism: 'canva_social',
  soft_minimal: 'apple_keynote',
  brand_photography: 'hero_stack',
};

/**
 * Plan layout from concept + format + template.
 */
export function planLayout({ conceptId, format, templateId }) {
  let layoutId = CONCEPT_TO_LAYOUT[conceptId] || 'hero_stack';

  if (format === 'story' || format === 'reel') {
    layoutId = 'story_vertical';
  } else if (conceptId === 'split_layout') {
    layoutId = 'split';
  } else if (templateId === 'instagram_carousel') {
    layoutId = 'canva_social';
  }

  if (!LAYOUT_TYPES.includes(layoutId)) layoutId = 'hero_stack';
  const layout = LAYOUTS[layoutId] || LAYOUTS.hero_stack;

  return {
    ...layout,
    zones: layout.zones.map((z) => ({ ...z })),
    format,
    templateId,
    compositionBrief: [
      `Layout: ${layout.label}`,
      `Flow: ${layout.flow}`,
      `Zones: ${layout.zones.map((z) => `${z.id}(${z.role})`).join(' → ')}`,
      'Do not invent unreadable text; prefer photographic subject over dense typography in the image.',
    ].join('\n'),
  };
}

export function listLayouts() {
  return LAYOUT_TYPES.map((id) => ({
    id,
    label: LAYOUTS[id]?.label || id,
  }));
}
