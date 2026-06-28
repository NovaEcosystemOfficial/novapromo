/** In-memory events for desktop notifications (scheduler publish results). */

let lastPublishEvent = null;

export function recordPublishEvent({ postId, platform, status, message }) {
  lastPublishEvent = {
    id: `${Date.now()}-${postId}-${platform}`,
    postId,
    platform,
    status,
    message,
    at: new Date().toISOString(),
  };
  return lastPublishEvent;
}

export function getLastPublishEvent() {
  return lastPublishEvent;
}

export function clearLastPublishEvent() {
  lastPublishEvent = null;
}
