import http from 'http';
import https from 'https';

/**
 * Poll until url responds with HTTP 2xx/3xx (max timeoutMs).
 */
export function waitForHttpUrl(url, { timeoutMs = 15000, intervalMs = 300 } = {}) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const client = url.startsWith('https') ? https : http;

    const attempt = () => {
      const elapsed = Date.now() - started;
      if (elapsed >= timeoutMs) {
        reject(new Error(`Timeout (${timeoutMs / 1000}s) in attesa di ${url}`));
        return;
      }

      const req = client.get(url, (res) => {
        res.resume();
        if (res.statusCode >= 200 && res.statusCode < 500) {
          resolve(url);
          return;
        }
        setTimeout(attempt, intervalMs);
      });

      req.on('error', () => {
        setTimeout(attempt, intervalMs);
      });

      req.setTimeout(2000, () => {
        req.destroy();
        setTimeout(attempt, intervalMs);
      });
    };

    attempt();
  });
}
