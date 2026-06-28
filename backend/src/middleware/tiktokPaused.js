import { config } from '../config.js';

export function tiktokPausedResponse(res) {
  return res.status(503).json({
    error: 'Integrazione TikTok in pausa',
    code: 'TIKTOK_PAUSED',
    paused: true,
  });
}

export function requireTikTokEnabled(_req, res, next) {
  if (!config.tiktokEnabled) {
    return tiktokPausedResponse(res);
  }
  next();
}
