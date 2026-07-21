import { Router } from 'express';
import { config, getTikTokConfigStatus, hasTikTokCredentials } from '../config.js';
import { logger } from '../utils/logger.js';
import { buildAccountsRedirect } from '../utils/appRedirect.js';
import { listAccounts, deleteAccount, upsertAccount, getAccountByPlatform } from '../services/accountService.js';
import {
  getInstagramAuthUrl,
  exchangeInstagramCode,
  refreshInstagramToken,
} from '../services/instagram/instagramService.js';
import {
  getFacebookAuthUrl,
  exchangeFacebookCode,
} from '../services/facebook/facebookService.js';
import {
  getTikTokContentAuthUrl,
  refreshTikTokToken,
} from '../services/tiktok/tiktokService.js';
import { exchangeContentAuthorizationCode } from '../services/tiktok/tiktokLoginService.js';
import { getInstagramIntegrationStatus, getAllIntegrationsStatus, assertCanStartOAuth } from '../services/integrationService.js';
import { createOAuthState, validateAndConsumeOAuthState } from '../services/auth/sessionService.js';
import { requireTikTokEnabled } from '../middleware/tiktokPaused.js';
import { mapOAuthDenial, toUserFriendlyMetaError } from '../services/instagram/metaErrors.js';
import { getFacebookSetupChecklist } from '../services/facebook/metaFacebookConfig.js';
import { requireSession } from '../middleware/sessionUser.js';

const router = Router();

router.get('/integrations/status', requireSession, async (_req, res) => {
  res.json(await getAllIntegrationsStatus());
});

router.get('/accounts', requireSession, async (_req, res) => {
  res.json(await listAccounts());
});

