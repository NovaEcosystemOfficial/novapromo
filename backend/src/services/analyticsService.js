import { getDb } from '../db/index.js';
import { listPosts } from './postService.js';
import { PROJECTS, PROJECT_SUGGESTIONS } from '../constants/projects.js';

const CONTENT_LABELS = {
  post: 'Instagram Post',
  story: 'Instagram Story',
  reel: 'Instagram Reel',
  tiktok_video: 'TikTok Video',
  behind_scenes: 'Dietro le quinte',
  roadmap: 'Roadmap',
  annuncio: 'Annuncio aggiornamento',
};

const PLATFORM_LABELS = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  both: 'Entrambi',
};

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetween(a, b) {
  return Math.floor((startOfDay(b) - startOfDay(a)) / (1000 * 60 * 60 * 24));
}

export function getAnalyticsMetrics() {
  const db = getDb();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const todayStart = startOfDay(now).toISOString();
  const tomorrowStart = new Date(startOfDay(now).getTime() + 86400000).toISOString();

  const postsThisMonth = db
    .prepare(
      `SELECT COUNT(*) as c FROM posts
       WHERE status IN ('published', 'scheduled')
       AND COALESCE(published_at, scheduled_at, created_at) >= ?`
    )
    .get(monthStart)?.c || 0;

  const publishedToday = db
    .prepare(
      `SELECT COUNT(*) as c FROM posts
       WHERE status = 'published'
       AND published_at >= ? AND published_at < ?`
    )
    .get(todayStart, tomorrowStart)?.c || 0;

  const totalViews = db
    .prepare(`SELECT COALESCE(SUM(view_count), 0) as v FROM posts WHERE status = 'published'`)
    .get()?.v || 0;

  const lastPublished = db
    .prepare(
      `SELECT id, project, platform, content_type AS contentType, caption,
              published_at AS publishedAt, view_count AS viewCount
       FROM posts WHERE status = 'published' AND published_at IS NOT NULL
       ORDER BY published_at DESC LIMIT 1`
    )
    .get() || null;

  const streak = calculatePublicationStreak(db);

  return {
    postsThisMonth,
    totalViews,
    publishedToday,
    streak,
    lastPublished,
  };
}

function calculatePublicationStreak(database) {
  const rows = database
    .prepare(
      `SELECT DISTINCT date(published_at) as d FROM posts
       WHERE status = 'published' AND published_at IS NOT NULL
       ORDER BY d DESC`
    )
    .all();

  if (rows.length === 0) return 0;

  let streak = 0;
  let checkDate = startOfDay(new Date());

  const publishedDays = new Set(rows.map((r) => r.d));

  const todayStr = checkDate.toISOString().slice(0, 10);
  if (!publishedDays.has(todayStr)) {
    checkDate = new Date(checkDate.getTime() - 86400000);
  }

  while (true) {
    const dStr = checkDate.toISOString().slice(0, 10);
    if (publishedDays.has(dStr)) {
      streak++;
      checkDate = new Date(checkDate.getTime() - 86400000);
    } else {
      break;
    }
  }

  return streak;
}

export function getContentSuggestions() {
  const allPosts = listPosts();
  const suggestions = [];

  for (const project of PROJECTS) {
    const config = PROJECT_SUGGESTIONS[project.id] || {
      platform: 'instagram',
      contentType: 'post',
      minDays: 3,
    };

    const projectPosts = allPosts
      .filter((p) => p.project === project.id && ['published', 'scheduled'].includes(p.status))
      .sort((a, b) => {
        const da = new Date(a.publishedAt || a.scheduledAt || a.createdAt);
        const db_ = new Date(b.publishedAt || b.scheduledAt || b.createdAt);
        return db_ - da;
      });

    const lastPost = projectPosts[0] || null;
    const lastDate = lastPost
      ? new Date(lastPost.publishedAt || lastPost.scheduledAt || lastPost.createdAt)
      : null;

    const daysSince = lastDate ? daysBetween(lastDate, new Date()) : 999;

    if (daysSince >= config.minDays || !lastPost) {
      suggestions.push({
        project: project.id,
        projectColor: project.color,
        daysSinceLastPost: lastDate ? daysSince : null,
        lastPostLabel: lastDate
          ? `Ultimo post ${daysSince} ${daysSince === 1 ? 'giorno' : 'giorni'} fa`
          : 'Nessun post ancora',
        recommendedToday: true,
        platform: config.platform,
        platformLabel: PLATFORM_LABELS[config.platform],
        contentType: config.contentType,
        contentTypeLabel: CONTENT_LABELS[config.contentType],
        priority: daysSince,
      });
    }
  }

  return suggestions.sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 6);
}
