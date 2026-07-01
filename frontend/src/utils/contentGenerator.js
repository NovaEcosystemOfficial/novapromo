const TONE_TEMPLATES = {
  professionale: (project) =>
    `Scopri ${project}: qualità, affidabilità e risultati concreti. La scelta intelligente per chi punta all'eccellenza.`,
  hype: (project) =>
    `🔥 ${project} è LIVE e sta spaccando! Non restare fuori — questo è il momento! ⚡`,
  ironico: (project) =>
    `Dicevano che ${project} non avrebbe funzionato. Plot twist: funziona. E anche bene. 😏`,
  motivazionale: (project) =>
    `Ogni giorno è un'opportunità. Con ${project}, trasforma l'intenzione in azione. Inizia oggi. 💪`,
  misterioso: (project) =>
    `Qualcosa sta arrivando con ${project}... Non siamo ancora pronti a rivelare tutto. Resta connesso. 👀`,
};

const HASHTAG_SETS = {
  instagram: ['#novapromo', '#marketing', '#socialmedia', '#brand', '#content'],
  facebook: ['#novapromo', '#facebook', '#marketing', '#brand', '#community'],
  multi: ['#novapromo', '#instagram', '#facebook', '#brand', '#socialmedia'],
  tiktok: ['#fyp', '#foryou', '#viral', '#trending', '#novapromo'],
  both: ['#novapromo', '#marketing', '#fyp', '#brand', '#viral'],
};

export function generateContent({ project, platform, tone }) {
  const templateFn = TONE_TEMPLATES[tone] || TONE_TEMPLATES.professionale;
  const caption = templateFn(project);
  const tags = HASHTAG_SETS[platform] || HASHTAG_SETS.both;
  const hashtags = tags.map((t) => `${t}${project.replace(/\s+/g, '').toLowerCase()}`).join(' ');

  return { caption, hashtags };
}
