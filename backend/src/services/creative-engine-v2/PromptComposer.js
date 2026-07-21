/**
 * PromptComposer — long professional prompts driven by Creative Brief.
 */

import { NEGATIVE_PROMPT_CORE } from './constants.js';
import { CREATIVE_FORMATS } from '../../constants/aiCredits.js';

/**
 * Compose system/user/image prompts from brief + style + layout + template.
 */
export function composePrompts({
  brief,
  stylePack,
  layout,
  template,
  includeVideoPrompt,
  brandAnalysis = null,
}) {
  const fmt = brief.format || CREATIVE_FORMATS[brief.format?.id] || { label: 'Quadrato', aspect: '1:1' };
  const formatLabel = brief.format?.label || fmt.label;
  const aspect = brief.format?.aspect || fmt.aspect || '1:1';
  const brandName = brief.brand?.name || brandAnalysis?.companyName || 'Brand';

  const photographyBlock = [
    'PHOTOGRAPHY DIRECTION:',
    `Reference aesthetic: ${stylePack.photographyRef}`,
    `Camera / optics: ${stylePack.camera || 'full-frame 50mm prime'}`,
    'Lens character: natural optical falloff, authentic bokeh, real chromatic behavior',
    `Framing / inquadratura: ${stylePack.composition}`,
    `Lighting / illuminazione: ${stylePack.lighting}`,
    `Depth of field / profondità: ${stylePack.depth}`,
    `Materials & texture: ${stylePack.materials || 'real surfaces — never plastic CGI'}`,
    'Shadows: physically plausible contact shadows and soft ambient occlusion',
  ].join('\n');

  const compositionBlock = [
    'COMPOSITION & LAYOUT:',
    layout.compositionBrief,
    `Style composition: ${stylePack.composition}`,
    `Typography intent (if any text appears): ${stylePack.typography} — minimal, perfectly legible, never gibberish`,
    `Graphic elements: ${stylePack.graphics}`,
  ].join('\n');

  const brandBlock = [
    'BRAND COHERENCE:',
    `Brand: ${brandName}`,
    brief.brand?.sector && `Sector: ${brief.brand.sector}`,
    brief.description && `About: ${brief.description}`,
    `Tone of voice: ${(brief.toneOfVoice || []).join(', ')}`,
    `Palette: ${(stylePack.palette || brief.palette || []).join(', ')}`,
    brief.brand?.wordsToAvoid?.length && `Avoid: ${brief.brand.wordsToAvoid.join(', ')}`,
    `Marketing objective: ${brief.objective}`,
    `CTA: ${brief.cta}`,
    `Target: ${brief.target}`,
  ].filter(Boolean).join('\n');

  const platformBlock = [
    'PLATFORM & TEMPLATE:',
    `Platform: ${brief.platform}`,
    `Format: ${formatLabel} (${aspect})`,
    `Template: ${template.label}`,
    `Best practices: ${(template.bestPractices || []).join('; ')}`,
  ].join('\n');

  const negativePrompt = [
    NEGATIVE_PROMPT_CORE,
    'misspelled words',
    'random letters',
    'logo hallucinations',
    'smartphone UI with fake apps',
    'oversmoothed skin',
    'dolly zoom artifacts',
    'cheap stock look',
  ].join(', ');

  const imagePrompt = [
    `Professional social creative for ${brandName}.`,
    `Director style: ${stylePack.label} (${stylePack.id}).`,
    `Layout plan: ${layout.label} (${layout.id}).`,
    `Creative idea: ${brief.idea}`,
    '',
    photographyBlock,
    '',
    compositionBlock,
    '',
    brandBlock,
    '',
    platformBlock,
    '',
    'MARKETING OBJECTIVE:',
    `Deliver a thumb-stopping visual that supports: ${brief.idea}`,
    `Objective: ${brief.objective}. CTA spirit: ${brief.cta}.`,
    '',
    'QUALITY BAR:',
    'Must look like a real professional brand campaign / photoshoot, not generic AI art.',
    'No deformed anatomy, no unreadable text, no invented logos or fake UI.',
    '',
    `NEGATIVE PROMPT: ${negativePrompt}`,
  ].join('\n');

  const systemPrompt = [
    'Sei il copy & creative strategist di Nova Creative Engine V2 (direttore creativo AI).',
    'Scrivi in italiano contenuti social professionali, coerenti col Creative Brief.',
    brief.summary,
    `Stile scelto: ${stylePack.label} — layout: ${layout.label}`,
    `Template: ${template.label}. Caption style: ${template.captionStyle || 'hook + value + CTA'}`,
    `Parole da usare: ${(brief.brand?.wordsToUse || []).join(', ') || 'n/d'}`,
    `Parole da evitare: ${(brief.brand?.wordsToAvoid || []).join(', ') || 'n/d'}`,
    'Rispondi sempre in JSON valido.',
  ].join('\n');

  const userPrompt = [
    `Idea: ${brief.idea}`,
    `Progetto: ${brief.projectName}`,
    `Piattaforma: ${brief.platform}`,
    `Formato: ${formatLabel}`,
    `Style: ${stylePack.id}`,
    `Layout: ${layout.id}`,
    `Obiettivo: ${brief.objective}`,
    `CTA: ${brief.cta}`,
    `Target: ${brief.target}`,
    '',
    'Genera il pacchetto testo completo (immagine già pianificata a parte).',
    includeVideoPrompt
      ? 'Includi script reel 15s, scene, overlay, camera, mood musica, futureAiVideoPrompt.'
      : 'Non includere dettagli video.',
    '',
    'JSON keys:',
    '{"caption":"","hashtags":"","cta":"","altText":"","variantA":{"caption":"","cta":""},"variantB":{"caption":"","cta":""},"storyCopy":"","reelCoverLine":"","carouselSlides":[{"title":"","body":""}],"imagePromptHint":"","videoPrompt":"","musicMood":"","visualStyle":"","socialFormat":"","platformVariants":{"instagram_post":"","instagram_story":"","facebook_post":"","linkedin_post":"","tiktok_cover":""},"videoScript":{"durationSeconds":15,"script":"","scenes":[{"seconds":"","visual":"","overlayText":"","camera":""}],"overlayTexts":[],"cameraMovement":"","futureAiVideoPrompt":""}}',
  ].join('\n');

  return {
    imagePrompt,
    negativePrompt,
    systemPrompt,
    userPrompt,
    briefSummary: {
      style: stylePack.label,
      layout: layout.label,
      template: template.label,
      objective: brief.objective,
    },
  };
}
