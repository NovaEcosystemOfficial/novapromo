/**
 * QualityChecker — dimensional Quality Score 0–100 with configurable threshold.
 */

import { chatCompletion } from '../openaiService.js';
import {
  QUALITY_MAX_REGENERATIONS,
  QUALITY_SCORE_THRESHOLD,
  QUALITY_DIMENSIONS,
} from './constants.js';
import { logger } from '../../utils/logger.js';

/**
 * Analyze creative quality and return structured score.
 */
export async function checkQuality({
  imagePrompt,
  pack,
  director,
  brief = null,
  stylePack = null,
  layout = null,
  attempt = 0,
  threshold = QUALITY_SCORE_THRESHOLD,
}) {
  const heuristic = heuristicCheck({ imagePrompt, pack, director, brief, stylePack, layout });

  let llm = null;
  try {
    llm = await llmCheck({ imagePrompt, pack, director, brief, stylePack, layout });
  } catch (err) {
    logger.warn('QualityChecker LLM review skipped', { error: err.message });
  }

  const dimensions = mergeDimensions(heuristic.dimensions, llm?.dimensions);
  const score = clamp(
    Math.round(
      Object.values(dimensions).reduce((a, b) => a + b, 0) / QUALITY_DIMENSIONS.length,
    ),
    0,
    100,
  );

  const issues = unique([
    ...heuristic.issues,
    ...(llm?.issues || []),
  ]);

  const pass = score >= threshold && issues.length < 3;
  const shouldRegenerate = !pass && attempt < QUALITY_MAX_REGENERATIONS;

  return {
    pass,
    score,
    threshold,
    dimensions,
    issues,
    shouldRegenerate,
    regenerationPrepared: shouldRegenerate,
    notes: llm?.notes || heuristic.notes,
    attempt,
    maxRegenerations: QUALITY_MAX_REGENERATIONS,
    visionAnalysis: null,
  };
}

function heuristicCheck({ imagePrompt, pack, director, brief, stylePack, layout }) {
  const issues = [];
  const prompt = String(imagePrompt || '');
  const dimensions = {
    brandCoherence: 78,
    readability: 80,
    composition: 78,
    cleanliness: 80,
    realism: 76,
    color: 78,
    contrast: 78,
    balance: 78,
  };

  if (prompt.length < 500) {
    issues.push('prompt_troppo_corto');
    dimensions.readability -= 12;
    dimensions.realism -= 8;
  } else {
    dimensions.readability += 6;
    dimensions.realism += 4;
  }

  if (!/negative prompt/i.test(prompt)) {
    issues.push('manca_negative_prompt');
    dimensions.cleanliness -= 10;
  } else {
    dimensions.cleanliness += 6;
  }

  if (!/camera|lens|optic|illumin|lighting|depth|texture|material/i.test(prompt)) {
    issues.push('manca_direzione_fotografica');
    dimensions.realism -= 10;
  } else {
    dimensions.realism += 8;
  }

  if (stylePack?.id || director?.conceptId || director?.stylePack?.id) {
    dimensions.brandCoherence += 6;
  } else {
    issues.push('style_assente');
    dimensions.brandCoherence -= 12;
  }

  if (layout?.id) {
    dimensions.composition += 8;
    dimensions.balance += 6;
  }

  if (brief?.palette?.length || stylePack?.palette?.length) {
    dimensions.color += 8;
    dimensions.contrast += 4;
  }

  if (pack?.caption && pack.caption.length >= 40) {
    dimensions.readability += 4;
  } else if (pack && (!pack.caption || pack.caption.length < 20)) {
    issues.push('caption_debole');
    dimensions.readability -= 6;
  }

  if (/plastic|cartoon|cgi render/i.test(prompt) && !/never plastic|no cartoon|avoid.*cgi/i.test(prompt)) {
    dimensions.realism -= 15;
    issues.push('rischio_look_ai');
  }

  for (const key of QUALITY_DIMENSIONS) {
    dimensions[key] = clamp(dimensions[key], 0, 100);
  }

  return {
    dimensions,
    issues,
    notes: 'Heuristic dimensional quality check',
  };
}

async function llmCheck({ imagePrompt, pack, director, brief, stylePack, layout }) {
  const system = [
    'Sei un art director QA per social creatives.',
    'Valuta Quality Score dimensionale 0-100 per: brandCoherence, readability, composition, cleanliness, realism, color, contrast, balance.',
    'Segnala rischi: testo errato, mani deformi, volti unrealistici, look AI, layout sbagliato, loghi inventati.',
    'Rispondi JSON: {"dimensions":{"brandCoherence":0,"readability":0,"composition":0,"cleanliness":0,"realism":0,"color":0,"contrast":0,"balance":0},"issues":[],"notes":"","shouldRegenerate":false}',
  ].join('\n');

  const user = [
    brief?.summary && `Brief:\n${brief.summary}`,
    `Style: ${stylePack?.label || director?.conceptLabel || director?.stylePack?.label || 'n/d'}`,
    `Layout: ${layout?.label || 'n/d'}`,
    `Caption: ${(pack?.caption || '').slice(0, 300)}`,
    `Image prompt (excerpt): ${String(imagePrompt || '').slice(0, 2200)}`,
  ].filter(Boolean).join('\n\n');

  const raw = await chatCompletion({ system, user, json: true });
  if (!raw || typeof raw !== 'object') return null;

  const dimensions = {};
  for (const key of QUALITY_DIMENSIONS) {
    dimensions[key] = clamp(Number(raw.dimensions?.[key]) || 70, 0, 100);
  }

  return {
    dimensions,
    issues: Array.isArray(raw.issues) ? raw.issues.map(String) : [],
    notes: String(raw.notes || ''),
    shouldRegenerate: raw.shouldRegenerate === true,
  };
}

export function reinforcePrompt(imagePrompt, qualityReport) {
  const dimHints = qualityReport.dimensions
    ? Object.entries(qualityReport.dimensions)
      .filter(([, v]) => v < (qualityReport.threshold || QUALITY_SCORE_THRESHOLD))
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')
    : '';

  const fixes = [
    'CRITICAL QUALITY REINFORCEMENT:',
    `Previous Quality Score: ${qualityReport.score}/100 (threshold ${qualityReport.threshold || QUALITY_SCORE_THRESHOLD}).`,
    'Fix previous risks. Prioritize: realistic anatomy, legible typography only if needed, no invented logos, no fake UI, no plastic CGI, no cartoon.',
    qualityReport.issues?.length ? `Address issues: ${qualityReport.issues.join(', ')}` : null,
    dimHints ? `Improve weak dimensions: ${dimHints}` : null,
    'Increase photographic realism, brand coherence, composition balance, and color contrast.',
  ].filter(Boolean).join('\n');

  return `${imagePrompt}\n\n${fixes}`;
}

function mergeDimensions(a = {}, b = null) {
  const out = {};
  for (const key of QUALITY_DIMENSIONS) {
    const av = Number(a[key]) || 70;
    const bv = b && b[key] != null ? Number(b[key]) : av;
    out[key] = clamp(Math.round((av + bv) / 2), 0, 100);
  }
  return out;
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
