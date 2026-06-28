const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  isPackaged: process.env.NOVAPROMO_PACKAGED === '1',

  /** Open TikTok OAuth in system browser (recommended) or secure OAuth window */
  openOAuth: (url, mode = 'external') => ipcRenderer.invoke('oauth:open', { url, mode }),

  /** Subscribe to novapromo:// callback after backend OAuth */
  onOAuthCallback: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('oauth:callback', handler);
    return () => ipcRenderer.removeListener('oauth:callback', handler);
  },

  /** Native file picker for video/images */
  selectMediaFiles: (options = {}) => ipcRenderer.invoke('dialog:selectMedia', options),

  /** Desktop notification (Windows toast) */
  showNotification: (title, body, options = {}) =>
    ipcRenderer.invoke('notification:show', { title, body, ...options }),

  /** App metadata */
  getAppInfo: () => ipcRenderer.invoke('app:info'),

  /** Open folder in Explorer (e.g. userData for .env.local) */
  openPath: (target) => ipcRenderer.invoke('shell:openPath', target),

  /** Reveal .env.local location */
  openEnvFolder: () => ipcRenderer.invoke('app:openEnvFolder'),
});
