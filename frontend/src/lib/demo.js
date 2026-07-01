/** Modalità demo: frontend senza backend (es. deploy Vercel fase 1). */

export function isDemoMode() {
  return import.meta.env.VITE_DEMO_MODE === 'true';
}

export const DEMO_USER = {
  uid: 'demo:web',
  displayName: 'NovaPromo Demo',
  username: 'novapromo',
  avatarUrl: null,
};

export const DEMO_BACKEND_MESSAGE =
  'Backend non disponibile. Stai usando NovaPromo in modalità demo (solo interfaccia).';

export function getDemoAuthPayload() {
  return {
    authenticated: true,
    mode: 'demo',
    user: DEMO_USER,
    instagram: {
      connected: false,
      mode: 'REAL',
      connectionStatus: 'disconnected',
      username: null,
      canStartOAuth: false,
    },
    tiktok: {
      connected: false,
      tokenStatus: 'paused',
      tokenStatusLabel: 'In pausa',
      paused: true,
    },
  };
}

export function getDemoDashboardStats() {
  return {
    metrics: {
      postsThisMonth: 0,
      totalViews: 0,
      publishedToday: 0,
      streak: 0,
      lastPublished: null,
    },
    posts: { draft: 0, scheduled: 0, published: 0, failed: 0 },
    suggestions: [
      {
        id: 'demo-connect-backend',
        title: 'Collega il backend',
        body: 'Deploy del progetto API su Vercel per OAuth Instagram e pubblicazione.',
        action: 'accounts',
      },
    ],
    integrations: getDemoIntegrationsStatus(),
  };
}

export function getDemoIntegrationsStatus() {
  return {
    instagram: {
      platform: 'instagram',
      name: 'Instagram (Meta)',
      mode: 'REAL',
      connected: false,
      connectionStatus: 'disconnected',
      tokenPresent: false,
      accountId: null,
      accountUsername: null,
      instagramAccountId: null,
      profile: null,
      canStartOAuth: false,
      credentialsError: null,
      redirectUri: null,
      nextStep: 'Backend non deployato — OAuth Instagram non disponibile',
      errors: [],
    },
    facebook: {
      platform: 'facebook',
      name: 'Facebook Page',
      mode: 'REAL',
      connected: false,
      connectionStatus: 'disconnected',
      tokenPresent: false,
      accountId: null,
      accountUsername: null,
      facebookPageId: null,
      pageName: null,
      profile: null,
      canStartOAuth: false,
      credentialsPresent: false,
      credentialsError: 'Backend non deployato — OAuth Facebook non disponibile',
      redirectUri: null,
      nextStep: 'Backend non deployato — collega Pagina Facebook',
      errors: [],
      setupChecklist: [
        'Meta Developers → Nova_Promo → Domini app: novapromo.vercel.app, novapromo-backend.vercel.app',
        'Facebook Login → URI OAuth: https://novapromo-backend.vercel.app/api/oauth/facebook/callback',
      ],
    },
    tiktok: {
      platform: 'tiktok',
      mode: 'PAUSED',
      paused: true,
      connectionStatus: 'paused',
      tokenPresent: false,
      nextStep: 'Integrazione TikTok in pausa',
    },
  };
}

export function isNetworkError(err) {
  if (!err) return false;
  if (err.name === 'TypeError' && /fetch|network|failed/i.test(err.message)) return true;
  return err.status === 0 || err.code === 'BACKEND_UNAVAILABLE';
}

/** Risolve risposte demo per path API (solo lettura / auth locale). */
export function resolveDemoResponse(path, method = 'GET') {
  if (!isDemoMode()) return null;

  const m = method.toUpperCase();

  if (path === '/api/auth/local/enter' && m === 'POST') return getDemoAuthPayload();
  if (path === '/api/auth/me' && m === 'GET') return getDemoAuthPayload();
  if (path === '/api/auth/logout' && m === 'POST') return { success: true };
  if (path === '/api/dashboard/stats' && m === 'GET') return getDemoDashboardStats();
  if (path === '/api/dashboard/events' && m === 'GET') return { event: null };
  if (path === '/api/oauth/accounts' && m === 'GET') return [];
  if (path === '/api/integrations/status' && m === 'GET') return getDemoIntegrationsStatus();
  if (path === '/api/oauth/integrations/status' && m === 'GET') return getDemoIntegrationsStatus();
  if (path.startsWith('/api/posts') && m === 'GET') {
    if (path === '/api/posts' || path.startsWith('/api/posts?')) return [];
    if (path.startsWith('/api/posts/logs')) return [];
    return null;
  }
  if (path === '/api/config/features' && m === 'GET') {
    return {
      tiktokEnabled: false,
      instagramEnabled: true,
      runtime: 'web',
      isDesktop: false,
      isVercel: true,
      demoMode: true,
    };
  }

  return null;
}

export class BackendUnavailableError extends Error {
  constructor(message = DEMO_BACKEND_MESSAGE) {
    super(message);
    this.name = 'BackendUnavailableError';
    this.code = 'BACKEND_UNAVAILABLE';
  }
}
