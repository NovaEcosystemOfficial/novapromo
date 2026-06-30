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

export async function getAnalyticsMetrics() {
  const allPosts = await listPosts();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);

  const publishedPosts = allPosts.filter((p) => p.status === 'published');

  const postsThisMonth = allPosts.filter((p) => {
    if (!['published', 'scheduled'].includes(p.status)) return false;
    const ts = new Date(p.publishedAt || p.scheduledAt || p.createdAt);
    return ts >= monthStart;
  }).length;

  const publishedToday = publishedPosts.filter((p) => {
    const ts = new Date(p.publishedAt);
    return ts >= todayStart && ts < tomorrowStart;
  }).length;

  const totalViews = publishedPosts.reduce((sum, p) => sum + (p.viewCount || 0), 0);

  const lastPublished = publishedPosts
    .filter((p) => p.publishedAt)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))[0] || null;

  const streak = calculatePublicationStreak(publishedPosts);

  return {
    postsThisMonth,
    totalViews,
    publishedToday,
    streak,
    lastPublished,
  };
}

function calculatePublicationStreak(publishedPosts) {
  if (publishedPosts.length === 0) return 0;

  const publishedDays = new Set(
    publishedPosts
      .filter((p) => p.publishedAt)
      .map((p) => String(p.publishedAt).slice(0, 10))
  );

  let streak = 0;
  let checkDate = startOfDay(new Date());
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

export async function getContentSuggestions() {
  const allPosts = await listPosts();
  const suggestions = [];

  for (const project of PROJECTS) {
    const projectConfig = PROJECT_SUGGESTIONS[project.id] || {
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

    if (daysSince >= projectConfig.minDays || !lastPost) {
      suggestions.push({
        project: project.id,
        projectColor: project.color,
        daysSinceLastPost: lastDate ? daysSince : null,
        lastPostLabel: lastDate
          ? `Ultimo post ${daysSince} ${daysSince === 1 ? 'giorno' : 'giorni'} fa`
          : 'Nessun post ancora',
        recommendedToday: true,
        platform: projectConfig.platform,
        platformLabel: PLATFORM_LABELS[projectConfig.platform],
        contentType: projectConfig.contentType,
        contentTypeLabel: CONTENT_LABELS[projectConfig.contentType],
        priority: daysSince,
      });
    }
  }

  return suggestions.sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 6);
}
