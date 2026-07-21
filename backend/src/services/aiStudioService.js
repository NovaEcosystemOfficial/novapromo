import { chatCompletion } from './openaiService.js';
import { getBrand, buildBrandSystemPrompt } from './brandService.js';
import { saveAiGeneration } from './firebase/aiGenerationRepository.js';
import { getUserPlan, consumeAICredit } from './planService.js';
import { canUseAI } from './featureGate.js';
import { DEFAULT_BRAND_ID } from '../constants/plans.js';

const TRANSFORM_PLATFORMS = {
  instagram_post: 'Instagram Post',
  instagram_story: 'Instagram Story',
  facebook_post: 'Facebook Post',
  linkedin_post: 'LinkedIn Post',
  twitter_post: 'X/Twitter Post',
};

function asText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => asText(item)).filter(Boolean).join('\n');
  }
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text;
    if (typeof value.content === 'string') return value.content;
    if (typeof value.caption === 'string') return value.caption;
  }
  return '';
}

function asStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asText(item)).filter(Boolean);
}

function asVariantMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = asText(item);
  }
  return out;
}

/**
 * Normalizes free-text topic flow. Topic is the primary input; suggestions/templates are optional.
 * For transform endpoints, sourceText alone is accepted as the working content.
 */
function normalizeStudioInput(input = {}, { allowSourceOnly = false } = {}) {
  const topic = asText(input.topic).trim();
  const sourceText = asText(input.sourceText).trim();

  if (!topic && !(allowSourceOnly && sourceText)) {
    const err = new Error('Argomento obbligatorio');
    err.code = 'VALIDATION_ERROR';
    err.status = 400;
    throw err;
  }

  const resolvedTopic = (topic || sourceText).slice(0, 500);
  const project = asText(input.project).trim() || resolvedTopic;

  return {
    topic: resolvedTopic,
    project: project.slice(0, 120),
    platform: asText(input.platform).trim().slice(0, 40) || 'instagram',
    contentType: asText(input.contentType).trim().slice(0, 40) || 'post',
    tone: asText(input.tone).trim().slice(0, 40) || 'professionale',
    sourceText: sourceText.slice(0, 4000),
    targetPlatforms: Array.isArray(input.targetPlatforms) ? input.targetPlatforms : undefined,
  };
}

async function assertAiAccess(userDocId) {
  const plan = await getUserPlan(userDocId);
  const gate = canUseAI(plan);
  if (!gate.allowed) {
    const err = new Error(gate.reason);
    err.code = gate.code;
    err.status = gate.code === 'AI_CREDITS_EXHAUSTED' ? 402 : 403;
    err.details = gate;
    throw err;
  }
  return plan;
}

async function runAi({
  userDocId,
  type,
  input,
  brandId,
  buildUserPrompt,
  parseOutput,
  allowSourceOnly = false,
}) {
  await assertAiAccess(userDocId);
  const normalized = normalizeStudioInput(input, { allowSourceOnly });
  const resolvedBrandId = brandId && brandId !== '__custom__' ? brandId : DEFAULT_BRAND_ID;
  const brand = await getBrand(resolvedBrandId);
  const system = buildBrandSystemPrompt(brand);
  const user = buildUserPrompt(normalized, brand);
  const raw = await chatCompletion({ system, user, json: true });
  const output = parseOutput(raw || {});
  await consumeAICredit(userDocId);
  const saved = await saveAiGeneration({
    userDocId,
    type,
    input: normalized,
    output,
    brandId: brand.id,
  });
  return { ...output, generationId: saved.id, brandId: brand.id };
}

function baseContext(input) {
  return [
    `Argomento: ${input.topic}`,
    input.project && `Progetto: ${input.project}`,
    input.platform && `Piattaforma: ${input.platform}`,
    input.contentType && `Formato: ${input.contentType}`,
    input.tone && `Tono: ${input.tone}`,
  ].filter(Boolean).join('\n');
}

export async function generateCaption(userDocId, input, brandId) {
  return runAi({
    userDocId,
    type: 'caption',
    input,
    brandId,
    buildUserPrompt: (inp) =>
      `${baseContext(inp)}\n\nGenera una caption per social media basata sull'argomento indicato dall'utente.\nRispondi JSON: {"caption":"..."}`,
    parseOutput: (raw) => ({ caption: asText(raw.caption) }),
  });
}

