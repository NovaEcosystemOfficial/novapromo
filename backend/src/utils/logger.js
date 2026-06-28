const levels = { error: 0, warn: 1, info: 2, debug: 3 };

const currentLevel = levels[process.env.LOG_LEVEL] ?? levels.info;

function format(level, message, meta) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta && Object.keys(meta).length ? { meta } : {}),
  };
  return JSON.stringify(entry);
}

function sanitizeMeta(meta = {}) {
  const safe = { ...meta };
  const sensitive = ['access_token', 'refresh_token', 'token', 'authorization', 'password', 'secret'];
  for (const key of Object.keys(safe)) {
    if (sensitive.some((s) => key.toLowerCase().includes(s))) {
      safe[key] = '[REDACTED]';
    }
  }
  return safe;
}

export const logger = {
  error(message, meta) {
    if (currentLevel >= levels.error) console.error(format('error', message, sanitizeMeta(meta)));
  },
  warn(message, meta) {
    if (currentLevel >= levels.warn) console.warn(format('warn', message, sanitizeMeta(meta)));
  },
  info(message, meta) {
    if (currentLevel >= levels.info) console.log(format('info', message, sanitizeMeta(meta)));
  },
  debug(message, meta) {
    if (currentLevel >= levels.debug) console.log(format('debug', message, sanitizeMeta(meta)));
  },
};
