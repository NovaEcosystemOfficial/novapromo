/**
 * CreativeDirector — uses Creative Brief to choose style direction.
 * Style is selected by StyleEngine from the brief (not random).
 */

import { chatCompletion } from '../openaiService.js';
import { DIRECTOR_STYLES } from './constants.js';
import { selectStyleFromBrief, resolveStyle } from './StyleEngine.js';
import { logger } from '../../utils/logger.js';

/**
 * Direct the creative process from a structured brief.
 */
export async function directCreative({
  brief,
  brandAnalysis,
  includeVideoPrompt = true,
}) {
  const heuristicStyle = selectStyleFromBrief(brief);

  let llmOverride = null;
  try {
    llmOverride = await reasonWithLlm({ brief, heuristicStyleId: heuristicStyle.id, includeVideoPrompt });
  } catch (err) {
    logger.warn('CreativeDirector LLM reasoning failed, using brief heuristic', { error: err.message });
  }

  const styleId = DIRECTOR_STYLES.includes(llmOverride?.styleId)
    ? llmOverride.styleId
    : heuristicStyle.id;

  const stylePack = styleId === heuristicStyle.id
    ? heuristicStyle
    : resolveStyle(styleId, { palette: brief.palette, graphicStyles: brief.brand?.graphicStyles });

  return {
    conceptId: stylePack.id,
    conceptLabel: stylePack.label,
    styleId: stylePack.id,
    stylePack,
    rationale: llmOverride?.rationale
      || `Stile ${stylePack.label} scelto dal Creative Brief (obiettivo: ${brief.objective}).`,
    contentType: llmOverride?.contentType || inferContentType(brief),
    marketingObjective: brief.objective,
    ctaStrategy: brief.cta,
    tonePlan: (brief.toneOfVoice || []).join(', '),
    photographyMode: ['apple_inspired', 'luxury', 'premium', 'product_launch'].includes(stylePack.id),
    brandPhotographyBrief: ['apple_inspired', 'luxury', 'product_launch'].includes(stylePack.id)
      ? 'Professional brand photoshoot quality — Apple / Nike / Adobe / Canva / Samsung / Notion / Figma level. Must look real, not AI.'
      : null,
    reasoningTrace: {
      heuristicStyleId: heuristicStyle.id,
      llmUsed: Boolean(llmOverride),
      platform: brief.platform,
      format: brief.format?.id,
      userStyle: brief.userStyleHint,
    },
    brandAnalysis,
  };
}

async function reasonWithLlm({ brief, heuristicStyleId, includeVideoPrompt }) {
  const system = [
    'Sei il Creative Director di NovaPromo Creative Engine V2.',
    'NON generare immagini. Usa il Creative Brief e scegli lo stile migliore.',
    'Rispondi SOLO JSON valido.',
    `Stili ammessi: ${DIRECTOR_STYLES.join(', ')}.`,
    'Lo stile NON deve essere casuale: deve dipendere da obiettivo, settore, tone, target, piattaforma.',
  ].join('\n');

  const user = [
    brief.summary,
    `Suggerimento euristico dal brief: ${heuristicStyleId}`,
    `Video prompt richiesto: ${includeVideoPrompt ? 'sì' : 'no'}`,
    '',
    'JSON:',
    '{"styleId":"","rationale":"","contentType":"post|story|reel|carousel|launch"}',
  ].join('\n');

  const raw = await chatCompletion({ system, user, json: true });
  if (!raw || typeof raw !== 'object') return null;
  return {
    styleId: String(raw.styleId || '').trim(),
    rationale: String(raw.rationale || '').trim(),
    contentType: String(raw.contentType || '').trim(),
  };
}

function inferContentType(brief) {
  const format = brief.format?.id;
  const idea = brief.idea || '';
  if (format === 'story') return 'story';
  if (format === 'reel') return 'reel';
  if (/carousel|carosello/i.test(idea)) return 'carousel';
  if (/launch|lancio|release/i.test(idea) || brief.objective === 'product_launch') return 'launch';
  return 'post';
}
