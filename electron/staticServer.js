import express from 'express';
import path from 'path';
import { DEV_HOST, FRONTEND_PORT } from './paths.js';

let staticServer = null;

export function startFrontendStaticServer(distPath) {
  return new Promise((resolve, reject) => {
    const app = express();
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });

    const url = `http://${DEV_HOST}:${FRONTEND_PORT}`;
    staticServer = app.listen(FRONTEND_PORT, DEV_HOST, () => {
      resolve(url);
    });

    staticServer.on('error', reject);
  });
}

export function stopFrontendStaticServer() {
  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }
}
