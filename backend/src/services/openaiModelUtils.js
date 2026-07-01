/**
 * OpenAI model capability helpers.
 * Reasoning models (gpt-5*, o1, o3, o4) reject custom temperature / top_p.
 */

const CHAT_VARIANT_PATTERN = /gpt-5[\w.-]*chat/i;

/**
 * Models that support temperature (gpt-4o, gpt-4o-mini, gpt-5-chat-latest, etc.)
 */
export function supportsSamplingParams(model) {
  const m = String(model || '').trim().toLowerCase();
  if (!m) return true;
  if (CHAT_VARIANT_PATTERN.test(m)) return true;
  if (/^(o1|o3|o4)(-|$)/.test(m)) return false;
  if (/^gpt-5/.test(m)) return false;
  return true;
}

/**
 * Reasoning models — prefer Responses API (gpt-5.5, o-series, etc.)
 */
export function prefersResponsesApi(model) {
  const m = String(model || '').trim().toLowerCase();
  if (!m) return false;
  if (CHAT_VARIANT_PATTERN.test(m)) return false;
  if (/^(o1|o3|o4)(-|$)/.test(m)) return true;
  if (/^gpt-5/.test(m)) return true;
  return false;
}

export function resolveTemperature(model, configuredTemp) {
  if (!supportsSamplingParams(model)) {
    return undefined;
  }
  const temp = Number(configuredTemp);
  if (!Number.isFinite(temp)) return 0.7;
  return Math.min(2, Math.max(0, temp));
}
