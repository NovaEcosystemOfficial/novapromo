export const STATUS_LABELS = {
  draft: 'Bozza',
  scheduled: 'Programmato',
  published: 'Pubblicato',
  error: 'Errore',
};

export const PLATFORM_LABELS = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  both: 'Entrambi',
};

export const CONTENT_TYPE_LABELS = {
  post: 'Post',
  story: 'Storia',
  reel: 'Reel',
  tiktok_video: 'TikTok Video',
  behind_scenes: 'Dietro le quinte',
  roadmap: 'Roadmap',
  annuncio: 'Annuncio aggiornamento',
};

export const TONE_LABELS = {
  professionale: 'Professionale',
  hype: 'Hype',
  ironico: 'Ironico',
  motivazionale: 'Motivazionale',
  misterioso: 'Misterioso',
};

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
