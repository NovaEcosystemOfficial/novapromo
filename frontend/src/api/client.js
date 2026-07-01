import { getApiBaseUrl } from '../lib/runtime.js';
import {
  isDemoMode,
  resolveDemoResponse,
  isNetworkError,
  BackendUnavailableError,
  DEMO_BACKEND_MESSAGE,
} from '../lib/demo.js';

const API_BASE = getApiBaseUrl();

const defaultFetchOpts = { credentials: 'include' };

async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();

  const demoData = resolveDemoResponse(path, method);
  if (demoData !== null) {
    return demoData;
  }

  if (isDemoMode()) {
    throw new BackendUnavailableError();
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...defaultFetchOpts, ...options });
  } catch (err) {
    if (isNetworkError(err)) {
      throw new BackendUnavailableError();
    }
    throw err;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || data.credentialsError || `HTTP ${res.status}`);
    err.code = data.code;
    err.status = res.status;
    err.details = data;
    throw err;
  }

  return data;
}

export const api = {
  getFeatures: () => request('/api/config/features'),

  enterLocalApp: () =>
    request('/api/auth/local/enter', { method: 'POST' }),

  getTikTokSetup: () => request('/api/auth/tiktok/setup'),

  startTikTokLogin: () => request('/api/auth/tiktok/start'),

  exchangeTikTokCode: (code, state) =>
    request('/api/auth/tiktok/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
    }),

  getFirebaseToken: () => request('/api/auth/firebase-token'),

  getMe: () => request('/api/auth/me'),

  logout: () => request('/api/auth/logout', { method: 'POST' }),

  getDashboard: () => request('/api/dashboard/stats'),

  getDesktopEvents: () => request('/api/dashboard/events'),

  getPosts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/posts${qs ? `?${qs}` : ''}`);
  },

  getPost: (id) => request(`/api/posts/${id}`),

  getBillingStatus: () => request('/api/billing/status'),

  getBrands: () => request('/api/brands'),

  getAiStatus: () => request('/api/ai/status'),

  aiGenerateCaption: (body) =>
    request('/api/ai/generate-caption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  aiGenerateHashtags: (body) =>
    request('/api/ai/generate-hashtags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  aiGenerateContentPack: (body) =>
    request('/api/ai/generate-content-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  aiTransformContent: (body) =>
    request('/api/ai/transform-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  aiCreativePack: (body) =>
    request('/api/ai/creative-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  generateContent: (body) =>
    request('/api/posts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  createPost: (body) =>
    request('/api/posts/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  createDraft: (formData) =>
    fetch(`${API_BASE}/api/posts/draft`, { method: 'POST', body: formData, credentials: 'include' }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore creazione bozza');
      return data;
    }),

  updatePost: (id, formData) =>
    fetch(`${API_BASE}/api/posts/${id}`, { method: 'PUT', body: formData, credentials: 'include' }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore aggiornamento');
      return data;
    }),

  schedulePost: (id, scheduledAt) =>
    request(`/api/posts/${id}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt }),
    }),

  publishPost: (id) => request(`/api/posts/${id}/publish`, { method: 'POST' }),

  deletePost: (id) => request(`/api/posts/${id}`, { method: 'DELETE' }),

  getLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/posts/logs${qs ? `?${qs}` : ''}`);
  },

  getAccounts: () => request('/api/oauth/accounts'),

  getIntegrationsStatus: () => request('/api/integrations/status'),

  deleteAccount: (id) => request(`/api/oauth/accounts/${id}`, { method: 'DELETE' }),

  startInstagramOAuth: () => request('/api/oauth/instagram/start'),

  startFacebookOAuth: () => request('/api/oauth/facebook/start'),

  startTikTokContentOAuth: () => request('/api/oauth/tiktok/start'),

  refreshInstagramToken: () => request('/api/oauth/instagram/refresh', { method: 'POST' }),

  refreshTikTokToken: () => request('/api/oauth/tiktok/refresh', { method: 'POST' }),

  getTikTokReviewStatus: () => request('/api/tiktok/review/status'),

  tiktokDirectPost: (formData) =>
    fetch(`${API_BASE}/api/tiktok/review/direct-post`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore pubblicazione TikTok');
      return data;
    }),
};

export { DEMO_BACKEND_MESSAGE, BackendUnavailableError };
