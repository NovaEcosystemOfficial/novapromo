import { Router } from 'express';
import {
  buildLoginAuthorizationUrl,
  exchangeLoginCode,
  fetchUserProfile,
  revokeAccessToken,
} from '../services/tiktok/tiktokLoginService.js';
import {
  createOAuthState,
  validateAndConsumeOAuthState,
  saveUserSession,
  getSession,
  deleteSession,
  getSessionTokens,
  ensureFreshSessionTokens,
} from '../services/auth/sessionService.js';
import { upsertTikTokUser, createCustomTokenForSession } from '../services/firebase/userService.js';
import { getTikTokConfigStatus, config } from '../config.js';
import { getCookieOptions, getClearCookieOptions } from '../utils/cookieOptions.js';
import { buildLoginCallbackRedirect } from '../utils/appRedirect.js';
import { logger } from '../utils/logger.js';
import { requireTikTokEnabled } from '../middleware/tiktokPaused.js';
import {
  hasLocalSession,
  setLocalSession,
  clearLocalSession,
  LOCAL_USER,
} from '../services/localAuthService.js';
import { getInstagramIntegrationStatus } from '../services/integrationService.js';
import { ensureUserPlan, getBillingStatus } from '../services/planService.js';
import {
  verifyFirebaseIdToken,
  setFirebaseSessionCookie,
  clearFirebaseSessionCookie,
  readFirebaseSessionUid,
} from '../services/auth/firebaseSessionService.js';
import { upsertUserFromFirebaseAuth } from '../services/userProfileService.js';
import { hasFirebaseAdminCredentials } from '../config.js';

const router = Router();

export const SESSION_COOKIE = 'novapromo_session';
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function setSessionCookie(res, sessionId) {
  res.cookie(SESSION_COOKIE, sessionId, getCookieOptions(SESSION_MAX_AGE_MS));
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, getClearCookieOptions());
}

function computeTokenStatus(session, tokens) {
  if (!session || !tokens) return { status: 'disconnected', label: 'Non collegato' };

  const accessExp = session.expiresAt ? new Date(session.expiresAt).getTime() : 0;
  const refreshExp = session.refreshExpiresAt ? new Date(session.refreshExpiresAt).getTime() : null;
  const now = Date.now();

  if (refreshExp && refreshExp < now) {
    return { status: 'expired', label: 'Sessione scaduta', expiresAt: session.expiresAt };
  }
  if (accessExp && accessExp < now) {
    return { status: 'refreshing', label: 'Token in refresh', expiresAt: session.expiresAt };
  }
  if (accessExp - now < 5 * 60 * 1000) {
    return { status: 'expiring_soon', label: 'In scadenza', expiresAt: session.expiresAt };
  }
  return { status: 'connected', label: 'Collegato', expiresAt: session.expiresAt };
}

function instagramAuthPayload(integration) {
  return {
    connected: integration.connected,
    mode: integration.mode,
    connectionStatus: integration.connectionStatus,
    username: integration.accountUsername,
    instagramAccountId: integration.instagramAccountId,
    accountId: integration.accountId,
    tokenExpiresAt: integration.tokenExpiresAt,
    profile: integration.profile,
    redirectUri: integration.redirectUri,
    credentialsError: integration.credentialsError,
    canStartOAuth: integration.canStartOAuth,
  };
}

router.post('/local/enter', async (_req, res) => {
  if (!config.isDesktop && config.isProduction) {
    return res.status(403).json({
      error: 'Accesso locale non disponibile in produzione web.',
      code: 'LOCAL_ENTER_DISABLED',
    });
  }
  setLocalSession(res);
  await ensureUserPlan('local-desktop', { uid: LOCAL_USER.uid, displayName: LOCAL_USER.displayName, username: LOCAL_USER.username });
  const instagram = await getInstagramIntegrationStatus();
  res.json({
    authenticated: true,
    mode: 'local',
    user: LOCAL_USER,
    instagram: instagramAuthPayload(instagram),
    tiktok: {
      connected: false,
      tokenStatus: 'paused',
      tokenStatusLabel: 'In pausa',
    },
  });
});

