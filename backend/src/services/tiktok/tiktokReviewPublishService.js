import fs from 'fs';
import path from 'path';
import { getAccountByPlatform } from '../accountService.js';
import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import { checkPublishStatus, uploadVideoToTikTok } from './tiktokService.js';

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

function step(steps, name, status, message, data = null) {
  const entry = { step: name, status, message, at: new Date().toISOString(), ...(data ? { data } : {}) };
  steps.push(entry);
  return entry;
}

export async function runTikTokUploadFlow({ filePath, caption, privacyLevel = 'PUBLIC_TO_EVERYONE' }) {
  const steps = [];
  const account = getAccountByPlatform('tiktok');

  if (!account?.accessToken) {
    step(steps, 'auth', 'error', 'Account TikTok Content API non collegato — vai su Account → Collega TikTok reale');
    return { success: false, steps };
  }

  if (!filePath || !fs.existsSync(filePath)) {
    step(steps, 'file', 'error', 'File video non trovato');
    return { success: false, steps };
  }

  const stats = fs.statSync(filePath);
  step(steps, 'file', 'ok', `Video selezionato (${Math.round(stats.size / 1024 / 1024)} MB)`, {
    filename: path.basename(filePath),
  });

  step(steps, 'init', 'running', 'Inizializzazione upload TikTok Content Posting API…');

  let initData;
  try {
    const initRes = await fetch(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: (caption || '').slice(0, 150),
          privacy_level: privacyLevel,
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

    initData = await initRes.json();

    if (!initRes.ok || initData.error?.code !== 'ok') {
      const msg = initData.error?.message || initData.error?.code || `HTTP ${initRes.status}`;
      step(steps, 'init', 'error', msg, initData.error);
      if (msg.includes('scope') || msg.includes('permission') || initData.error?.code === 'access_denied') {
        step(
          steps,
          'review',
          'info',
          'Scope video.upload / video.publish potrebbero richiedere approvazione TikTok App Review'
        );
      }
      return { success: false, steps };
    }

    step(steps, 'init', 'ok', 'Upload inizializzato', {
      publishId: initData.data?.publish_id,
    });
  } catch (err) {
    step(steps, 'init', 'error', err.message);
    return { success: false, steps };
  }

  const { publish_id: publishId, upload_url: uploadUrl } = initData.data;

  step(steps, 'upload', 'running', 'Caricamento video su TikTok…');
  try {
    await uploadVideoToTikTok({ uploadUrl, filePath, accessToken: account.accessToken });
    step(steps, 'upload', 'ok', 'Video caricato con successo');
  } catch (err) {
    step(steps, 'upload', 'error', err.message);
    return { success: false, steps, publishId };
  }

  step(steps, 'status', 'running', 'Verifica stato pubblicazione…');
  let status = 'PROCESSING_UPLOAD';
  let attempts = 0;

  while (status !== 'PUBLISH_COMPLETE' && status !== 'FAILED' && attempts < 30) {
    await sleep(3000);
    try {
      const check = await checkPublishStatus({ accessToken: account.accessToken, publishId });
      status = check.status;
      step(steps, 'status', 'info', `Stato: ${status}`);
    } catch (err) {
      step(steps, 'status', 'error', err.message);
      return { success: false, steps, publishId };
    }
    attempts++;
  }

  if (status === 'PUBLISH_COMPLETE') {
    step(steps, 'publish', 'ok', 'Direct Post completato su TikTok', { publishId, status });
    return { success: true, steps, publishId, status };
  }

  if (status === 'FAILED') {
    step(steps, 'publish', 'error', 'TikTok ha rifiutato la pubblicazione');
    return { success: false, steps, publishId, status };
  }

  step(steps, 'publish', 'warning', `Timeout — ultimo stato: ${status}`, { publishId });
  return { success: false, steps, publishId, status };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
