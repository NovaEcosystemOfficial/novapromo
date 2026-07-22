/**
 * Optional legacy local Express backend for Electron.
 * Thin-client packaged builds do NOT use this — API lives on Vercel.
 * Enable only with NOVAPROMO_SPAWN_BACKEND=1 during local experiments.
 */
import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { BACKEND_DEV_URL, BACKEND_PORT, getBackendEntry, getProjectRoot } from './paths.js';

let backendProcess = null;

export function startBackend({ isPackaged, resourcesPath, userDataPath }) {
  const entry = getBackendEntry(isPackaged, resourcesPath);
  const root = isPackaged ? path.join(resourcesPath, 'backend') : getProjectRoot();

  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    NOVAPROMO_RUNTIME: 'desktop',
    NOVAPROMO_USER_DATA: userDataPath,
    NODE_ENV: 'development',
    PORT: String(BACKEND_PORT),
    TIKTOK_ENABLED: 'false',
  };

  backendProcess = spawn(process.execPath, [entry], {
    env,
    cwd: root,
    stdio: 'inherit',
    windowsHide: true,
  });

  backendProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Backend exited with code ${code}`);
    }
    backendProcess = null;
  });

  return backendProcess;
}

export function stopBackend() {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill('SIGTERM');
    backendProcess = null;
  }
}

export function waitForBackend(maxAttempts = 60, intervalMs = 500) {
  const healthUrl = `${BACKEND_DEV_URL}/api/health`;

  return new Promise((resolve, reject) => {
    let attempts = 0;

    const check = () => {
      attempts += 1;
      const req = http.get(healthUrl, (res) => {
        res.resume();
        if (res.statusCode === 200) resolve();
        else if (attempts >= maxAttempts) reject(new Error('Backend health check failed'));
        else setTimeout(check, intervalMs);
      });
      req.on('error', () => {
        if (attempts >= maxAttempts) reject(new Error('Backend did not start'));
        else setTimeout(check, intervalMs);
      });
      req.setTimeout(2000, () => {
        req.destroy();
        if (attempts >= maxAttempts) reject(new Error('Backend timeout'));
        else setTimeout(check, intervalMs);
      });
    };

    check();
  });
}