router.delete('/accounts/:id', requireSession, async (req, res) => {
  const result = await deleteAccount(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Account non trovato' });
  res.json({ success: true });
});

router.get('/instagram/start', async (req, res) => {
  try {
    await assertCanStartOAuth('instagram');
    const { state } = createOAuthState('instagram');
    const forceReauth = req.query.force_reauth !== 'false';
    const enableFbLogin = req.query.enable_fb_login === 'true';
    const url = getInstagramAuthUrl(state, { forceReauth, enableFbLogin });

    res.json({
      url,
      mode: 'REAL',
      redirectUri: config.meta.redirectUri,
      label: 'Collega Instagram',
      oauthParams: {
        force_reauth: forceReauth,
        enable_fb_login: enableFbLogin,
      },
      setupHints: [
        'Usa un account Instagram Business o Creator (es. @novaecosystem), non un profilo personale.',
        'In Development mode solo Instagram Tester invitati possono autorizzare l’app.',
        'Aggiungi @novaecosystem come Instagram Tester in Meta Developers e accetta l’invito da Instagram → Impostazioni → App e siti web.',
        'Se vedi il profilo sbagliato, apri il link in finestra privata e accedi con le credenziali di @novaecosystem.',
      ],
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: toUserFriendlyMetaError(err),
      code: err.code,
      details: err.details,
      redirectUri: config.meta.redirectUri,
    });
  }
});

router.get('/instagram/callback', async (req, res) => {
  const { code, state, error, error_description: errorDesc } = req.query;

  if (error) {
    return res.redirect(
      buildAccountsRedirect({ error: mapOAuthDenial(error, errorDesc) })
    );
  }

  if (!code) {
    return res.redirect(
      buildAccountsRedirect({ error: 'Autorizzazione Meta incompleta. Riprova da Account.' })
    );
  }

  try {
    validateAndConsumeOAuthState(state);
    const data = await exchangeInstagramCode(code);

    logger.info('Instagram OAuth callback: account ready to save', {
      username: data.username,
      instagramAccountId: data.instagramAccountId,
      accountType: data.accountType,
      grantedScopes: data.scopes,
      connectionMode: data.connectionMode,
      pageId: data.pageId,
      pageName: data.pageName,
      facebookUserId: data.facebookUserId,
      tokenExpiresIn: data.expiresIn || null,
    });

    await upsertAccount({
      platform: 'instagram',
      externalUserId: data.instagramAccountId,
      username: data.username,
      displayName: data.username,
      accessToken: data.accessToken,
      refreshToken: null,
      expiresAt: data.expiresIn ? new Date(Date.now() + data.expiresIn * 1000).toISOString() : null,
      scopes: data.scopes || ['instagram_business_basic', 'instagram_business_content_publish'],
      metadata: {
        instagramAccountId: data.instagramAccountId,
        pageId: data.pageId,
        pageName: data.pageName || null,
        pageAccessToken: data.pageAccessToken,
        accountType: data.accountType || null,
        facebookUserId: data.facebookUserId || null,
        facebookUserName: data.facebookUserName || null,
        connectionMode: data.connectionMode || 'INSTAGRAM_LOGIN',
      },
    });

    res.redirect(buildAccountsRedirect({ connected: 'instagram' }));
  } catch (err) {
    logger.error('Instagram OAuth callback failed', {
      message: err.message,
      code: err.code,
      metaCode: err.metaCode,
      missingScopes: err.missingScopes || null,
    });
    res.redirect(buildAccountsRedirect({ error: toUserFriendlyMetaError(err) }));
  }
});

router.post('/instagram/refresh', async (_req, res) => {
  try {
    const account = await getAccountByPlatform('instagram');
    if (!account) return res.status(404).json({ error: 'Account Instagram non collegato' });
    const refreshed = await refreshInstagramToken(account.accessToken);
    const updated = await upsertAccount({
      platform: 'instagram',
      externalUserId: account.externalUserId,
      username: account.username,
      displayName: account.displayName,
      accessToken: refreshed.accessToken,
      refreshToken: account.refreshToken,
      expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
      scopes: account.scopes,
      metadata: account.metadata,
    });
    res.json({ success: true, account: { id: updated.id, username: updated.username } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/facebook/start', async (req, res) => {
  try {
    await assertCanStartOAuth('facebook');
    const { state } = createOAuthState('facebook');
    const url = getFacebookAuthUrl(state);

    res.json({
      url,
      mode: 'REAL',
      redirectUri: config.meta.facebookRedirectUri,
      facebookConfigIdConfigured: Boolean(config.meta.facebookConfigId?.trim()),
      label: 'Collega Pagina Facebook',
      setupHints: [
        'Usa l’app Meta principale (META_APP_ID) — diverso dall’Instagram App ID.',
        'Devi essere admin della Pagina Facebook da collegare.',
        'Abilita Facebook Login nel prodotto Meta e aggiungi il redirect URI Facebook.',
        'Permessi richiesti: pages_show_list, pages_manage_posts, pages_read_engagement.',
      ],
      setupChecklist: getFacebookSetupChecklist(),
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: toUserFriendlyMetaError(err),
      code: err.code,
      details: err.details,
      redirectUri: config.meta.facebookRedirectUri,
    });
  }
});

router.get('/facebook/callback', async (req, res) => {
  const { code, state, error, error_description: errorDesc } = req.query;

  if (error) {
    return res.redirect(
      buildAccountsRedirect({ error: mapOAuthDenial(error, errorDesc) })
    );
  }

  if (!code) {
    return res.redirect(
      buildAccountsRedirect({ error: 'Autorizzazione Facebook incompleta. Riprova da Account.' })
    );
  }

  try {
    validateAndConsumeOAuthState(state);
    const data = await exchangeFacebookCode(code);

    logger.info('Facebook OAuth callback: page ready to save', {
      facebookPageId: data.facebookPageId,
      pageName: data.pageName,
      status: data.status,
    });

    await upsertAccount({
      platform: 'facebook',
      externalUserId: data.facebookPageId,
      username: data.pageName,
      displayName: data.pageName,
      accessToken: data.pageAccessToken,
      refreshToken: data.userAccessToken,
      expiresAt: data.expiresIn
        ? new Date(Date.now() + data.expiresIn * 1000).toISOString()
        : null,
      scopes: data.grantedScopes || data.scopes,
      metadata: {
        facebookPageId: data.facebookPageId,
        pageName: data.pageName,
        status: data.status,
        connectedAt: data.connectedAt,
        connectionMode: data.connectionMode,
        grantedScopes: data.grantedScopes || data.scopes,
        missingPublishScopes: data.missingPublishScopes || [],
        canPublish: data.canPublish === true,
        publishingStatus: data.publishingStatus || (data.canPublish ? 'ready' : 'pending_meta_permission'),
        tokenType: 'page',
      },
    });

    res.redirect(buildAccountsRedirect({ connected: 'facebook' }));
  } catch (err) {
    logger.error('Facebook OAuth callback failed', {
      message: err.message,
      code: err.code,
      metaCode: err.metaCode,
    });
    res.redirect(buildAccountsRedirect({ error: toUserFriendlyMetaError(err) }));
  }
});

/** TikTok Content Posting OAuth */
router.get('/tiktok/start', requireTikTokEnabled, (_req, res) => {
  try {
    const status = getTikTokConfigStatus();
    if (!hasTikTokCredentials()) {
      return res.status(503).json({
        error: 'Credenziali TikTok mancanti: configura TIKTOK_CLIENT_KEY e TIKTOK_CLIENT_SECRET',
        code: 'TIKTOK_NOT_CONFIGURED',
        requiredPortalRedirectUris: status.requiredPortalRedirectUris,
      });
    }

    const { state, codeChallenge } = createOAuthState('tiktok_content');
    const url = getTikTokContentAuthUrl(state, codeChallenge);

    res.json({
      url,
      mode: 'REAL',
      mockMode: false,
      label: 'Collega TikTok (Content API)',
      redirectUri: config.tiktok.apiRedirectUri,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/tiktok/callback', requireTikTokEnabled, async (req, res) => {
  const { code, state, error, error_description: errorDesc } = req.query;

  if (error) {
    return res.redirect(buildAccountsRedirect({ error: errorDesc || error }));
  }

  try {
    const { codeVerifier } = validateAndConsumeOAuthState(state);
    const data = await exchangeContentAuthorizationCode(code, codeVerifier);

    await upsertAccount({
      platform: 'tiktok',
      externalUserId: data.openId,
      username: data.username,
      displayName: data.displayName,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresIn ? new Date(Date.now() + data.expiresIn * 1000).toISOString() : null,
      scopes: config.tiktok.contentScopes,
      metadata: {
        mock: false,
        connectionMode: 'REAL',
        avatarUrl: data.avatarUrl,
        refreshExpiresAt: data.refreshExpiresIn
          ? new Date(Date.now() + data.refreshExpiresIn * 1000).toISOString()
          : null,
      },
    });

    res.redirect(buildAccountsRedirect({ connected: 'tiktok', mode: 'real' }));
  } catch (err) {
    res.redirect(buildAccountsRedirect({ error: err.message }));
  }
});

router.post('/tiktok/refresh', requireTikTokEnabled, async (_req, res) => {
  try {
    const account = await getAccountByPlatform('tiktok');
    if (!account) return res.status(404).json({ error: 'Account TikTok non collegato' });
    if (!account.refreshToken) return res.status(400).json({ error: 'Refresh token non disponibile' });

    const refreshed = await refreshTikTokToken(account.refreshToken);
    const updated = await upsertAccount({
      platform: 'tiktok',
      externalUserId: account.externalUserId,
      username: account.username,
      displayName: account.displayName,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
      scopes: account.scopes,
      metadata: {
        ...account.metadata,
        refreshExpiresAt: refreshed.refreshExpiresIn
          ? new Date(Date.now() + refreshed.refreshExpiresIn * 1000).toISOString()
          : account.metadata?.refreshExpiresAt,
      },
    });

    res.json({ success: true, mode: 'REAL', account: { id: updated.id, username: updated.username } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
