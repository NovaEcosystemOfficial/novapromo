/** Feature flags */

export function isTikTokEnabled() {
  return import.meta.env.VITE_TIKTOK_ENABLED === 'true';
}

export { isDemoMode } from './demo.js';
