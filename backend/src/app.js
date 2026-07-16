import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config, getTikTokConfigStatus, getAppFeatures, hasFirebaseAdminCredentials, hasFirebaseStorage } from './config.js';
import { useFirebaseDataStore } from './services/firebase/dataStore.js';
import dashboardRoutes from './routes/dashboard.js';
import postsRoutes from './routes/posts.js';
import oauthRoutes from './routes/oauth.js';
import authRoutes from './routes/auth.js';
import tiktokReviewRoutes from './routes/tiktokReview.js';
import aiRoutes from './routes/ai.js';
import billingRoutes from './routes/billing.js';
import { stripeWebhookHandler } from './routes/billingWebhook.js';
import brandsRoutes from './routes/brands.js';
import cronRoutes from './routes/cron.js';
import { getAllIntegrationsStatus } from './services/integrationService.js';
import { logger } from './utils/logger.js';

function resolveCorsOrigin(origin, callback) {
  if (!origin) return callback(null, true);
  if (config.isDesktop) return callback(null, true);
  if (origin === config.frontendUrl) return callback(null, true);
  return callback(null, false);
}

const app = express();

app.set('trust proxy', 1);

app.use(
  cors({
    origin: resolveCorsOrigin,
    credentials: true,
  })
);
app.use(cookieParser());

app.post(
  '/api/billing/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(config.uploadDir));

app.get('/', (_req, res) => {
  res.send('NovaPromo backend running');
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    runtime: config.runtime,
    tiktokEnabled: config.tiktokEnabled,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/config/features', (_req, res) => {
  res.json({
    ...getAppFeatures(),
    firebase: {
      dataStore: useFirebaseDataStore() ? 'firestore' : 'sqlite',
      storageConfigured: hasFirebaseStorage(),
      adminConfigured: hasFirebaseAdminCredentials(),
    },
  });
});

app.get('/api/integrations/status', async (_req, res) => {
  res.json(await getAllIntegrationsStatus());
});

app.get('/api/auth/tiktok/setup', (_req, res) => {
  const status = getTikTokConfigStatus();
  res.json({
    ...status,
    instructions: status.paused
      ? { message: 'Integrazione TikTok in pausa — usa Instagram dalla sezione Account' }
      : status.ready
        ? null
        : {
            message: 'Configura TikTok for Developers prima di usare il login',
            steps: [
              '1. Imposta TIKTOK_ENABLED=true',
              '2. Configura TIKTOK_CLIENT_KEY e TIKTOK_CLIENT_SECRET',
            ],
          },
  });
});

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tiktok/review', tiktokReviewRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/brands', brandsRoutes);

app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `File troppo grande (max ${config.maxFileSizeMb}MB)` });
  }
  logger.error('Unhandled error', { error: err.message });
  res.status(err.status || 500).json({ error: err.message || 'Errore interno' });
});

export default app;
