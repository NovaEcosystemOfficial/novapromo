import cron from 'node-cron';
import { config } from '../config.js';
import { getDueScheduledPosts } from './postService.js';
import { publishPost } from './publisherService.js';
import { logger } from '../utils/logger.js';

let task = null;

export function startScheduler() {
  if (task) return;

  task = cron.schedule(config.schedulerCron, async () => {
    try {
      const duePosts = getDueScheduledPosts();
      if (duePosts.length === 0) return;

      logger.info(`Scheduler: ${duePosts.length} post da pubblicare`);

      for (const post of duePosts) {
        try {
          await publishPost(post);
          logger.info(`Scheduler: post ${post.id} pubblicato`);
        } catch (err) {
          logger.error(`Scheduler: errore post ${post.id}`, { error: err.message });
        }
      }
    } catch (err) {
      logger.error('Scheduler error', { error: err.message });
    }
  });

  logger.info(`Scheduler avviato (cron: ${config.schedulerCron})`);
}

export function stopScheduler() {
  if (task) {
    task.stop();
    task = null;
    logger.info('Scheduler fermato');
  }
}
