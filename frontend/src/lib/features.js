/** Feature flags — TikTok disabilitato di default (desktop Instagram focus). */

export function isTikTokEnabled() {
  return import.meta.env.VITE_TIKTOK_ENABLED === 'true';
}
