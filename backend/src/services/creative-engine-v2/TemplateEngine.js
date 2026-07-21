/**
 * TemplateEngine — platform-aware professional templates & best practices.
 */

import { PLATFORM_TEMPLATES } from './constants.js';

const TEMPLATES = {
  instagram_feed: {
    id: 'instagram_feed',
    label: 'Instagram Feed',
    platforms: ['instagram', 'multi'],
    formats: ['square', 'portrait'],
    bestPractices: [
      'Thumb-stopping first 0.5s visual hierarchy',
      'Safe margins ~5% from edges',
      'One clear message, not a brochure',
      'CTA readable in under 3 seconds',
    ],
    captionStyle: 'hook in first line, value, soft CTA, 8–15 hashtags',
    aspectNotes: '1:1 or 4:5 preferred for feed reach',
  },
  instagram_carousel: {
    id: 'instagram_carousel',
    label: 'Instagram Carousel',
    platforms: ['instagram', 'multi'],
    formats: ['square', 'portrait'],
    bestPractices: [
      'Slide 1 = curiosity hook',
      'Middle slides = one idea each',
      'Last slide = clear CTA',
      'Consistent visual system across slides',
    ],
    captionStyle: 'tease carousel value, invite swipe, CTA',
    aspectNotes: 'Consistent aspect across all slides',
  },
  instagram_story: {
    id: 'instagram_story',
    label: 'Instagram Story',
    platforms: ['instagram', 'multi'],
    formats: ['story', 'reel'],
    bestPractices: [
      'Vertical 9:16, keep text in center safe zone',
      'Avoid top/bottom UI chrome collision',
      'Large type, few words',
      'Strong CTA sticker energy (without fake stickers in image)',
    ],
    captionStyle: 'short stickers-friendly line + emoji sparingly',
    aspectNotes: '9:16 full-bleed',
  },
  facebook: {
    id: 'facebook',
    label: 'Facebook',
    platforms: ['facebook', 'multi'],
    formats: ['square', 'portrait'],
    bestPractices: [
      'Clear benefit-led visual',
      'Less hashtag density than Instagram',
      'Trust and clarity over hype',
      'Link-friendly CTA language',
    ],
    captionStyle: 'conversational, benefit first, 1–3 hashtags max',
    aspectNotes: '1:1 or 4:5 perform well in feed',
  },
  linkedin: {
    id: 'linkedin',
    label: 'LinkedIn',
    platforms: ['multi'],
    formats: ['square', 'portrait'],
    bestPractices: [
      'Professional credibility',
      'Thought-leadership framing',
      'Avoid gimmicky clickbait visuals',
      'Clean typography hierarchy',
    ],
    captionStyle: 'insightful opener, value paragraph, professional CTA',
    aspectNotes: 'Square or landscape-feeling compositions',
  },
  tiktok_cover: {
    id: 'tiktok_cover',
    label: 'TikTok Cover',
    platforms: ['instagram', 'multi'],
    formats: ['reel', 'story'],
    bestPractices: [
      'Bold readable cover title space',
      'High contrast subject',
      'Curiosity without clickbait spam',
      'Vertical composition first',
    ],
    captionStyle: 'hook line + trending-aware tags later',
    aspectNotes: '9:16 cover still',
  },
};

/**
 * Resolve best template for platform + format.
 */
export function resolveTemplate({ platform, format, contentType = null }) {
  if (contentType === 'carousel') return clone(TEMPLATES.instagram_carousel);
  if (format === 'story') return clone(TEMPLATES.instagram_story);
  if (format === 'reel') return clone(TEMPLATES.tiktok_cover);

  if (platform === 'facebook') return clone(TEMPLATES.facebook);
  if (platform === 'instagram') {
    return format === 'portrait' || format === 'square'
      ? clone(TEMPLATES.instagram_feed)
      : clone(TEMPLATES.instagram_story);
  }
  // multi
  if (format === 'story' || format === 'reel') return clone(TEMPLATES.instagram_story);
  return clone(TEMPLATES.instagram_feed);
}

export function listTemplates() {
  return PLATFORM_TEMPLATES.map((id) => ({
    id,
    label: TEMPLATES[id]?.label || id,
  }));
}

function clone(t) {
  return { ...t, bestPractices: [...t.bestPractices] };
}