router.get('/tiktok/start', requireTikTokEnabled, (req, res) => {
  try {
    const status = getTikTokConfigStatus();
    if (!status.ready) {
      return res.status(503).json({
        error: status.credentialsMessage || `Configurazione incompleta: ${status.missing.join(', ')}`,
        code: 'TIKTOK_NOT_CONFIGURED',
        requiredPortalRedirectUris: status.requiredPortalRedirectUris,
        activeRedirectUris: status.activeRedirectUris,
      });
    }

    const { state, codeChallenge } = createOAuthState('tiktok_login');
    const authorizeUrl = buildLoginAuthorizationUrl(state, codeChallenge);

    if (req.query.redirect === '1') {
      return res.redirect(authorizeUrl);
    }

    res.json({
      authorizeUrl,
      state,
      loginRedirectUri: config.tiktok.loginRedirectUri,
      clientKeyPrefix: config.tiktok.clientKey.slice(0, 6),
      pkce: true,
      portalChecklist: {
        registerThisRedirectUri: config.tiktok.loginRedirectUri,
        loginKitProductRequired: true,
        addTestUserInSandbox: true,
      },
    });
  } catch (err) {
    logger.error('TikTok auth start failed', { error: err.message });
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
});

/**
 * Desktop-only: server-side login callback (browser → backend → novapromo://).
 * Web uses POST /tiktok/exchange after frontend /auth/callback.
 */
router.get('/tiktok/callback', requireTikTokEnabled, async (req, res) => {
  if (!config.isDesktop) {
    return res.status(404).json({
      error: 'Usa /auth/callback sul frontend per il login web',
    });
  }

  const { code, state, error, error_description: errorDesc } = req.query;

  if (error) {
    return res.redirect(buildLoginCallbackRedirect({ error: errorDesc || error }));
  }

  if (!code || !state) {
    return res.redirect(buildLoginCallbackRedirect({ error: 'Parametri OAuth mancanti' }));
  }

  try {
    const { codeVerifier } = validateAndConsumeOAuthState(state);
    const tokens = await exchangeLoginCode(code, codeVerifier);
    const profile = await fetchUserProfile(tokens.accessToken);
    await upsertTikTokUser(profile, tokens);

    const sessionId = saveUserSession({
      uid: `tiktok:${profile.openId}`,
      openId: profile.openId,
      profile,
      tokens,
    });

    setSessionCookie(res, sessionId);
    return res.redirect(buildLoginCallbackRedirect({ success: '1' }));
  } catch (err) {
    logger.error('TikTok desktop callback failed', { error: err.message });
    return res.redirect(buildLoginCallbackRedirect({ error: err.message }));
  }
});

/**
 * Web login: code exchange ONLY on backend (client_secret never sent to browser).
 */
router.post('/tiktok/exchange', requireTikTokEnabled, async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({ error: 'Authorization code e state sono obbligatori' });
    }

    const { codeVerifier } = validateAndConsumeOAuthState(state);

    const tokens = await exchangeLoginCode(code, codeVerifier);
    const profile = await fetchUserProfile(tokens.accessToken);
    const { uid, customToken } = await upsertTikTokUser(profile, tokens);

    await ensureUserPlan(profile.openId, {
      uid,
      displayName: profile.displayName,
      username: profile.username,
    });

    const sessionId = saveUserSession({
      uid,
      openId: profile.openId,
      profile,
      tokens,
    });

    setSessionCookie(res, sessionId);

    res.json({
      user: {
        uid,
        openId: profile.openId,
        displayName: profile.displayName,
        username: profile.username,
        avatarUrl: profile.avatarUrl,
      },
      customToken,
      tokenStatus: 'connected',
    });
  } catch (err) {
    logger.error('TikTok auth exchange failed', { error: err.message });
    res.status(err.status || 500).json({
      error: err.message,
      hint: 'Verifica redirect URI Login Kit su TikTok Developers e credenziali su Vercel',
    });
  }
});

