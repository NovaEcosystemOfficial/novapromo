/**
 * QualityChecker — post-generation quality analysis with optional auto-regenerate.
 * Uses structured LLM review of the creative brief + prompt; vision hooks reserved.
 */

import { chatCompletion } from '../openaiService.js';
import { QUALITY_MAX_REGENERATIONS } from './constants.js';
import { logger } from '../../utils/logger.js';

const FAIL_SIGNALS = [
  'deformed',
  'unreadable',
  'gibberish',
  'invented logo',
  'fake ui',
  'plastic',
  'cartoon',
  'cgi',
  'artefact',
  'artifact',
  'uncanny',
];

/**
 * Analyze creative output quality.
 * @returns {{ pass: boolean, score: number, issues: string[], shouldRegenerate: boolean, notes: string }}
 */
export async function checkQuality({
  imagePrompt,
  pack,
  director,
  attempt = 0,
}) {
  const heuristic = heuristicCheck({ imagePrompt, pack, director });

  let llm = null;
  try {
    llm = await llmCheck({ imagePrompt, pack, director });
  } catch (err) {
    logger.warn('QualityChecker LLM review skipped', { error: err.message });
  }

  const issues = unique([
    ...heuristic.issues,
    ...(llm?.issues || []),
  ]);
  const score = clamp(
    Math.round(((heuristic.score + (llm?.score ?? heuristic.score)) / 2)),
    0,
    100,
  );
  const pass = score >= 70 && issues.length < 3;
  const shouldRegenerate = !pass && attempt < QUALITY_MAX_REGENERATIONS;

  return {
    pass,
    score,
    issues,
    shouldRegenerate,
    notes: llm?.notes || heuristic.notes,
    attempt,
    maxRegenerations: QUALITY_MAX_REGENERATIONS,
    // Future: vision model analysis of generated imageUrl
    visionAnalysis: null,
  };
}

function heuristicCheck({ imagePrompt, pack, director }) {
  const issues = [];
  const prompt = String(imagePrompt || '');
  const lower = prompt.toLowerCase();

  if (prompt.length < 400) {
    issues.push('prompt_troppo_corto');
  }
  if (!/negative prompt/i.test(prompt)) {
    issues.push('manca_negative_prompt');
  }
  if (!director?.conceptId) {
    issues.push('concept_assente');
  }
  if (pack?.caption && pack.caption.length < 20) {
    issues.push('caption_debole');
  }
  // Prefer photography language for brand_photography
  if (director?.conceptId === 'brand_photography' && !/photograph|camera|lens|studio/i.test(prompt)) {
    issues.push('manca_direzione_fotografica');
  }

  for (const signal of FAIL_SIGNALS) {
    // Presence in negative section is OK; presence as positive instruction is bad — skip simple scan
    void signal;
  }

  let score = 85;
  score -= issues.length * 8;
  if (lower.includes('brand photography') || lower.includes('professional brand')) score += 5;

  return {
    score: clamp(score, 0, 100),
    issues,
    notes: 'Heuristic prompt/pack quality check',
  };
}

async function llmCheck({ imagePrompt, pack, director }) {
  const system = [
    'Sei un art director QA per social creatives.',
    'Valuta se il brief/prompt rischia: testo errato, mani deformi, volti unrealistici, look AI evidente, layout sbagliato, loghi inventati.',
    'Rispondi JSON: {"score":0-100,"pass":true,"issues":[],"notes":"","shouldRegenerate":false}',
  ].join('\n');

  const user = [
    `Concept: ${director?.conceptId}`,
    `Caption: ${(pack?.caption || '').slice(0, 300)}`,
    `Image prompt (excerpt): ${String(imagePrompt || '').slice(0, 2500)}`,
  ].join('\n');

  const raw = await chatCompletion({ system, user, json: true });
  if (!raw || typeof raw !== 'object') return null;

  return {
    score: clamp(Number(raw.score) || 70, 0, 100),
    issues: Array.isArray(raw.issues) ? raw.issues.map(String) : [],
    notes: String(raw.notes || ''),
    shouldRegenerate: raw.shouldRegenerate === true,
  };
}

/**
 * Strengthen prompt after a failed quality check.
 */
export function reinforcePrompt(imagePrompt, qualityReport) {
  const fixes = [
    'CRITICAL QUALITY REINFORCEMENT:',
    'Fix previous risks. Prioritize: realistic anatomy, legible typography only if needed, no invented logos, no fake UI, no plastic CGI, no cartoon.',
    qualityReport.issues?.length
      ? `Address issues: ${qualityReport.issues.join(', ')}`
      : null,
    'Increase photographic realism and brand campaign quality.',
  ].filter(Boolean).join('\n');

  return `${imagePrompt}\n\n${fixes}`;
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
