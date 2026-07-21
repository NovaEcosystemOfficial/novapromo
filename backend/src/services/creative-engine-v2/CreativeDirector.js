/**
 * CreativeDirector — reasons before generating images.
 * Analyzes brand, goal, platform, format; chooses the best concept.
 */

import { chatCompletion } from '../openaiService.js';
import { VISUAL_CONCEPTS } from './constants.js';
import { suggestConceptFromHints, resolveStyle } from './StyleEngine.js';
import { logger } from '../../utils/logger.js';

/**
 * @param {object} args
 * @param {object} args.brandAnalysis
 * @param {string} args.idea
 * @param {string} args.platform
 * @param {string} args.format
 * @param {string} args.style — user preference from Creative Studio (V1 styles)
 * @param {boolean} args.includeVideoPrompt
 * @param {string|null} args.contentGoal
 */
export async function directCreative(args) {
  const {
    brandAnalysis,
    idea,
    platform,
    format,
    style,
    includeVideoPrompt,
    contentGoal = null,
  } = args;

  const heuristicConcept = suggestConceptFromHints({
    style,
    graphicStyles: brandAnalysis.graphicStyles,
    sector: brandAnalysis.sector,
  });

  let decision = null;
  try {
    decision = await reasonWithLlm({
      brandAnalysis,
      idea,
      platform,
      format,
      style,
      includeVideoPrompt,
      contentGoal,
      heuristicConcept,
    });
  } catch (err) {
    logger.warn('CreativeDirector LLM reasoning failed, using heuristic', { error: err.message });
  }

  const conceptId = VISUAL_CONCEPTS.includes(decision?.conceptId)
    ? decision.conceptId
    : heuristicConcept;

  const stylePack = resolveStyle(conceptId, {
    palette: brandAnalysis.palette,
    graphicStyles: brandAnalysis.graphicStyles,
  });

  return {
    conceptId,
    conceptLabel: stylePack.label,
    rationale: decision?.rationale || `Concept scelto per stile ${style} e profilo brand.`,
    contentType: decision?.contentType || inferContentType(format, idea),
    marketingObjective: decision?.marketingObjective
      || brandAnalysis.marketingGoals?.[0]
      || contentGoal
      || 'brand_awareness',
    ctaStrategy: decision?.ctaStrategy || brandAnalysis.preferredCtas?.[0] || 'Scopri di più',
    tonePlan: decision?.tonePlan || brandAnalysis.toneOfVoice.join(', '),
    photographyMode: conceptId === 'brand_photography' || decision?.photographyMode === true,
    brandPhotographyBrief: decision?.brandPhotographyBrief
      || (conceptId === 'brand_photography'
        ? 'Professional brand photoshoot quality — Apple / Nike / Adobe / Canva / Samsung / Notion / Figma level. Must look real, not AI.'
        : null),
    stylePack,
    reasoningTrace: {
      heuristicConcept,
      llmUsed: Boolean(decision),
      platform,
      format,
      userStyle: style,
    },
  };
}

async function reasonWithLlm(ctx) {
  const system = [
    'Sei il Creative Director di NovaPromo Creative Engine V2.',
    'NON generare immagini. Ragiona e scegli il concept migliore.',
    'Rispondi SOLO JSON valido.',
    `Concept ammessi: ${VISUAL_CONCEPTS.join(', ')}.`,
    'Preferisci brand_photography quando il brand merita look fotografico reale (non AI art).',
    'Considera settore, target, palette, tone of voice, obiettivo, piattaforma, formato, CTA.',
  ].join('\n');

  const user = [
    ctx.brandAnalysis.summary,
    `Idea post: ${ctx.idea}`,
    `Piattaforma: ${ctx.platform}`,
    `Formato: ${ctx.format}`,
    `Preferenza stile utente (legacy): ${ctx.style}`,
    `Obiettivo hint: ${ctx.contentGoal || 'auto'}`,
    `Video prompt richiesto: ${ctx.includeVideoPrompt ? 'sì' : 'no'}`,
    `Suggerimento euristico: ${ctx.heuristicConcept}`,
    '',
    'JSON:',
    '{"conceptId":"","rationale":"","contentType":"post|story|reel|carousel|launch","marketingObjective":"","ctaStrategy":"","tonePlan":"","photographyMode":true,"brandPhotographyBrief":""}',
  ].join('\n');

  const raw = await chatCompletion({ system, user, json: true });
  if (!raw || typeof raw !== 'object') return null;
  return {
    conceptId: String(raw.conceptId || '').trim(),
    rationale: String(raw.rationale || '').trim(),
    contentType: String(raw.contentType || '').trim(),
    marketingObjective: String(raw.marketingObjective || '').trim(),
    ctaStrategy: String(raw.ctaStrategy || '').trim(),
    tonePlan: String(raw.tonePlan || '').trim(),
    photographyMode: raw.photographyMode === true,
    brandPhotographyBrief: raw.brandPhotographyBrief
      ? String(raw.brandPhotographyBrief).trim()
      : null,
  };
}

function inferContentType(format, idea) {
  if (format === 'story') return 'story';
  if (format === 'reel') return 'reel';
  if (/carousel|carosello/i.test(idea)) return 'carousel';
  if (/launch|lancio|release/i.test(idea)) return 'launch';
  return 'post';
}
