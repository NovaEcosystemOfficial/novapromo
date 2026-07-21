/**
 * CreativeBrief — structured brief used by the entire Creative Engine V2.
 * Created before generation; drives style, layout, prompts, and quality.
 */

import { CREATIVE_FORMATS } from '../../constants/aiCredits.js';

/**
 * Build an internal Creative Brief from brand analysis + request params.
 * @returns {object} structured brief
 */
export function buildCreativeBrief({
  brandAnalysis,
  params,
  contentGoal = null,
}) {
  const fmt = CREATIVE_FORMATS[params.format] || CREATIVE_FORMATS.square;
  const objective = resolveObjective(brandAnalysis, contentGoal, params.idea);
  const target = summarizeTarget(brandAnalysis.target);
  const tone = Array.isArray(brandAnalysis.toneOfVoice) && brandAnalysis.toneOfVoice.length
    ? brandAnalysis.toneOfVoice
    : ['professionale'];
  const cta = brandAnalysis.preferredCtas?.[0] || 'Scopri di più';
  const palette = Array.isArray(brandAnalysis.palette) ? brandAnalysis.palette.slice(0, 6) : [];

  const brief = {
    version: 1,
    createdAt: new Date().toISOString(),
    projectName: params.project || brandAnalysis.companyName || 'Progetto',
    description: brandAnalysis.shortDescription
      || brandAnalysis.mission
      || params.idea.slice(0, 280),
    idea: params.idea,
    objective,
    platform: params.platform,
    target,
    toneOfVoice: tone,
    format: {
      id: params.format,
      label: fmt.label,
      aspect: fmt.aspect,
    },
    brand: {
      id: brandAnalysis.brandId,
      name: brandAnalysis.companyName,
      sector: brandAnalysis.sector || '',
      hasBrandIntelligence: Boolean(brandAnalysis.hasBrandIntelligence),
      graphicStyles: brandAnalysis.graphicStyles || [],
      wordsToUse: brandAnalysis.wordsToUse || [],
      wordsToAvoid: brandAnalysis.wordsToAvoid || [],
      hashtags: brandAnalysis.hashtags || [],
    },
    palette,
    cta,
    userStyleHint: params.style || null,
    includeImage: params.includeImage !== false,
    includeVideoPrompt: params.includeVideoPrompt !== false,
  };

  brief.summary = [
    `Progetto: ${brief.projectName}`,
    `Brand: ${brief.brand.name}`,
    brief.brand.sector && `Settore: ${brief.brand.sector}`,
    `Obiettivo: ${brief.objective}`,
    `Piattaforma: ${brief.platform}`,
    `Target: ${brief.target}`,
    `Tone: ${brief.toneOfVoice.join(', ')}`,
    `Formato: ${brief.format.label}`,
    palette.length && `Palette: ${palette.join(', ')}`,
    `CTA: ${brief.cta}`,
    `Idea: ${brief.idea}`,
  ].filter(Boolean).join('\n');

  return brief;
}

function resolveObjective(brandAnalysis, contentGoal, idea) {
  if (contentGoal) return String(contentGoal);
  if (brandAnalysis.marketingGoals?.length) return brandAnalysis.marketingGoals[0];
  if (/lancio|launch|release|nuovo/i.test(idea)) return 'product_launch';
  if (/lead|demo|contatt/i.test(idea)) return 'lead';
  if (/vendit|acquist|offerta/i.test(idea)) return 'vendite';
  return 'brand_awareness';
}

function summarizeTarget(target = {}) {
  const parts = [
    target.audienceType,
    target.profession,
    target.ageRange,
    target.country,
    target.language,
  ].filter(Boolean);
  if (parts.length) return parts.join(' · ');
  if (Array.isArray(target.interests) && target.interests.length) {
    return target.interests.slice(0, 3).join(', ');
  }
  return 'audience generale';
}
