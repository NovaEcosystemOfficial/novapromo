/**
 * PostAssembler — final deliverable is more than an image.
 * Returns image + caption + hashtags + CTA + alt + variants + story + reel cover + carousel.
 */

import { ENGINE_ID, ENGINE_LABEL, ENGINE_VERSION, FUTURE_CAPABILITIES, FUTURE_OUTPUT_TYPES } from './constants.js';
import { CREATIVE_FORMATS } from '../../constants/aiCredits.js';

/**
 * Assemble V1-compatible pack + V2 extensions.
 */
export function assemblePost({
  rawPack,
  params,
  brandAnalysis,
  director,
  layout,
  template,
  prompts,
  asset = null,
  quality = null,
  brief = null,
  report = null,
}) {
  const videoScript = rawPack.videoScript || {};
  const videoPrompt = rawPack.videoPrompt
    || videoScript.futureAiVideoPrompt
    || videoScript.script
    || '';

  const variantA = rawPack.variantA || {
    caption: rawPack.caption || '',
    cta: rawPack.cta || director.ctaStrategy,
  };
  const variantB = rawPack.variantB || {
    caption: rawPack.caption
      ? `${rawPack.caption}\n\n(${director.ctaStrategy})`
      : '',
    cta: brandAnalysis.preferredCtas?.[1] || director.ctaStrategy,
  };

  const carousel = Array.isArray(rawPack.carouselSlides)
    ? rawPack.carouselSlides
    : buildDefaultCarousel(rawPack, director);

  const pack = {
    caption: rawPack.caption || '',
    hashtags: rawPack.hashtags || (brandAnalysis.hashtags || []).join(' '),
    cta: rawPack.cta || director.ctaStrategy,
    imagePrompt: prompts.imagePrompt,
    videoPrompt,
    musicMood: rawPack.musicMood || videoScript.musicMood || '',
    visualStyle: rawPack.visualStyle || director.conceptLabel || params.style,
    socialFormat: rawPack.socialFormat || CREATIVE_FORMATS[params.format].label,
    platformVariants: {
      instagram_post: '',
      instagram_story: '',
      facebook_post: '',
      linkedin_post: '',
      tiktok_cover: '',
      ...(rawPack.platformVariants || {}),
    },
    videoScript: params.includeVideoPrompt ? {
      durationSeconds: videoScript.durationSeconds || 15,
      script: videoScript.script || '',
      scenes: Array.isArray(videoScript.scenes) ? videoScript.scenes : [],
      overlayTexts: videoScript.overlayTexts || [],
      cameraMovement: videoScript.cameraMovement || '',
      futureAiVideoPrompt: videoScript.futureAiVideoPrompt || videoPrompt,
    } : null,
    imageUrl: asset?.imageUrl || null,
    storagePath: asset?.storagePath || null,
    imageMimeType: asset?.imageMimeType || null,
    altText: rawPack.altText
      || `Creatività ${brandAnalysis.companyName}: ${String(rawPack.caption || params.idea).slice(0, 120)}`,
    variantA,
    variantB,
    story: {
      copy: rawPack.storyCopy || rawPack.platformVariants?.instagram_story || rawPack.caption || '',
      format: '9:16',
    },
    coverReel: {
      line: rawPack.reelCoverLine || director.ctaStrategy,
      format: '9:16',
    },
    carousel,
    creativeBrief: brief
      ? {
        projectName: brief.projectName,
        objective: brief.objective,
        platform: brief.platform,
        target: brief.target,
        toneOfVoice: brief.toneOfVoice,
        format: brief.format,
        brand: brief.brand?.name,
        palette: brief.palette,
        cta: brief.cta,
      }
      : null,
    engine: {
      id: ENGINE_ID,
      label: ENGINE_LABEL,
      version: ENGINE_VERSION,
      conceptId: director.conceptId,
      conceptLabel: director.conceptLabel,
      styleId: director.styleId || director.conceptId,
      rationale: director.rationale,
      layoutId: layout.id,
      layoutLabel: layout.label,
      templateId: template.id,
      templateLabel: template.label,
      photographyMode: Boolean(director.photographyMode),
      quality,
      qualityScore: quality?.score ?? null,
      report,
      future: FUTURE_CAPABILITIES,
      futureOutputs: FUTURE_OUTPUT_TYPES,
    },
  };

  return pack;
}

export function assembleRegenerateBase(input, params) {
  return {
    caption: input.caption || '',
    hashtags: input.hashtags || '',
    cta: input.cta || '',
    imagePrompt: params.imagePrompt,
    videoPrompt: input.videoPrompt || '',
    musicMood: input.musicMood || '',
    visualStyle: input.visualStyle || params.style,
    socialFormat: CREATIVE_FORMATS[params.format].label,
    platformVariants: input.platformVariants || {},
    videoScript: input.videoScript || null,
    altText: input.altText || '',
    variantA: input.variantA || null,
    variantB: input.variantB || null,
    storyCopy: input.story?.copy || input.storyCopy || '',
    reelCoverLine: input.coverReel?.line || input.reelCoverLine || '',
    carouselSlides: input.carousel || input.carouselSlides || [],
  };
}

function buildDefaultCarousel(rawPack, director) {
  return [
    { title: 'Hook', body: String(rawPack.caption || '').split('\n')[0] || director.conceptLabel },
    { title: 'Valore', body: director.rationale?.slice(0, 140) || 'Il dettaglio che conta.' },
    { title: 'CTA', body: rawPack.cta || director.ctaStrategy },
  ];
}
