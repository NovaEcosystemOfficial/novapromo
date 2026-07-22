/** Feature flags */

export function isTikTokEnabled() {
  return import.meta.env.VITE_TIKTOK_ENABLED === 'true';
}

/**
 * Nova Creative Engine is the definitive Creative Studio engine.
 * Disable only with VITE_CREATIVE_ENGINE_V2=false (emergency rollback).
 */
export function isCreativeEngineEnabled() {
  const flag = import.meta.env.VITE_CREATIVE_ENGINE_V2;
  if (flag === 'false') return false;
  return true;
}

/** @deprecated beta gate removed — alias of isCreativeEngineEnabled */
export function isCreativeEngineV2BetaVisible() {
  return isCreativeEngineEnabled();
}

export { isDemoMode } from './demo.js';
