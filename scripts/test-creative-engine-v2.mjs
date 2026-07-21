/**
 * Smoke test — Creative Engine V2 director process (no OpenAI / network).
 * Run: node scripts/test-creative-engine-v2.mjs
 */

import { buildCreativeBrief } from '../backend/src/services/creative-engine-v2/CreativeBrief.js';
import { selectStyleFromBrief, listStyles } from '../backend/src/services/creative-engine-v2/StyleEngine.js';
import { planLayout, listLayouts } from '../backend/src/services/creative-engine-v2/LayoutPlanner.js';
import { resolveTemplate } from '../backend/src/services/creative-engine-v2/TemplateEngine.js';
import { composePrompts } from '../backend/src/services/creative-engine-v2/PromptComposer.js';
import { assemblePost } from '../backend/src/services/creative-engine-v2/PostAssembler.js';
import { reinforcePrompt } from '../backend/src/services/creative-engine-v2/QualityChecker.js';
import { buildAndLogReport } from '../backend/src/services/creative-engine-v2/CreativeReport.js';
import {
  DIRECTOR_STYLES,
  LAYOUT_TYPES,
  ENGINE_ID,
  FUTURE_OUTPUT_TYPES,
  QUALITY_SCORE_THRESHOLD,
} from '../backend/src/services/creative-engine-v2/constants.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const brandAnalysis = {
  brandId: 'nova-promo',
  companyName: 'NovaPromo',
  sector: 'SaaS MarTech',
  shortDescription: 'Autopublisher social AI',
  mission: 'Automate social publishing',
  palette: ['#7C3AED', '#F97316', '#0B0B0F'],
  toneOfVoice: ['professionale', 'tecnico'],
  target: { audienceType: 'founder', profession: 'marketer', ageRange: '25-45' },
  wordsToUse: ['automazione'],
  wordsToAvoid: ['clickbait'],
  hashtags: ['#NovaPromo'],
  preferredCtas: ['Prova gratis', 'Scopri di più'],
  marketingGoals: ['brand_awareness'],
  graphicStyles: ['tech', 'premium'],
  hasBrandIntelligence: true,
  summary: 'Brand: NovaPromo',
  project: 'Demo Launch',
};

const params = {
  idea: 'Lancio Nova Creative Engine V2 come direttore creativo AI',
  platform: 'instagram',
  format: 'square',
  style: 'tech',
  project: 'Demo Launch',
  includeImage: true,
  includeVideoPrompt: true,
};

const brief = buildCreativeBrief({ brandAnalysis, params });
assert(brief.projectName === 'Demo Launch', 'brief project');
assert(brief.objective, 'brief objective');
assert(brief.palette.length > 0, 'brief palette');
assert(brief.cta, 'brief cta');

const stylePack = selectStyleFromBrief(brief);
assert(DIRECTOR_STYLES.includes(stylePack.id), 'style from brief must be director style');
assert(stylePack.label, 'style label');

const template = resolveTemplate({ platform: 'instagram', format: 'square' });
const layout = planLayout({
  brief,
  styleId: stylePack.id,
  format: 'square',
  templateId: template.id,
});
assert(LAYOUT_TYPES.includes(layout.id), 'layout id valid');
assert(layout.chosenAt, 'layout persisted timestamp');

const prompts = composePrompts({
  brief,
  stylePack,
  layout,
  template,
  includeVideoPrompt: true,
  brandAnalysis,
});

assert(prompts.imagePrompt.length > 800, 'image prompt must be long');
assert(/NEGATIVE PROMPT/i.test(prompts.imagePrompt), 'negative prompt');
assert(/PHOTOGRAPHY DIRECTION/i.test(prompts.imagePrompt), 'photography');
assert(/Camera|optics/i.test(prompts.imagePrompt), 'optics');
assert(/illumin/i.test(prompts.imagePrompt) || /Lighting/i.test(prompts.imagePrompt), 'lighting');
assert(/texture|Materials/i.test(prompts.imagePrompt), 'materials');
assert(/MARKETING OBJECTIVE/i.test(prompts.imagePrompt), 'marketing objective');

const director = {
  conceptId: stylePack.id,
  conceptLabel: stylePack.label,
  styleId: stylePack.id,
  rationale: 'Test',
  marketingObjective: brief.objective,
  ctaStrategy: brief.cta,
  tonePlan: brief.toneOfVoice.join(', '),
  photographyMode: true,
  stylePack,
};

const quality = {
  pass: true,
  score: 86,
  threshold: QUALITY_SCORE_THRESHOLD,
  dimensions: {
    brandCoherence: 88,
    readability: 84,
    composition: 86,
    cleanliness: 90,
    realism: 82,
    color: 85,
    contrast: 84,
    balance: 87,
  },
  issues: [],
  shouldRegenerate: false,
};

const report = buildAndLogReport({
  brief,
  stylePack,
  layout,
  prompts,
  quality,
  startedAt: Date.now() - 1200,
  userDocId: 'test',
});

assert(report.style.id === stylePack.id, 'report style');
assert(report.layout.id === layout.id, 'report layout');
assert(report.qualityScore.score === 86, 'report quality');
assert(report.elapsedMs >= 1000, 'report timing');

const pack = assemblePost({
  rawPack: {
    caption: 'NovaPromo accelera il publishing.',
    hashtags: '#NovaPromo #AI',
    cta: 'Prova gratis',
    altText: 'Creatività NovaPromo',
    variantA: { caption: 'A', cta: 'A' },
    variantB: { caption: 'B', cta: 'B' },
    storyCopy: 'Story copy',
    reelCoverLine: 'Cover',
    carouselSlides: [{ title: '1', body: 'Hook' }],
    platformVariants: {},
  },
  params,
  brandAnalysis,
  director,
  layout,
  template,
  prompts,
  asset: { imageUrl: 'https://example.com/x.png', storagePath: 'ai/x.png', imageMimeType: 'image/png' },
  quality,
  brief,
  report,
});

assert(pack.engine.id === ENGINE_ID, 'engine id');
assert(pack.creativeBrief?.projectName === 'Demo Launch', 'pack brief');
assert(pack.engine.qualityScore === 86, 'pack quality score');
assert(pack.engine.report?.elapsedMs != null, 'pack report');
assert(FUTURE_OUTPUT_TYPES.carousel.status === 'planned', 'future carousel');
assert(FUTURE_OUTPUT_TYPES.story.status === 'planned', 'future story');
assert(FUTURE_OUTPUT_TYPES.reelCover.status === 'planned', 'future reel cover');
assert(FUTURE_OUTPUT_TYPES.productMockup.status === 'planned', 'future mockup');

const reinforced = reinforcePrompt(prompts.imagePrompt, {
  score: 60,
  threshold: QUALITY_SCORE_THRESHOLD,
  issues: ['composizione'],
  dimensions: { composition: 55, realism: 60 },
});
assert(reinforced.includes('CRITICAL QUALITY'), 'reinforce');

assert(listStyles().length === DIRECTOR_STYLES.length, 'list styles');
assert(listLayouts().length === LAYOUT_TYPES.length, 'list layouts');

// Style must not be random for same brief
const style2 = selectStyleFromBrief(brief);
assert(style2.id === stylePack.id, 'style selection deterministic');

console.log('OK — Creative Engine V2 director smoke test passed');
console.log({
  engine: ENGINE_ID,
  brief: brief.projectName,
  style: stylePack.id,
  layout: layout.id,
  promptChars: prompts.imagePrompt.length,
  qualityThreshold: QUALITY_SCORE_THRESHOLD,
  futureOutputs: Object.keys(FUTURE_OUTPUT_TYPES).length,
});
