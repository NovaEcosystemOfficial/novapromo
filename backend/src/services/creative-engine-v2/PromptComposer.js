/**
 * PromptComposer — long, structured professional prompts for image + copy.
 */

import { NEGATIVE_PROMPT_CORE } from './constants.js';
import { CREATIVE_FORMATS } from '../../constants/aiCredits.js';

/**
 * Build the full creative brief used for text pack + image generation.
 */
export function composePrompts({
  brandAnalysis,
  director,
  layout,
  template,
  idea,
  platform,
  format,
  includeVideoPrompt,
}) {
  const fmt = CREATIVE_FORMATS[format] || CREATIVE_FORMATS.square;
  const style = director.stylePack;

  const photographyBlock = [
    'PHOTOGRAPHY DIRECTION:',
    director.photographyMode || director.conceptId === 'brand_photography'
      ? (director.brandPhotographyBrief || 'Professional brand photography, real shoot quality — Apple, Nike, Adobe, Canva, Samsung, Notion, Figma level.')
      : `Reference aesthetic: ${style.photographyRef}`,
    `Camera: full-frame mirrorless, ${director.photographyMode ? '85mm or 50mm prime' : '35–85mm prime'}`,
    'Lens character: natural optical falloff, authentic bokeh, real chromatic behavior',
    `Lighting: ${style.lighting}`,
    `Depth of field: ${style.depth}`,
    `Materials & texture: real surfaces, fabric weave, metal micro-scratches, paper fiber — never plastic CGI`,
    `Shadows: physically plausible contact shadows and soft ambient occlusion`,
  ].join('\n');

  const compositionBlock = [
    'COMPOSITION & LAYOUT:',
    layout.compositionBrief,
    `Overall composition intent: ${style.composition}`,
    `Typography intent (if any text appears): ${style.typography} — keep text minimal, perfectly legible, never gibberish`,
    `Graphic elements: ${style.graphics}`,
  ].join('\n');

  const brandBlock = [
    'BRAND COHERENCE:',
    `Brand: ${brandAnalysis.companyName}`,
    brandAnalysis.sector && `Sector: ${brandAnalysis.sector}`,
    brandAnalysis.shortDescription && `About: ${brandAnalysis.shortDescription}`,
    `Tone of voice: ${director.tonePlan}`,
    `Palette: ${style.palette.join(', ')}`,
    brandAnalysis.wordsToAvoid.length && `Avoid words/themes: ${brandAnalysis.wordsToAvoid.join(', ')}`,
    `Marketing objective: ${director.marketingObjective}`,
    `CTA strategy: ${director.ctaStrategy}`,
  ].filter(Boolean).join('\n');

  const platformBlock = [
    'PLATFORM & TEMPLATE:',
    `Platform: ${platform}`,
    `Format: ${fmt.label} (${fmt.aspect})`,
    `Template: ${template.label}`,
    `Best practices: ${template.bestPractices.join('; ')}`,
  ].join('\n');

  const negativePrompt = [
    NEGATIVE_PROMPT_CORE,
    'misspelled words',
    'random letters',
    'logo hallucinations',
    'smartphone UI with fake apps',
    'oversmoothed skin',
    'dolly zoom artifacts',
  ].join(', ');

  const imagePrompt = [
    `Professional social creative for ${brandAnalysis.companyName}.`,
    `Concept: ${style.label} (${director.conceptId}).`,
    `Creative idea: ${idea}`,
    '',
    photographyBlock,
    '',
    compositionBlock,
    '',
    brandBlock,
    '',
    platformBlock,
    '',
    'MARKETING GOAL:',
    `Deliver a thumb-stopping visual that supports: ${idea}`,
    `Objective: ${director.marketingObjective}. CTA spirit: ${director.ctaStrategy}.`,
    '',
    'QUALITY BAR:',
    'Must look like a real professional photoshoot / brand campaign, not generic AI art.',
    'No deformed anatomy, no unreadable text, no invented logos or fake UI.',
    '',
    `NEGATIVE PROMPT: ${negativePrompt}`,
  ].join('\n');

  const systemPrompt = [
    'Sei il copy & creative strategist di Nova Creative Engine V2.',
    'Scrivi in italiano contenuti social professionali, coerenti col brand.',
    brandAnalysis.summary,
    `Concept visivo scelto: ${style.label} — ${director.rationale}`,
    `Template: ${template.label}. Caption style: ${template.captionStyle}`,
    `Parole da usare: ${(brandAnalysis.wordsToUse || []).join(', ') || 'n/d'}`,
    `Parole da evitare: ${(brandAnalysis.wordsToAvoid || []).join(', ') || 'n/d'}`,
    'Rispondi sempre in JSON valido.',
  ].join('\n');

  const userPrompt = [
    `Idea: ${idea}`,
    brandAnalysis.project && `Progetto: ${brandAnalysis.project}`,
    `Piattaforma: ${platform}`,
    `Formato: ${fmt.label}`,
    `Concept: ${director.conceptId}`,
    `Obiettivo: ${director.marketingObjective}`,
    `CTA preferita: ${director.ctaStrategy}`,
    '',
    'Genera il pacchetto testo completo (immagine già pianificata a parte).',
    includeVideoPrompt
      ? 'Includi script reel 15s, scene, overlay, camera, mood musica, futureAiVideoPrompt.'
      : 'Non includere dettagli video.',
    '',
    'JSON keys:',
    '{"caption":"","hashtags":"","cta":"","altText":"","variantA":{"caption":"","cta":""},"variantB":{"caption":"","cta":""},"storyCopy":"","reelCoverLine":"","carouselSlides":[{"title":"","body":""}],"imagePromptHint":"","videoPrompt":"","musicMood":"","visualStyle":"","socialFormat":"","platformVariants":{"instagram_post":"","instagram_story":"","facebook_post":"","linkedin_post":"","tiktok_cover":""},"videoScript":{"durationSeconds":15,"script":"","scenes":[{"seconds":"","visual":"","overlayText":"","camera":""}],"overlayTexts":[],"cameraMovement":"","futureAiVideoPrompt":""}}',
  ].filter(Boolean).join('\n');

  return {
    imagePrompt,
    negativePrompt,
    systemPrompt,
    userPrompt,
    briefSummary: {
      concept: style.label,
      layout: layout.label,
      template: template.label,
      photographyMode: Boolean(director.photographyMode || director.conceptId === 'brand_photography'),
    },
  };
}
