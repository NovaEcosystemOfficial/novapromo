/**
 * CreativeReport — structured process log for Creative Engine V2.
 */

import { logger } from '../../utils/logger.js';
import { ENGINE_ID, ENGINE_VERSION } from './constants.js';

/**
 * Build and log the creative process report.
 */
export function buildAndLogReport({
  brief,
  stylePack,
  layout,
  prompts,
  quality,
  startedAt,
  userDocId = null,
}) {
  const elapsedMs = Date.now() - startedAt;
  const report = {
    engine: ENGINE_ID,
    version: ENGINE_VERSION,
    elapsedMs,
    elapsedSec: Math.round(elapsedMs / 100) / 10,
    creativeBrief: {
      projectName: brief?.projectName,
      objective: brief?.objective,
      platform: brief?.platform,
      target: brief?.target,
      toneOfVoice: brief?.toneOfVoice,
      format: brief?.format,
      brand: brief?.brand?.name,
      palette: brief?.palette,
      cta: brief?.cta,
    },
    style: {
      id: stylePack?.id,
      label: stylePack?.label,
    },
    layout: {
      id: layout?.id,
      label: layout?.label,
    },
    prompt: {
      imagePromptChars: String(prompts?.imagePrompt || '').length,
      hasNegativePrompt: /negative prompt/i.test(String(prompts?.imagePrompt || '')),
      preview: String(prompts?.imagePrompt || '').slice(0, 240),
    },
    qualityScore: quality
      ? {
        score: quality.score,
        threshold: quality.threshold,
        pass: quality.pass,
        dimensions: quality.dimensions,
        shouldRegenerate: quality.shouldRegenerate,
        issues: quality.issues,
      }
      : null,
  };

  logger.info('Creative Engine V2 report', {
    userDocId,
    elapsedMs: report.elapsedMs,
    style: report.style.id,
    layout: report.layout.id,
    qualityScore: report.qualityScore?.score ?? null,
    briefProject: report.creativeBrief.projectName,
    promptChars: report.prompt.imagePromptChars,
  });

  // Explicit human-readable process lines in logs
  logger.info('Creative Brief creato', { brief: report.creativeBrief });
  logger.info('Style scelto', report.style);
  logger.info('Layout scelto', report.layout);
  logger.info('Prompt costruito', {
    chars: report.prompt.imagePromptChars,
    hasNegativePrompt: report.prompt.hasNegativePrompt,
  });
  logger.info('Quality Score', report.qualityScore || { score: null });
  logger.info('Tempo impiegato', { elapsedMs: report.elapsedMs, elapsedSec: report.elapsedSec });

  return report;
}
