import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import {
  prefersResponsesApi,
  resolveTemperature,
  supportsSamplingParams,
} from './openaiModelUtils.js';

const OPENAI_BASE = 'https://api.openai.com/v1';

export function isOpenAIConfigured() {
  return Boolean(config.openai.apiKey?.trim());
}

function authHeaders() {
  return {
    Authorization: `Bearer ${config.openai.apiKey}`,
    'Content-Type': 'application/json',
  };
}

function extractResponsesText(data) {
  if (typeof data.output_text === 'string' && data.output_text.length > 0) {
    return data.output_text;
  }

  for (const item of data.output || []) {
    if (item.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part.type === 'output_text' && part.text) {
        return part.text;
      }
    }
  }

  return null;
}

async function callResponsesApi({ model, system, user, json }) {
  const body = {
    model,
    input: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    reasoning: { effort: config.openai.reasoningEffort },
  };

  if (json) {
    body.text = { format: { type: 'json_object' } };
  }

  const res = await fetch(`${OPENAI_BASE}/responses`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    logger.error('OpenAI Responses API error', {
      status: res.status,
      type: data.error?.type,
      model,
    });
    const err = new Error(data.error?.message || 'Errore generazione AI');
    err.code = 'AI_PROVIDER_ERROR';
    err.status = 502;
    throw err;
  }

  if (data.status === 'incomplete') {
    logger.warn('OpenAI response incomplete', {
      model,
      reason: data.incomplete_details?.reason,
    });
  }

  const content = extractResponsesText(data);
  if (!content) {
    const err = new Error('Risposta AI vuota');
    err.code = 'AI_EMPTY_RESPONSE';
    err.status = 502;
    throw err;
  }

  return content;
}

async function callChatCompletionsApi({ model, system, user, json }) {
  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };

  const temperature = resolveTemperature(model, config.openai.temperature);
  if (temperature !== undefined) {
    body.temperature = temperature;
  }

  if (json) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    logger.error('OpenAI Chat Completions error', {
      status: res.status,
      type: data.error?.type,
      model,
      sampling: supportsSamplingParams(model),
    });
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

  return content;
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

  const model = config.openai.model;
  const useResponses = prefersResponsesApi(model);

  const rawText = useResponses
    ? await callResponsesApi({ model, system, user, json })
    : await callChatCompletionsApi({ model, system, user, json });

  if (json) {
    try {
      return JSON.parse(rawText);
    } catch {
      const err = new Error('Formato risposta AI non valido');
      err.code = 'AI_PARSE_ERROR';
      err.status = 502;
      throw err;
    }
  }

  return rawText;
}

export function getOpenAIClientInfo() {
  const model = config.openai.model;
  return {
    model,
    api: prefersResponsesApi(model) ? 'responses' : 'chat_completions',
    supportsTemperature: supportsSamplingParams(model),
    reasoningEffort: prefersResponsesApi(model) ? config.openai.reasoningEffort : null,
  };
}
