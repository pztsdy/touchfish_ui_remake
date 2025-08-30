// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  connectToServer: (config) => ipcRenderer.send('connect-to-server', config),
  onConnectionSuccess: (callback) => ipcRenderer.on('connection-success', (event, username) => callback(username)),
  onConnectionError: (callback) => ipcRenderer.on('connection-error', (event, errorMsg) => callback(errorMsg)),
  onReceiveMessage: (callback) => ipcRenderer.on('receive-message', (event, message) => callback(message)),
  onConnectionClosed: (callback) => ipcRenderer.on('connection-closed', callback),
  sendMessage: (message) => ipcRenderer.send('send-message', message),
  getVersions: () => ipcRenderer.invoke('get-versions'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  onReceiveHostHint: (callback) => ipcRenderer.on('receive-host-hint', (event, message) => callback(message)),
  onReceiveSystemMessage: (callback) => ipcRenderer.on('receive-system-message', (event, message) => callback(message)),
  onReceiveBroadcastMessage: (callback) => ipcRenderer.on('receive-broadcast-message', (event, message) => callback(message)),
  openLink: (url) => ipcRenderer.send('open-link', url),
  marked: (text) => ipcRenderer.invoke('marked', text),
});