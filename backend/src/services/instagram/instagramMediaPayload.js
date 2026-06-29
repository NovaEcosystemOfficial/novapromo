import { logger } from '../../utils/logger.js';

export function buildInstagramMediaContainerFields({ mediaUrl, mediaMimeType, contentType }) {
  const isVideo = Boolean(mediaMimeType?.startsWith('video/'));
  const fields = {};

  if (contentType === 'story') {
    fields.media_type = 'STORIES';
    if (isVideo) fields.video_url = mediaUrl;
    else fields.image_url = mediaUrl;
    return fields;
  }

  if (contentType === 'reel') {
    if (!isVideo) {
      const err = new Error('I Reel Instagram richiedono un file video.');
      err.code = 'INSTAGRAM_MEDIA_TYPE';
      throw err;
    }
    fields.media_type = 'REELS';
    fields.video_url = mediaUrl;
    return fields;
  }

  if (isVideo) {
    fields.media_type = 'REELS';
    fields.video_url = mediaUrl;
    return fields;
  }

  // Feed photo — image_url only, no media_type
  fields.image_url = mediaUrl;
  return fields;
}

export function logInstagramMediaPayload({
  igUserId,
  contentType,
  mediaMimeType,
  fields,
  graphResponse,
}) {
  logger.info('Instagram Graph: media container payload', {
    igUserId,
    contentType,
    mediaMimeType: mediaMimeType || null,
    hasImageUrl: Boolean(fields.image_url),
    imageUrlPrefix: fields.image_url ? String(fields.image_url).slice(0, 48) : null,
    hasVideoUrl: Boolean(fields.video_url),
    videoUrlPrefix: fields.video_url ? String(fields.video_url).slice(0, 48) : null,
    media_type: fields.media_type || null,
    graphResponse: graphResponse || null,
  });
}
