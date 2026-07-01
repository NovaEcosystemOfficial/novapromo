import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { isOpenAIConfigured } from './openaiService.js';
import { CREATIVE_FORMATS } from '../constants/aiCredits.js';

const OPENAI_BASE = 'https://api.openai.com/v1';

function authHeaders() {
  return {
    Authorization: `Bearer ${config.openai.apiKey}`,
    'Content-Type': 'application/json',
  };
}

export function resolveImageSize(format = 'square') {
  return CREATIVE_FORMATS[format]?.size || CREATIVE_FORMATS.square.size;
}

/**
 * Generate image via OpenAI Images API (backend only).
 * @returns {Promise<Buffer>}
 */
export async function generateImageBuffer({ prompt, format = 'square' }) {
  if (!isOpenAIConfigured()) {
    const err = new Error('AI non configurata — aggiungi OPENAI_API_KEY al backend');
    err.code = 'AI_NOT_CONFIGURED';
    err.status = 503;
    throw err;
  }

  const model = config.openai.imageModel || 'gpt-image-1';
  const size = resolveImageSize(format);

  const body = {
    model,
    prompt: String(prompt).slice(0, 4000),
    size,
    n: 1,
  };

  const res = await fetch(`${OPENAI_BASE}/images/generations`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    logger.error('OpenAI Images API error', {
      status: res.status,
      type: data.error?.type,
      model,
      size,
    });
    const err = new Error(data.error?.message || 'Generazione immagine AI fallita');
    err.code = 'AI_IMAGE_ERROR';
    err.status = 502;
    throw err;
  }

  const item = data.data?.[0];
  if (item?.b64_json) {
    return Buffer.from(item.b64_json, 'base64');
  }

  if (item?.url) {
    const imgRes = await fetch(item.url);
    if (!imgRes.ok) {
      const err = new Error('Download immagine generata fallito');
      err.code = 'AI_IMAGE_DOWNLOAD_ERROR';
      err.status = 502;
      throw err;
    }
    const arr = await imgRes.arrayBuffer();
    return Buffer.from(arr);
  }

  const err = new Error('Risposta immagine AI vuota');
  err.code = 'AI_IMAGE_EMPTY';
  err.status = 502;
  throw err;
}
