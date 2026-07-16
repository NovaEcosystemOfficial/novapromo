import cron from 'node-cron';
import { config } from '../config.js';
import { runDuePublishes } from './schedulerRunner.js';
import { logger } from '../utils/logger.js';

let task = null;

/**
 * In-process cron for long-lived Node servers (local / desktop).
 * On Vercel this must NOT be the only mechanism — use /api/cron/publish-due.
 */
export function startScheduler() {
  if (task) return;

  if (config.isVercel) {
    logger.warn(
      '[scheduler] node-cron non avviato su Vercel — usare Cron Job → /api/cron/publish-due'
    );
    return;
  }

  task = cron.schedule(config.schedulerCron, async () => {
    try {
      await runDuePublishes({ source: 'node-cron' });
    } catch (err) {
      logger.error('[scheduler] node-cron tick error', { error: err.message });
    }
  });

  logger.info(`[scheduler] node-cron avviato (cron: ${config.schedulerCron})`);
}

export function stopScheduler() {
  if (task) {
    task.stop();
    task = null;
    logger.info('[scheduler] node-cron fermato');
  }
}

export { runDuePublishes } from './schedulerRunner.js';
