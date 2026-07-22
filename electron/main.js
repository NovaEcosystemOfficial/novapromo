import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  Notification,
  dialog,
  Menu,
} from 'electron';
import path from 'path';
import {
  BACKEND_DEV_URL,
  CLOUD_APP_ORIGIN,
  CLOUD_APP_START_URL,
  FRONTEND_DEV_DASHBOARD_URL,
  FRONTEND_DEV_URL,
  PROTOCOL,
  getAppStartUrl,
  getPreloadPath,
  getIconPath,
} from './paths.js';
import {
  startBackend,
  stopBackend,
  waitForBackend,
} from './backendSpawner.js';
import { waitForHttpUrl } from './waitForUrl.js';
import { buildErrorPageDataUrl } from './errorPage.js';

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {BrowserWindow | null} */
let oauthWindow = null;

const isDev = !app.isPackaged;
const VITE_READY_TIMEOUT_MS = 15000;
const spawnLocalBackend = process.env.NOVAPROMO_SPAWN_BACKEND === '1';

process.env.NOVAPROMO_PACKAGED = app.isPackaged ? '1' : '0';

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

function registerProtocol() {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
        path.resolve(process.argv[1]),
      ]);
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }
}

function parseProtocolUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const host = url.host;
    const pathname = url.pathname.replace(/^\//, '');
    const route = host ? `${host}${pathname ? `/${pathname}` : ''}` : pathname;
    const params = Object.fromEntries(url.searchParams.entries());
    return { route, params, raw: rawUrl };
  } catch {
    return { route: '', params: {}, raw: rawUrl };
  }
}

function sendOAuthCallback(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('oauth:callback', payload);
  }
}

/**
 * Deep-link: prefer in-app navigation on the cloud origin;
 * fall back to IPC for the renderer bridge.
 */
function handleProtocolUrl(rawUrl) {
  const { route, params } = parseProtocolUrl(rawUrl);
  const qs = new URLSearchParams(params).toString();

  if (mainWindow && !mainWindow.isDestroyed()) {
    let pathName = '/dashboard';
    if (route.startsWith('auth/callback') || route === 'auth') {
      pathName = `/auth/callback${qs ? `?${qs}` : ''}`;
    } else if (route.startsWith('accounts') || route === 'accounts') {
      pathName = `/accounts${qs ? `?${qs}` : ''}`;
    } else if (route) {
      pathName = `/${route}${qs ? `?${qs}` : ''}`;
    }

    const target = `${CLOUD_APP_ORIGIN}${pathName}`;
    const current = mainWindow.webContents.getURL();
    if (current.startsWith(CLOUD_APP_ORIGIN)) {
      mainWindow.loadURL(target).catch(() => {
        sendOAuthCallback({
          type: route.startsWith('auth') ? 'login' : route.startsWith('accounts') ? 'accounts' : 'unknown',
          route,
          ...params,
        });
      });
    } else {
      sendOAuthCallback({
        type: route.startsWith('auth') ? 'login' : route.startsWith('accounts') ? 'accounts' : 'unknown',
        route,
        ...params,
      });
    }

    if (oauthWindow && !oauthWindow.isDestroyed()) oauthWindow.close();
    return;
  }

  if (route.startsWith('auth/callback') || route === 'auth') {
    sendOAuthCallback({ type: 'login', ...params });
    return;
  }
  if (route.startsWith('accounts') || route === 'accounts') {
    sendOAuthCallback({ type: 'accounts', ...params });
    return;
  }
  sendOAuthCallback({ type: 'unknown', route, ...params });
}

function createBrowserWindowOptions() {
  return {
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'NovaPromo AutoPublisher',
    icon: getIconPath(),
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  };
}

