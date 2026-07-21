/**
 * LayoutPlanner — designs layout BEFORE image generation.
 * Choice is driven by Creative Brief + selected style (not random).
 */

import { LAYOUT_TYPES } from './constants.js';

const LAYOUTS = {
  hero: {
    id: 'hero',
    label: 'Hero',
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
    label: 'Split',
    zones: [
      { id: 'photo', role: 'visual half', weight: 0.5 },
      { id: 'copy', role: 'title + subtitle + CTA', weight: 0.5 },
    ],
    flow: 'horizontal split, balanced',
  },
  magazine: {
    id: 'magazine',
    label: 'Magazine',
    zones: [
      { id: 'masthead', role: 'brand / section', weight: 0.1 },
      { id: 'hero', role: 'cover image', weight: 0.6 },
      { id: 'headline', role: 'cover story title', weight: 0.2 },
      { id: 'deck', role: 'short deck', weight: 0.1 },
    ],
    flow: 'cover hierarchy',
  },
  centered: {
    id: 'centered',
    label: 'Centered',
    zones: [
      { id: 'product', role: 'centered hero subject', weight: 0.7 },
      { id: 'title', role: 'sparse title', weight: 0.2 },
      { id: 'sub', role: 'one calm line', weight: 0.1 },
    ],
    flow: 'center stage, massive negative space',
  },
  grid: {
    id: 'grid',
    label: 'Grid',
    zones: [
      { id: 'cell_a', role: 'primary visual cell', weight: 0.4 },
      { id: 'cell_b', role: 'secondary visual/text', weight: 0.3 },
      { id: 'cell_c', role: 'support / CTA', weight: 0.3 },
    ],
    flow: 'modular grid rhythm',
  },
  floating_card: {
    id: 'floating_card',
    label: 'Floating Card',
    zones: [
      { id: 'background', role: 'atmospheric field', weight: 0.45 },
      { id: 'card', role: 'floating content card', weight: 0.4 },
      { id: 'cta', role: 'CTA on card', weight: 0.15 },
    ],
    flow: 'elevated card over soft field',
  },
  glass: {
    id: 'glass',
    label: 'Glass',
    zones: [
      { id: 'backdrop', role: 'blurred premium backdrop', weight: 0.5 },
      { id: 'glass_panel', role: 'frosted content panel', weight: 0.35 },
      { id: 'accent', role: 'accent CTA', weight: 0.15 },
    ],
    flow: 'glassmorphism panels over depth',
  },
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    zones: [
      { id: 'subject', role: 'single subject', weight: 0.75 },
      { id: 'caption', role: 'tiny supporting line', weight: 0.25 },
    ],
    flow: 'extreme negative space',
  },
  editorial: {
    id: 'editorial',
    label: 'Editorial',
    zones: [
      { id: 'image', role: 'editorial photo', weight: 0.5 },
      { id: 'headline', role: 'serif headline', weight: 0.25 },
      { id: 'body', role: 'short body tease', weight: 0.25 },
    ],
    flow: 'magazine column rhythm',
  },
};

const STYLE_TO_LAYOUT = {
  modern_tech: 'split',
  startup: 'floating_card',
  premium: 'hero',
  editorial: 'editorial',
  luxury: 'centered',
  minimal: 'minimal',
  dark: 'hero',
  corporate: 'grid',
  product_launch: 'hero',
  apple_inspired: 'centered',
  canva_inspired: 'floating_card',
  notion_inspired: 'split',
};

/**
 * Plan and persist layout choice from brief + style.
 */
export function planLayout({ brief, styleId, format, templateId = null }) {
  let layoutId = STYLE_TO_LAYOUT[styleId] || 'hero';

  const objective = String(brief?.objective || '').toLowerCase();
  const platform = brief?.platform;

  if (format === 'story' || format === 'reel') {
    layoutId = 'hero';
  } else if (/editorial|magazine/.test(objective) || styleId === 'editorial') {
    layoutId = 'magazine';
  } else if (styleId === 'minimal' || styleId === 'apple_inspired') {
    layoutId = styleId === 'minimal' ? 'minimal' : 'centered';
  } else if (styleId === 'modern_tech' && platform === 'linkedin') {
    layoutId = 'split';
  } else if (styleId === 'canva_inspired') {
    layoutId = 'floating_card';
  } else if (styleId === 'premium' || styleId === 'dark') {
    layoutId = 'hero';
  }

  // Legacy conceptId support
  if (!LAYOUT_TYPES.includes(layoutId)) {
    layoutId = mapLegacyLayout(layoutId);
  }

  const layout = LAYOUTS[layoutId] || LAYOUTS.hero;

  return {
    ...layout,
    zones: layout.zones.map((z) => ({ ...z })),
    format,
    templateId,
    styleId,
    chosenAt: new Date().toISOString(),
    compositionBrief: [
      `Layout scelto: ${layout.label} (${layout.id})`,
      `Flow: ${layout.flow}`,
      `Zones: ${layout.zones.map((z) => `${z.id}(${z.role})`).join(' → ')}`,
      'Prefer photographic subject over dense typography in the image.',
      'Do not invent unreadable text or fake logos.',
    ].join('\n'),
  };
}

export function listLayouts() {
  return LAYOUT_TYPES.map((id) => ({
    id,
    label: LAYOUTS[id]?.label || id,
  }));
}

function mapLegacyLayout(id) {
  const map = {
    hero_stack: 'hero',
    apple_keynote: 'centered',
    canva_social: 'floating_card',
    product_hero: 'hero',
    editorial_column: 'editorial',
    story_vertical: 'hero',
    split_layout: 'split',
  };
  return map[id] || 'hero';
}
