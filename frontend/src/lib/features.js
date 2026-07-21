/** Feature flags */

export function isTikTokEnabled() {
  return import.meta.env.VITE_TIKTOK_ENABLED === 'true';
}

/** Show Creative Engine V2 beta toggle in Creative Studio (default ON for UI visibility). */
export function isCreativeEngineV2BetaVisible() {
  const flag = import.meta.env.VITE_CREATIVE_ENGINE_V2_BETA;
  if (flag === 'false') return false;
  return true;
}

export { isDemoMode } from './demo.js';