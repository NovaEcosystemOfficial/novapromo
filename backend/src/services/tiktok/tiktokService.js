import { config, hasTikTokCredentials } from '../../config.js';
import { logger } from '../../utils/logger.js';
import fs from 'fs';
import {
  buildContentAuthorizationUrl,
  exchangeContentAuthorizationCode,
  refreshAccessToken,
} from './tiktokLoginService.js';

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

export function getTikTokContentAuthUrl(state, codeChallenge) {
  return buildContentAuthorizationUrl(state, codeChallenge);
}

export async function exchangeTikTokContentCode(code) {
  return exchangeContentAuthorizationCode(code);
}

export async function refreshTikTokToken(refreshToken) {
  return refreshAccessToken(refreshToken);
}

export async function checkPublishStatus({ accessToken, publishId }) {
  const res = await fetch(`${TIKTOK_API_BASE}/post/publish/status/fetch/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({ publish_id: publishId }),
  });

  const data = await res.json();
  if (!res.ok || data.error?.code !== 'ok') {
    throw new Error(data.error?.message || 'Failed to check TikTok publish status');
  }

  return { status: data.data.status };
}

export async function uploadVideoToTikTok({ uploadUrl, filePath, accessToken }) {
  const videoBuffer = fs.readFileSync(filePath);
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(videoBuffer.length),
      Authorization: `Bearer ${accessToken}`,
    },
    body: videoBuffer,
  });

  if (!res.ok) {
    throw new Error(`TikTok video upload failed: ${res.status}`);
  }
  return { uploaded: true };
}

export async function publishToTikTok(post, account) {
  if (!hasTikTokCredentials()) {
    throw new Error('TikTok non configurato — imposta TIKTOK_CLIENT_KEY e TIKTOK_CLIENT_SECRET su Vercel');
  }

  const { accessToken } = account;
  const fullCaption = [post.caption, post.hashtags].filter(Boolean).join(' ');

  if (!post.mediaPath) throw new Error('Video richiesto per TikTok');

  const filePath = post.mediaPath;
  const stats = fs.statSync(filePath);

  const initRes = await fetch(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: fullCaption.slice(0, 150),
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: stats.size,
        chunk_size: stats.size,
        total_chunk_count: 1,
      },
    }),
  });

  const initData = await initRes.json();
  if (!initRes.ok || initData.error?.code !== 'ok') {
    throw new Error(initData.error?.message || 'TikTok publish init failed');
  }

  const { publish_id: publishId, upload_url: uploadUrl } = initData.data;

  await uploadVideoToTikTok({ uploadUrl, filePath, accessToken });

  let status = 'PROCESSING_UPLOAD';
  let attempts = 0;
  while (status !== 'PUBLISH_COMPLETE' && status !== 'FAILED' && attempts < 30) {
    await sleep(3000);
    const check = await checkPublishStatus({ accessToken, publishId });
    status = check.status;
    attempts++;
  }

  if (status === 'FAILED') throw new Error('TikTok publish failed');
  if (status !== 'PUBLISH_COMPLETE') throw new Error(`TikTok publish timeout: ${status}`);

  return { publishId };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