export async function generateHashtags(userDocId, input, brandId) {
  return runAi({
    userDocId,
    type: 'hashtags',
    input,
    brandId,
    buildUserPrompt: (inp) =>
      `${baseContext(inp)}\n\nGenera 8-12 hashtag rilevanti per l'argomento.\nRispondi JSON: {"hashtags":"#uno #due ..."}`,
    parseOutput: (raw) => ({ hashtags: asText(raw.hashtags) }),
  });
}

export async function generateContentPack(userDocId, input, brandId) {
  return runAi({
    userDocId,
    type: 'content_pack',
    input,
    brandId,
    buildUserPrompt: (inp) =>
      `${baseContext(inp)}

L'argomento sopra è l'input principale dell'utente (testo libero). Usalo come soggetto del contenuto.
Non dipendere da template o suggerimenti predefiniti.

Genera un content pack completo.
Rispondi JSON con chiavi:
{"caption":"","hashtags":"","cta":"","reelIdea":"","carouselSlides":["slide1","slide2","slide3"],"storyText":"","platformVariants":{"instagram_post":"","instagram_story":"","facebook_post":"","linkedin_post":"","twitter_post":""}}`,
    parseOutput: (raw) => ({
      caption: asText(raw.caption),
      hashtags: asText(raw.hashtags),
      cta: asText(raw.cta),
      reelIdea: asText(raw.reelIdea),
      carouselSlides: asStringList(raw.carouselSlides),
      storyText: asText(raw.storyText),
      platformVariants: asVariantMap(raw.platformVariants),
    }),
  });
}

export async function transformContent(userDocId, input, brandId) {
  const targets = input.targetPlatforms?.length
    ? input.targetPlatforms
    : Object.keys(TRANSFORM_PLATFORMS);

  return runAi({
    userDocId,
    type: 'transform',
    input: { ...input, targetPlatforms: targets },
    brandId,
    allowSourceOnly: true,
    buildUserPrompt: (inp) => {
      const list = targets.map((k) => TRANSFORM_PLATFORMS[k] || k).join(', ');
      const source = inp.sourceText || inp.topic;
      return `Contenuto sorgente:\n${source}\n\n${baseContext(inp)}\n\nAdatta per: ${list}.\nRispondi JSON: {"platformVariants":{"instagram_post":"","instagram_story":"","facebook_post":"","linkedin_post":"","twitter_post":""}}`;
    },
    parseOutput: (raw) => ({
      platformVariants: asVariantMap(raw.platformVariants),
      sourceText: asText(input.sourceText || input.topic),
    }),
  });
}

export async function generateCta(userDocId, input, brandId) {
  return runAi({
    userDocId,
    type: 'cta',
    input,
    brandId,
    buildUserPrompt: (inp) =>
      `${baseContext(inp)}\n\nGenera una CTA efficace sull'argomento.\nRispondi JSON: {"cta":"..."}`,
    parseOutput: (raw) => ({ cta: asText(raw.cta) }),
  });
}

export async function generateReelIdea(userDocId, input, brandId) {
  return runAi({
    userDocId,
    type: 'reel_idea',
    input,
    brandId,
    buildUserPrompt: (inp) =>
      `${baseContext(inp)}\n\nGenera idea per Reel (hook, corpo, CTA) sull'argomento.\nRispondi JSON: {"reelIdea":"..."}`,
    parseOutput: (raw) => ({ reelIdea: asText(raw.reelIdea) }),
  });
}

export async function generateCarouselIdea(userDocId, input, brandId) {
  return runAi({
    userDocId,
    type: 'carousel',
    input,
    brandId,
    buildUserPrompt: (inp) =>
      `${baseContext(inp)}\n\nGenera idea carosello (3-5 slide) sull'argomento.\nRispondi JSON: {"carouselSlides":["..."]}`,
    parseOutput: (raw) => ({
      carouselSlides: asStringList(raw.carouselSlides),
    }),
  });
}

export { TRANSFORM_PLATFORMS };
