import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export function isOpenAIConfigured() {
  return Boolean(config.openai.apiKey?.trim());
}

/**
 * @param {{ system: string, user: string, json?: boolean }} params
 */
export async function chatCompletion({ system, user, json = true }) {
  if (!isOpenAIConfigured()) {
    const err = new Error('AI non configurata — aggiungi OPENAI_API_KEY al backend');
    err.code = 'AI_NOT_CONFIGURED';
    err.status = 503;
    throw err;
  }

  const body = {
    model: config.openai.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.7,
  };

  if (json) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openai.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    logger.error('OpenAI API error', { status: res.status, type: data.error?.type });
    const err = new Error(data.error?.message || 'Errore generazione AI');
    err.code = 'AI_PROVIDER_ERROR';
    err.status = 502;
    throw err;
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    const err = new Error('Risposta AI vuota');
    err.code = 'AI_EMPTY_RESPONSE';
    err.status = 502;
    throw err;
  }

  if (json) {
    try {
      return JSON.parse(content);
    } catch {
      const err = new Error('Formato risposta AI non valido');
      err.code = 'AI_PARSE_ERROR';
      err.status = 502;
      throw err;
    }
  }

  return content;
}
