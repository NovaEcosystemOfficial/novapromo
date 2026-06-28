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

export function getProjectStyle(project) {
  const p = PROJECT_MAP[project];
  if (!p) return {};
  return {
    '--project-color': p.color,
    '--project-rgb': p.colorRgb,
    borderLeftColor: p.color,
    background: `rgba(${p.colorRgb}, 0.12)`,
  };
}

export const CONTENT_TYPES = [
  { id: 'post', label: 'Instagram Post', platforms: ['instagram', 'both'] },
  { id: 'story', label: 'Instagram Story', platforms: ['instagram', 'both'] },
  { id: 'reel', label: 'Instagram Reel', platforms: ['instagram', 'both'] },
  { id: 'tiktok_video', label: 'TikTok Video', platforms: ['tiktok', 'both'] },
  { id: 'behind_scenes', label: 'Dietro le quinte', platforms: ['instagram', 'tiktok', 'both'] },
  { id: 'roadmap', label: 'Roadmap', platforms: ['instagram', 'tiktok', 'both'] },
  { id: 'annuncio', label: 'Annuncio aggiornamento', platforms: ['instagram', 'tiktok', 'both'] },
];

export const TONES = [
  { id: 'professionale', label: 'Professionale' },
  { id: 'hype', label: 'Hype' },
  { id: 'ironico', label: 'Ironico' },
  { id: 'misterioso', label: 'Misterioso' },
  { id: 'motivazionale', label: 'Motivazionale' },
];

export const TOPIC_EXAMPLES = [
  'NovaDocs 1.1',
  'Cloud Sync',
  'AI Locale',
  'Nuova feature',
  'Behind the scenes',
];

export function formatViews(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