router.post('/firebase/session', async (req, res) => {
  try {
    if (!hasFirebaseAdminCredentials()) {
      return res.status(503).json({
        error: 'Firebase Auth backend non configurato',
        code: 'FIREBASE_NOT_CONFIGURED',
      });
    }

    const idToken = req.body?.idToken
      || (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!idToken) {
      return res.status(400).json({ error: 'idToken richiesto', code: 'VALIDATION_ERROR' });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    await upsertUserFromFirebaseAuth({
      uid: decoded.uid,
      email: decoded.email,
      displayName: decoded.name || decoded.email?.split('@')[0],
    });
    await ensureUserPlan(decoded.uid, {
      uid: decoded.uid,
      email: decoded.email,
      displayName: decoded.name,
    });

    setFirebaseSessionCookie(res, decoded.uid);
    const billing = await getBillingStatus(decoded.uid);

    res.json({
      authenticated: true,
      mode: 'firebase',
      user: {
        uid: decoded.uid,
        email: decoded.email,
        displayName: decoded.name || billing.displayName,
        role: billing.role,
        plan: billing.plan,
      },
      billing,
    });
  } catch (err) {
    logger.error('Firebase session error', { error: err.message, code: err.code });
    res.status(err.status || 500).json({
      error: err.message,
      code: err.code || 'AUTH_ERROR',
    });
  }
});

router.get('/me', async (req, res) => {
  const firebaseUid = readFirebaseSessionUid(req);
  if (firebaseUid) {
    try {
      const billing = await getBillingStatus(firebaseUid);
      const instagram = await getInstagramIntegrationStatus();
      return res.json({
        authenticated: true,
        mode: 'firebase',
        user: {
          uid: firebaseUid,
          email: billing.email,
          displayName: billing.displayName,
          role: billing.role,
          plan: billing.plan,
        },
        billing,
        instagram: instagramAuthPayload(instagram),
        tiktok: { connected: false, tokenStatus: 'paused', tokenStatusLabel: 'In pausa' },
      });
    } catch (err) {
      logger.error('Firebase /me error', { error: err.message });
      clearFirebaseSessionCookie(res);
      return res.status(401).json({ authenticated: false, tokenStatus: 'expired' });
    }
  }

  if (!config.tiktokEnabled && hasLocalSession(req)) {
    const instagram = await getInstagramIntegrationStatus();
    return res.json({
      authenticated: true,
      mode: 'local',
      user: LOCAL_USER,
      instagram: instagramAuthPayload(instagram),
      tiktok: {
        connected: false,
        tokenStatus: 'paused',
        tokenStatusLabel: 'In pausa',
        paused: true,
      },
    });
  }

  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (!sessionId) {
    if (!config.tiktokEnabled) {
      return res.status(401).json({ authenticated: false, mode: 'local', tokenStatus: 'disconnected' });
    }
    return res.status(401).json({ authenticated: false, tokenStatus: 'disconnected' });
  }

  await ensureFreshSessionTokens(sessionId);
  const session = getSession(sessionId);
  const tokens = getSessionTokens(sessionId);

  if (!session) {
    clearSessionCookie(res);
    return res.status(401).json({ authenticated: false, tokenStatus: 'expired' });
  }

  const tokenInfo = computeTokenStatus(session, tokens);

  res.json({
    authenticated: true,
    user: {
      uid: session.uid,
      openId: session.openId,
      displayName: session.displayName,
      username: session.username,
      avatarUrl: session.avatarUrl,
    },
    tiktok: {
      connected: true,
      openId: session.openId,
      displayName: session.displayName,
      username: session.username,
      avatarUrl: session.avatarUrl,
      tokenStatus: tokenInfo.status,
      tokenStatusLabel: tokenInfo.label,
      accessTokenExpiresAt: tokenInfo.expiresAt,
      scopes: config.tiktok.loginScopes,
    },
  });
});

router.get('/firebase-token', async (req, res) => {
  const sessionId = req.cookies?.[SESSION_COOKIE];
  const session = getSession(sessionId);

  if (!session) {
    return res.status(401).json({ error: 'Sessione non valida — effettua di nuovo il login TikTok' });
  }

  const customToken = await createCustomTokenForSession(session);
  res.json({ customToken });
});

router.post('/logout', async (req, res) => {
  clearFirebaseSessionCookie(res);

  if (!config.tiktokEnabled && hasLocalSession(req)) {
    clearLocalSession(res);
    return res.json({ success: true });
  }

  const sessionId = req.cookies?.[SESSION_COOKIE];
  const tokens = getSessionTokens(sessionId);

  if (tokens?.accessToken) {
    await revokeAccessToken(tokens.accessToken);
  }

  deleteSession(sessionId);
  clearSessionCookie(res);
  res.json({ success: true });
});

export default router;
