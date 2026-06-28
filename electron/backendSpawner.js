import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { BACKEND_DEV_URL, BACKEND_PORT, OAUTH_BACKEND_URL, getBackendEntry, getProjectRoot } from './paths.js';

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
    APP_URL: OAUTH_BACKEND_URL,
    BACKEND_URL: OAUTH_BACKEND_URL,
    FRONTEND_URL: `http://localhost:${process.env.NOVAPROMO_FRONTEND_PORT || '5173'}`,
    META_REDIRECT_URI: `${OAUTH_BACKEND_URL}/api/oauth/instagram/callback`,
  };

  if (isPackaged) {
    env.NODE_PATH = path.join(process.resourcesPath, 'app.asar', 'node_modules');
  }

  backendProcess = spawn(process.execPath, [entry], {
    env,
    cwd: root,
    stdio: isPackaged ? 'pipe' : 'inherit',
    windowsHide: true,
  });

  if (backendProcess.stdout) {
    backendProcess.stdout.on('data', (d) => process.stdout.write(`[backend] ${d}`));
  }
  if (backendProcess.stderr) {
    backendProcess.stderr.on('data', (d) => process.stderr.write(`[backend] ${d}`));
  }

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

export function ensureUserEnvFile(userDataPath) {
  const envPath = path.join(userDataPath, '.env.local');
  if (!fs.existsSync(envPath)) {
    const template = `# NovaPromo Desktop — configurazione locale
# Percorso: ${envPath}

NODE_ENV=development
APP_URL=${OAUTH_BACKEND_URL}
BACKEND_URL=${OAUTH_BACKEND_URL}
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=${OAUTH_BACKEND_URL}/api/oauth/instagram/callback

SESSION_SECRET=
ENCRYPTION_KEY=

TIKTOK_ENABLED=false
`;
    fs.mkdirSync(userDataPath, { recursive: true });
    fs.writeFileSync(envPath, template, 'utf8');
  }
  return envPath;
}
