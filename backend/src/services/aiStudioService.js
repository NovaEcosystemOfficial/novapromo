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

async function runAi({ userDocId, type, input, brandId, buildUserPrompt, parseOutput }) {
  await assertAiAccess(userDocId);
  const brand = await getBrand(brandId || DEFAULT_BRAND_ID);
  const system = buildBrandSystemPrompt(brand);
  const user = buildUserPrompt(input, brand);
  const raw = await chatCompletion({ system, user, json: true });
  const output = parseOutput(raw);
  await consumeAICredit(userDocId);
  const saved = await saveAiGeneration({ userDocId, type, input, output, brandId: brand.id });
  return { ...output, generationId: saved.id, brandId: brand.id };
}

function baseContext(input) {
  return [
    input.project && `Progetto: ${input.project}`,
    input.platform && `Piattaforma: ${input.platform}`,
    input.contentType && `Formato: ${input.contentType}`,
    input.tone && `Tono: ${input.tone}`,
    input.topic && `Argomento: ${input.topic}`,
  ].filter(Boolean).join('\n');
}

export async function generateCaption(userDocId, input, brandId) {
  return runAi({
    userDocId,
    type: 'caption',
    input,
    brandId,
    buildUserPrompt: (inp) =>
      `${baseContext(inp)}\n\nGenera una caption per social media.\nRispondi JSON: {"caption":"..."}`,
    parseOutput: (raw) => ({ caption: raw.caption || '' }),
  });
}

export async function generateHashtags(userDocId, input, brandId) {
  return runAi({
    userDocId,
    type: 'hashtags',
    input,
    brandId,
    buildUserPrompt: (inp) =>
      `${baseContext(inp)}\n\nGenera 8-12 hashtag rilevanti.\nRispondi JSON: {"hashtags":"#uno #due ..."}`,
    parseOutput: (raw) => ({ hashtags: raw.hashtags || '' }),
  });
}

export async function generateContentPack(userDocId, input, brandId) {
  return runAi({
    userDocId,
    type: 'content_pack',
    input,
    brandId,
    buildUserPrompt: (inp) =>
      `${baseContext(inp)}\n\nGenera un content pack completo.\nRispondi JSON con chiavi:
{"caption":"","hashtags":"","cta":"","reelIdea":"","carouselSlides":["slide1","slide2","slide3"],"storyText":"","platformVariants":{"instagram_post":"","instagram_story":"","facebook_post":"","linkedin_post":"","twitter_post":""}}`,
    parseOutput: (raw) => ({
      caption: raw.caption || '',
      hashtags: raw.hashtags || '',
      cta: raw.cta || '',
      reelIdea: raw.reelIdea || '',
      carouselSlides: Array.isArray(raw.carouselSlides) ? raw.carouselSlides : [],
      storyText: raw.storyText || '',
      platformVariants: raw.platformVariants || {},
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
    buildUserPrompt: (inp) => {
      const list = targets.map((k) => TRANSFORM_PLATFORMS[k] || k).join(', ');
      return `Contenuto sorgente:\n${inp.sourceText || inp.topic || ''}\n\n${baseContext(inp)}\n\nAdatta per: ${list}.\nRispondi JSON: {"platformVariants":{"instagram_post":"","instagram_story":"","facebook_post":"","linkedin_post":"","twitter_post":""}}`;
    },
    parseOutput: (raw) => ({
      platformVariants: raw.platformVariants || {},
      sourceText: input.sourceText || input.topic || '',
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
      `${baseContext(inp)}\n\nGenera una CTA efficace.\nRispondi JSON: {"cta":"..."}`,
    parseOutput: (raw) => ({ cta: raw.cta || '' }),
  });
}

export async function generateReelIdea(userDocId, input, brandId) {
  return runAi({
    userDocId,
    type: 'reel_idea',
    input,
    brandId,
    buildUserPrompt: (inp) =>
      `${baseContext(inp)}\n\nGenera idea per Reel (hook, corpo, CTA).\nRispondi JSON: {"reelIdea":"..."}`,
    parseOutput: (raw) => ({ reelIdea: raw.reelIdea || '' }),
  });
}

export async function generateCarouselIdea(userDocId, input, brandId) {
  return runAi({
    userDocId,
    type: 'carousel',
    input,
    brandId,
    buildUserPrompt: (inp) =>
      `${baseContext(inp)}\n\nGenera idea carosello (3-5 slide).\nRispondi JSON: {"carouselSlides":["..."]}`,
    parseOutput: (raw) => ({
      carouselSlides: Array.isArray(raw.carouselSlides) ? raw.carouselSlides : [],
    }),
  });
}

export { TRANSFORM_PLATFORMS };
