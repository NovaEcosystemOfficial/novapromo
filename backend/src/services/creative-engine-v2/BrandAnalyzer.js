/**
 * BrandAnalyzer — extracts brand intelligence for Creative Engine V2.
 * Merges Brand Intelligence profile (preferred) with legacy brand seeds.
 */

import { getBrand } from '../brandService.js';
import { getBrandProfileForAi } from '../brand/brandService.js';
import { buildBrandAiContext } from '../brand/brandSchema.js';
import { DEFAULT_BRAND_ID } from '../../constants/plans.js';

/**
 * @param {{ brandId?: string, userDocId: string, project?: string|null }} opts
 */
export async function analyzeBrand({ brandId, userDocId, project = null }) {
  const legacyId = brandId || DEFAULT_BRAND_ID;
  const legacy = await getBrand(legacyId);

  let biProfile = null;
  let biContext = null;
  try {
    biProfile = await getBrandProfileForAi(userDocId);
    biContext = buildBrandAiContext(biProfile);
  } catch {
    biProfile = null;
    biContext = null;
  }

  const companyName = biContext?.companyName || legacy?.name || 'Brand';
  const sector = biContext?.sector || '';
  const palette = uniqueColors([
    ...(biContext?.primaryColors || []),
    ...(legacy?.colors || []),
  ]);
  const toneOfVoice = biContext?.toneOfVoice?.length
    ? biContext.toneOfVoice
    : legacy?.tone
      ? [legacy.tone]
      : ['professionale'];
  const target = biContext?.target || {};
  const goals = biContext?.marketingGoals || [];
  const preferredCtas = biContext?.preferredCtas?.length
    ? biContext.preferredCtas
    : legacy?.preferredCTA
      ? [legacy.preferredCTA]
      : ['Scopri di più'];
  const wordsToUse = biContext?.wordsToUse || [];
  const wordsToAvoid = [
    ...(biContext?.wordsToAvoid || []),
    ...(legacy?.forbiddenWords || []),
  ];
  const hashtags = biContext?.hashtags || [];
  const graphicStyles = biContext?.graphicStyles || [];
  const styleNotes = legacy?.styleNotes || '';

  return {
    brandId: legacy?.id || legacyId,
    legacy,
    biProfile,
    biContext,
    hasBrandIntelligence: Boolean(biContext?.companyName || biContext?.toneOfVoice?.length),
    companyName,
    sector,
    shortDescription: biContext?.shortDescription || '',
    mission: biContext?.mission || '',
    vision: biContext?.vision || '',
    values: biContext?.values || [],
    palette,
    toneOfVoice,
    target,
    marketingGoals: goals,
    preferredCtas,
    wordsToUse,
    wordsToAvoid,
    hashtags,
    graphicStyles,
    styleNotes,
    project: project || null,
    summary: buildSummary({
      companyName,
      sector,
      toneOfVoice,
      palette,
      target,
      goals,
      graphicStyles,
    }),
  };
}

function uniqueColors(list) {
  const seen = new Set();
  const out = [];
  for (const c of list) {
    const key = String(c || '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(String(c).trim());
  }
  return out;
}

function buildSummary(b) {
  const parts = [
    `Brand: ${b.companyName}`,
    b.sector && `Settore: ${b.sector}`,
    `Tone: ${b.toneOfVoice.join(', ')}`,
    b.palette.length && `Palette: ${b.palette.join(', ')}`,
    (b.target?.profession || b.target?.audienceType) &&
      `Target: ${[b.target.profession, b.target.audienceType, b.target.ageRange].filter(Boolean).join(' · ')}`,
    b.goals?.length && `Obiettivi: ${b.goals.join(', ')}`,
    b.graphicStyles?.length && `Stili grafici: ${b.graphicStyles.join(', ')}`,
  ].filter(Boolean);
  return parts.join('\n');
}
