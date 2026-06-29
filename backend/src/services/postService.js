import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { getAnalyticsMetrics, getContentSuggestions } from './analyticsService.js';

const POST_FIELDS = `
  id, project, platform, content_type AS contentType, tone, topic,
  caption, hashtags, cta, reel_idea AS reelIdea, overlay_title AS overlayTitle,
  media_path AS mediaPath, media_mime_type AS mediaMimeType, media_public_url AS mediaPublicUrl,
  scheduled_at AS scheduledAt, status, error_message AS errorMessage,
  instagram_media_id AS instagramMediaId, instagram_container_id AS instagramContainerId,
  tiktok_publish_id AS tiktokPublishId, published_at AS publishedAt,
  view_count AS viewCount, created_at AS createdAt, updated_at AS updatedAt
`;

export function listPosts({ status, platform, from, to } = {}) {
  let sql = `SELECT ${POST_FIELDS} FROM posts WHERE 1=1`;
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (platform) {
    sql += ' AND (platform = ? OR platform = \'both\')';
    params.push(platform);
  }
  if (from) {
    sql += ' AND (scheduled_at >= ? OR published_at >= ? OR created_at >= ?)';
    params.push(from, from, from);
  }
  if (to) {
    sql += ' AND (scheduled_at <= ? OR published_at <= ? OR created_at <= ?)';
    params.push(to, to, to);
  }

  sql += ' ORDER BY COALESCE(scheduled_at, published_at, created_at) DESC';
  return getDb().prepare(sql).all(...params);
}

export function getPostById(id) {
  return getDb().prepare(`SELECT ${POST_FIELDS} FROM posts WHERE id = ?`).get(id);
}

export function createPost(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const status = data.status || (data.scheduledAt ? 'scheduled' : 'draft');

  getDb()
    .prepare(
      `INSERT INTO posts (
        id, project, platform, content_type, tone, topic,
        caption, hashtags, cta, reel_idea, overlay_title,
        media_path, media_mime_type, media_public_url, scheduled_at, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      data.project,
      data.platform,
      data.contentType,
      data.tone,
      data.topic || '',
      data.caption || '',
      data.hashtags || '',
      data.cta || '',
      data.reelIdea || '',
      data.overlayTitle || '',
      data.mediaPath || null,
      data.mediaMimeType || null,
      data.mediaPublicUrl || null,
      data.scheduledAt || null,
      status,
      now,
      now
    );

  return getPostById(id);
}

export function updatePost(id, data) {
  const existing = getPostById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  let status = existing.status;

  if (data.scheduledAt !== undefined) {
    if (data.scheduledAt && existing.status === 'draft') status = 'scheduled';
    if (!data.scheduledAt && existing.status === 'scheduled') status = 'draft';
  }
  if (data.status) status = data.status;

  getDb()
    .prepare(
      `UPDATE posts SET
        project = COALESCE(?, project),
        platform = COALESCE(?, platform),
        content_type = COALESCE(?, content_type),
        tone = COALESCE(?, tone),
        topic = COALESCE(?, topic),
        caption = COALESCE(?, caption),
        hashtags = COALESCE(?, hashtags),
        cta = COALESCE(?, cta),
        reel_idea = COALESCE(?, reel_idea),
        overlay_title = COALESCE(?, overlay_title),
        media_path = COALESCE(?, media_path),
        media_mime_type = COALESCE(?, media_mime_type),
        media_public_url = COALESCE(?, media_public_url),
        scheduled_at = COALESCE(?, scheduled_at),
        status = ?,
        error_message = COALESCE(?, error_message),
        instagram_media_id = COALESCE(?, instagram_media_id),
        instagram_container_id = COALESCE(?, instagram_container_id),
        tiktok_publish_id = COALESCE(?, tiktok_publish_id),
        published_at = COALESCE(?, published_at),
        view_count = COALESCE(?, view_count),
        updated_at = ?
      WHERE id = ?`
    )
    .run(
      data.project ?? null,
      data.platform ?? null,
      data.contentType ?? null,
      data.tone ?? null,
      data.topic ?? null,
      data.caption ?? null,
      data.hashtags ?? null,
      data.cta ?? null,
      data.reelIdea ?? null,
      data.overlayTitle ?? null,
      data.mediaPath ?? null,
      data.mediaMimeType ?? null,
      data.mediaPublicUrl ?? null,
      data.scheduledAt !== undefined ? data.scheduledAt : null,
      status,
      data.errorMessage !== undefined ? data.errorMessage : null,
      data.instagramMediaId ?? null,
      data.instagramContainerId ?? null,
      data.tiktokPublishId ?? null,
      data.publishedAt ?? null,
      data.viewCount ?? null,
      now,
      id
    );

  return getPostById(id);
}

export function deletePost(id) {
  return getDb().prepare('DELETE FROM posts WHERE id = ?').run(id);
}

export function getDueScheduledPosts() {
  const now = new Date().toISOString();
  return getDb()
    .prepare(
      `SELECT ${POST_FIELDS} FROM posts
       WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= ?
       ORDER BY scheduled_at ASC`
    )
    .all(now);
}

export function addPublicationLog({ postId, platform, action, status, message, details }) {
  const id = uuidv4();
  getDb()
    .prepare(
      `INSERT INTO publication_logs (id, post_id, platform, action, status, message, details_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, postId, platform, action, status, message || null, details ? JSON.stringify(details) : null);
  return id;
}

export function listPublicationLogs({ postId, limit = 100 } = {}) {
  let sql = 'SELECT * FROM publication_logs';
  const params = [];
  if (postId) {
    sql += ' WHERE post_id = ?';
    params.push(postId);
  }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  return getDb().prepare(sql).all(...params).map((row) => ({
    id: row.id,
    postId: row.post_id,
    platform: row.platform,
    action: row.action,
    status: row.status,
    message: row.message,
    details: row.details_json ? JSON.parse(row.details_json) : null,
    createdAt: row.created_at,
  }));
}

export function getDashboardStats() {
  const db = getDb();
  const counts = db.prepare(`SELECT status, COUNT(*) as count FROM posts GROUP BY status`).all();
  const byStatus = Object.fromEntries(counts.map((r) => [r.status, r.count]));
  const accounts = db.prepare('SELECT platform, COUNT(*) as count FROM connected_accounts GROUP BY platform').all();
  const recentLogs = listPublicationLogs({ limit: 10 });

  return {
    posts: {
      draft: byStatus.draft || 0,
      scheduled: byStatus.scheduled || 0,
      published: byStatus.published || 0,
      error: byStatus.error || 0,
      total: Object.values(byStatus).reduce((a, b) => a + b, 0),
    },
    metrics: getAnalyticsMetrics(),
    suggestions: getContentSuggestions(),
    connectedAccounts: Object.fromEntries(accounts.map((a) => [a.platform, a.count])),
    recentLogs,
  };
}

export function estimateMockViews() {
  return Math.floor(800 + Math.random() * 4200);
}
