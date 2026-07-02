import { PROJECTS, CONTENT_TYPES, TONES } from '../constants/projects.js';
import {
  buildBrandAiContext,
  resolveBrandToneForGenerator,
} from './brand/brandSchema.js';

const TONE_OPENERS = {
  professionale: (topic, project) => `${topic} — l'evoluzione di ${project} che stavi aspettando.`,
  hype: (topic, project) => `🔥 ${topic} è QUI! ${project} non sarà più lo stesso. ⚡`,
  ironico: (topic, project) => `Ancora non hai provato ${topic}? ${project} ti aspetta. Nessun dramma. 😏`,
  motivazionale: (topic, project) => `${topic}: il prossimo passo con ${project}. Tu puoi. 💪`,
  misterioso: (topic, project) => `${topic}... qualcosa si muove in ${project}. Resta sintonizzato. 👀`,
};

const TYPE_BODY = {
  post: (topic) => `Ecco cosa cambia con ${topic}: più velocità, più controllo, più risultati.`,
  story: (topic) => `Swipe → scopri ${topic} in 15 secondi. Salva per dopo.`,
  reel: (topic) => `POV: scopri ${topic} e capisci perché tutti ne parlano. 🎬`,
  tiktok_video: (topic) => `${topic} spiegato in 30 secondi. Guarda fino alla fine.`,
  behind_scenes: (topic) => `Dietro le quinte di ${topic}. Come l'abbiamo costruito, senza filtri.`,
  roadmap: (topic) => `Roadmap update: ${topic} è in arrivo. Ecco la timeline.`,
  annuncio: (topic) => `📢 Annuncio ufficiale: ${topic}. Segna la data.`,
};

const CTA_BY_TONE = {
  professionale: 'Scopri di più nel link in bio →',
  hype: 'Corri al link in bio prima che finisca! →',
  ironico: 'Link in bio. O continua a scrollare, tanto.',
  motivazionale: 'Inizia oggi — link in bio →',
  misterioso: 'Qualcosa ti aspetta in bio... →',
};

const HASHTAG_BASE = {
  NovaDocs: ['#NovaDocs', '#produttività', '#docs', '#workflow'],
  NovaMobile: ['#NovaMobile', '#mobile', '#app', '#tech'],
  NovaWeb: ['#NovaWeb', '#webdev', '#saas', '#startup'],
  'Beauty Souls': ['#BeautySouls', '#beauty', '#skincare', '#reels'],
  NovaTK: ['#NovaTK', '#tiktok', '#creator', '#viral'],
  Ryuk: ['#Ryuk', '#anime', '#content', '#fyp'],
  'ECHO-0': ['#ECHO0', '#gaming', '#tech', '#mystery'],
};

function pickBrandCta(brandContext, tone) {
  if (brandContext?.preferredCtas?.length) {
    return brandContext.preferredCtas[0];
  }
  return CTA_BY_TONE[tone] || CTA_BY_TONE.professionale;
}

function buildHashtags({ project, platform, topic, brandContext }) {
  const brandTags = (brandContext?.hashtags || [])
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

  if (brandTags.length) {
    const platformTags = platform === 'tiktok' ? ['#fyp', '#foryou'] : ['#instagram', '#reels'];
    return [...brandTags, ...platformTags].slice(0, 8).join(' ');
  }

  const subject = topic || project;
  const baseTags = HASHTAG_BASE[project] || ['#NovaPromo'];
  const platformTags = platform === 'tiktok' ? ['#fyp', '#foryou'] : ['#instagram', '#reels'];
  const topicTag = `#${subject.replace(/[^a-zA-Z0-9]/g, '')}`;
  return [...baseTags, ...platformTags, topicTag].slice(0, 8).join(' ');
}

function applyBrandWords(caption, brandContext) {
  let result = caption;
  const wordsToUse = brandContext?.wordsToUse || [];

  if (wordsToUse.length && !wordsToUse.some((word) => result.toLowerCase().includes(word.toLowerCase()))) {
    result = `${result}\n\n${wordsToUse.slice(0, 2).join(' · ')}`;
  }

  for (const avoid of brandContext?.wordsToAvoid || []) {
    if (!avoid?.trim()) continue;
    const re = new RegExp(avoid.trim(), 'gi');
    result = result.replace(re, '');
  }

  const emojis = brandContext?.emojis || [];
  if (emojis.length && !/\p{Extended_Pictographic}/u.test(result)) {
    result = `${result} ${emojis[0]}`;
  }

  return result.replace(/\n{3,}/g, '\n\n').trim();
}

function enrichOpener(opener, brandContext) {
  if (!brandContext?.shortDescription) return opener;
  if (opener.length > 120) return opener;
  return `${opener}\n\n${brandContext.shortDescription}`;
}

export function generateContent({ project, platform, contentType, tone, topic, brandProfile }) {
  const brandContext = buildBrandAiContext(brandProfile);
  const resolvedTone = tone || brandContext?.generatorTone || 'professionale';
  const brandName = brandContext?.companyName || project;
  const subject = topic || brandName;

  const opener = enrichOpener(
    (TONE_OPENERS[resolvedTone] || TONE_OPENERS.professionale)(subject, brandName),
    brandContext
  );
  const body = (TYPE_BODY[contentType] || TYPE_BODY.post)(subject);
  const cta = pickBrandCta(brandContext, resolvedTone);
  const caption = applyBrandWords(`${opener}\n\n${body}\n\n${cta}`, brandContext);
  const hashtags = buildHashtags({ project: brandName, platform, topic: subject, brandContext });

  const reelIdea = contentType === 'reel' || contentType === 'tiktok_video'
    ? `Hook (0-2s): testo grande "${subject}"\nCorpo (3-20s): demo veloce / before-after\nFinale: CTA verbale + testo sovrapposto`
    : contentType === 'story'
      ? `3 slide: 1) Teaser "${subject}" 2) Dettaglio chiave 3) CTA swipe up / link`
      : `Formato statico o carosello: titolo bold + 3 bullet sul ${subject}`;

  const overlayTitle = subject.length > 28 ? subject.slice(0, 25) + '…' : subject.toUpperCase();

  return {
    caption,
    hashtags,
    reelIdea,
    cta,
    overlayTitle,
    brandApplied: Boolean(brandContext),
    toneUsed: resolvedTone,
    brandTone: brandContext?.toneOfVoice?.[0] || null,
  };
}

export function resolveGenerationFromBrand({ tone, brandProfile }) {
  if (tone) return { tone, brandSkipped: false };
  const brandTone = resolveBrandToneForGenerator(brandProfile?.toneOfVoice);
  if (brandTone) return { tone: brandTone, brandSkipped: true };
  return { tone: 'professionale', brandSkipped: false };
}

export { PROJECTS, CONTENT_TYPES, TONES };
