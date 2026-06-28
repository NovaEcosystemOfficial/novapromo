import app from './app.js';
import { config, getTikTokConfigStatus } from './config.js';
import { getDb, closeDb } from './db/index.js';
import { startScheduler, stopScheduler } from './services/scheduler.js';
import { logger } from './utils/logger.js';

getDb();

const server = app.listen(config.port, () => {
  logger.info(`NovaPromo backend in ascolto su ${config.backendUrl}`);
  logger.info(`Runtime: ${config.runtime} · TikTok: ${config.tiktokEnabled ? 'attivo' : 'in pausa'}`);
  logger.info(`Instagram redirect: ${config.meta.redirectUri}`);
  if (config.meta.appId) {
    logger.info('Instagram: OAuth reale attivo (Meta Graph API)');
  }
  if (config.tiktokEnabled) {
    logger.info(`TikTok Login redirect: ${config.tiktok.loginRedirectUri}`);
    logger.info(`TikTok Content API redirect: ${config.tiktok.apiRedirectUri}`);
    const tiktokStatus = getTikTokConfigStatus();
    if (tiktokStatus.credentialsLoaded) {
      logger.info('TikTok credenziali: caricate');
    }
  }
  startScheduler();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(
      `Porta ${config.port} già in uso. Chiudi l'istanza precedente:\n` +
        `  netstat -ano | findstr :${config.port}\n` +
        `  taskkill /PID <pid> /F`
    );
    process.exit(1);
  }
  throw err;
});

function shutdown() {
  logger.info('Arresto server...');
  stopScheduler();
  server.close(() => {
    closeDb();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