async function showLoadError(win, targetUrl, detail) {
  const page = buildErrorPageDataUrl(targetUrl, detail);
  if (win && !win.isDestroyed()) {
    await win.loadURL(page);
    win.show();
    if (isDev) {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  }
}

async function waitForViteDevServer() {
  const dashboardUrl = FRONTEND_DEV_DASHBOARD_URL;
  console.log('[electron] In attesa di Vite:', dashboardUrl);
  await waitForHttpUrl(dashboardUrl, { timeoutMs: VITE_READY_TIMEOUT_MS });
  console.log('[electron] Vite pronto');
}

async function loadMainWindowContent(win) {
  const startUrl = getAppStartUrl(app.isPackaged);
  console.log('[electron] Thin client →', startUrl);
  await win.loadURL(startUrl);
}

async function createWindow() {
  const startUrl = getAppStartUrl(app.isPackaged);
  const needsLocalVite =
    isDev
    && !process.env.NOVAPROMO_APP_URL
    && process.env.NOVAPROMO_USE_CLOUD !== '1'
    && startUrl.startsWith(FRONTEND_DEV_URL || 'http://localhost');

  if (needsLocalVite) {
    try {
      await waitForViteDevServer();
    } catch (err) {
      console.error('[electron] Vite non pronto:', err.message);
      mainWindow = new BrowserWindow({
        width: 720,
        height: 520,
        title: 'NovaPromo — Errore',
        icon: getIconPath(),
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
      });
      await showLoadError(
        mainWindow,
        FRONTEND_DEV_DASHBOARD_URL,
        `${err.message}\n\nSuggerimento: avvia npm run dev, oppure usa NOVAPROMO_USE_CLOUD=1 per aprire ${CLOUD_APP_START_URL}`
      );
      mainWindow.on('closed', () => {
        mainWindow = null;
      });
      return;
    }
  }

  mainWindow = new BrowserWindow(createBrowserWindowOptions());

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3) return;
    showLoadError(
      mainWindow,
      validatedURL || startUrl,
      `${errorDescription} (${errorCode})`
    );
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  try {
    await loadMainWindowContent(mainWindow);
  } catch (err) {
    console.error('[electron] Caricamento fallito:', err.message);
    await showLoadError(mainWindow, startUrl, err.message);
    return;
  }

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createOAuthWindow(url) {
  oauthWindow = new BrowserWindow({
    width: 520,
    height: 720,
    parent: mainWindow ?? undefined,
    modal: !!mainWindow,
    title: 'Accedi',
    icon: getIconPath(),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  oauthWindow.loadURL(url);

  oauthWindow.webContents.on('will-redirect', (_event, redirectUrl) => {
    if (redirectUrl.startsWith(`${PROTOCOL}://`)) {
      handleProtocolUrl(redirectUrl);
    }
  });

  oauthWindow.webContents.on('will-navigate', (_event, navigateUrl) => {
    if (navigateUrl.startsWith(`${PROTOCOL}://`)) {
      handleProtocolUrl(navigateUrl);
    }
  });

  oauthWindow.on('closed', () => {
    oauthWindow = null;
  });
}

function setupIpc() {
  ipcMain.handle('oauth:open', async (_event, { url, mode }) => {
    if (mode === 'window') {
      createOAuthWindow(url);
      return { opened: 'window' };
    }
    await shell.openExternal(url);
    return { opened: 'external' };
  });

  ipcMain.handle('dialog:selectMedia', async (_event, options = {}) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: options.title || 'Seleziona media',
      properties: options.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
      filters: [
        {
          name: 'Media',
          extensions: ['mp4', 'mov', 'webm', 'jpg', 'jpeg', 'png', 'webp'],
        },
      ],
    });

    if (result.canceled) return { canceled: true, files: [] };

    return {
      canceled: false,
      files: result.filePaths.map((filePath) => ({
        path: filePath,
        name: path.basename(filePath),
      })),
    };
  });

  ipcMain.handle('notification:show', (_event, { title, body, silent }) => {
    if (!Notification.isSupported()) return { shown: false };
    const n = new Notification({ title, body, silent: !!silent, icon: getIconPath() });
    n.show();
    n.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
    return { shown: true };
  });

  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    isDev,
    thinClient: true,
    userData: app.getPath('userData'),
    cloudAppUrl: CLOUD_APP_START_URL,
    backendUrl: spawnLocalBackend ? BACKEND_DEV_URL : null,
    frontendUrl: getAppStartUrl(app.isPackaged),
    platform: process.platform,
  }));

  ipcMain.handle('app:openEnvFolder', () => {
    const userData = app.getPath('userData');
    shell.openPath(userData);
    return { path: userData };
  });

  ipcMain.handle('shell:openPath', (_event, target) => shell.openPath(target));
}

async function bootstrap() {
  registerProtocol();
  setupIpc();

  // Optional legacy: local Express backend (dev only). Packaged thin client never spawns it.
  if (!app.isPackaged && spawnLocalBackend) {
    startBackend({
      isPackaged: false,
      resourcesPath: process.resourcesPath,
      userDataPath: app.getPath('userData'),
    });
    await waitForBackend().catch((err) => {
      console.warn('[electron] Backend locale non avviato:', err.message);
    });
  } else {
    console.log('[electron] Thin client cloud — nessun backend locale');
  }

  await createWindow();

  const menu = Menu.buildFromTemplate([
    {
      label: 'NovaPromo',
      submenu: [
        {
          label: 'Apri nel browser',
          click: () => shell.openExternal(CLOUD_APP_START_URL),
        },
        { type: 'separator' },
        { role: 'quit', label: 'Esci' },
      ],
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
  ]);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(bootstrap);

app.on('second-instance', (_event, argv) => {
  const protocolUrl = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
  if (protocolUrl) handleProtocolUrl(protocolUrl);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  handleProtocolUrl(url);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (spawnLocalBackend) stopBackend();
});
