export const PROJECTS = [
  { id: 'NovaDocs', name: 'NovaDocs', color: '#8b5cf6', colorRgb: '139, 92, 246' },
  { id: 'NovaMobile', name: 'NovaMobile', color: '#3b82f6', colorRgb: '59, 130, 246' },
  { id: 'NovaWeb', name: 'NovaWeb', color: '#38bdf8', colorRgb: '56, 189, 248' },
  { id: 'Beauty Souls', name: 'Beauty Souls', color: '#ec4899', colorRgb: '236, 72, 153' },
  { id: 'NovaTK', name: 'NovaTK', color: '#22c55e', colorRgb: '34, 197, 94' },
  { id: 'Ryuk', name: 'Ryuk', color: '#f97316', colorRgb: '249, 115, 22' },
  { id: 'ECHO-0', name: 'ECHO-0', color: '#ef4444', colorRgb: '239, 68, 68' },
];

export const PROJECT_MAP = Object.fromEntries(PROJECTS.map((p) => [p.id, p]));

export function getProjectColor(project) {
  return PROJECT_MAP[project]?.color || '#6c5ce7';
}

export const CONTENT_TYPES = [
  { id: 'post', label: 'Post', platforms: ['instagram', 'facebook', 'both', 'multi'] },
  { id: 'story', label: 'Instagram Story', platforms: ['instagram', 'both', 'multi'] },
  { id: 'reel', label: 'Instagram Reel', platforms: ['instagram', 'both', 'multi'] },
  { id: 'tiktok_video', label: 'TikTok Video', platforms: ['tiktok', 'both'] },
  { id: 'behind_scenes', label: 'Dietro le quinte', platforms: ['instagram', 'facebook', 'tiktok', 'both', 'multi'] },
  { id: 'roadmap', label: 'Roadmap', platforms: ['instagram', 'facebook', 'tiktok', 'both', 'multi'] },
  { id: 'annuncio', label: 'Annuncio aggiornamento', platforms: ['instagram', 'facebook', 'tiktok', 'both', 'multi'] },
];

export const TONES = [
  { id: 'professionale', label: 'Professionale' },
  { id: 'hype', label: 'Hype' },
  { id: 'ironico', label: 'Ironico' },
  { id: 'misterioso', label: 'Misterioso' },
  { id: 'motivazionale', label: 'Motivazionale' },
];

export const PROJECT_SUGGESTIONS = {
  NovaDocs: { platform: 'instagram', contentType: 'story', minDays: 3 },
  NovaMobile: { platform: 'instagram', contentType: 'post', minDays: 4 },
  NovaWeb: { platform: 'instagram', contentType: 'reel', minDays: 3 },
  'Beauty Souls': { platform: 'instagram', contentType: 'reel', minDays: 3 },
  NovaTK: { platform: 'tiktok', contentType: 'tiktok_video', minDays: 4 },
  Ryuk: { platform: 'tiktok', contentType: 'tiktok_video', minDays: 4 },
  'ECHO-0': { platform: 'instagram', contentType: 'story', minDays: 5 },
};
