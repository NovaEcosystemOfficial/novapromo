import { PROJECTS, CONTENT_TYPES, TONES } from '../constants/projects.js';

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

export function generateContent({ project, platform, contentType, tone, topic }) {
  const subject = topic || project;
  const opener = (TONE_OPENERS[tone] || TONE_OPENERS.professionale)(subject, project);
  const body = (TYPE_BODY[contentType] || TYPE_BODY.post)(subject);
  const caption = `${opener}\n\n${body}\n\n${CTA_BY_TONE[tone] || CTA_BY_TONE.professionale}`;

  const baseTags = HASHTAG_BASE[project] || ['#NovaPromo'];
  const platformTags = platform === 'tiktok' ? ['#fyp', '#foryou'] : ['#instagram', '#reels'];
  const topicTag = `#${subject.replace(/[^a-zA-Z0-9]/g, '')}`;
  const hashtags = [...baseTags, ...platformTags, topicTag].slice(0, 8).join(' ');

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
    cta: CTA_BY_TONE[tone] || CTA_BY_TONE.professionale,
    overlayTitle,
  };
}

export { PROJECTS, CONTENT_TYPES, TONES };
