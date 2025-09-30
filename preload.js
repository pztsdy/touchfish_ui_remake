// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // 基本连接功能
  connectToServer: (config) => ipcRenderer.send('connect-to-server', config),
  onConnectionSuccess: (callback) => ipcRenderer.on('connection-success', (event, username) => callback(username)),
  onConnectionError: (callback) => ipcRenderer.on('connection-error', (event, errorMsg) => callback(errorMsg)),
  onConnectionClosed: (callback) => ipcRenderer.on('connection-closed', callback),
  sendMessage: (message) => ipcRenderer.send('send-message', message),
  sendHeartbeat: () => ipcRenderer.send('send-heartbeat'),

  // 消息接收功能
  onReceiveMessage: (callback) => ipcRenderer.on('receive-message', (event, message) => callback(message)),
  onReceiveHostHint: (callback) => ipcRenderer.on('receive-host-hint', (event, message) => callback(message)),
  onReceiveSystemMessage: (callback) => ipcRenderer.on('receive-system-message', (event, message) => callback(message)),
  onReceiveBroadcastMessage: (callback) => ipcRenderer.on('receive-broadcast-message', (event, message) => callback(message)),

  // 版本和通知功能
  getVersions: () => ipcRenderer.invoke('get-versions'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getNotice: () => ipcRenderer.invoke('get-notice'),

  // 设置功能
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  toggleWindowPin: () => ipcRenderer.invoke('toggle-window-pin'),

  // 文件传输功能
  selectFile: () => ipcRenderer.invoke('select-file'),
  sendFile: (filePath) => ipcRenderer.invoke('send-file', filePath),
  onFileSendProgress: (callback) => ipcRenderer.on('file-send-progress', (event, progress) => callback(progress)),
  onFileSendComplete: (callback) => ipcRenderer.on('file-send-complete', () => callback()),
  onFileSendError: (callback) => ipcRenderer.on('file-send-error', (event, error) => callback(error)),
  onFileReceiveRequest: (callback) => ipcRenderer.on('file-receive-request', (event, fileInfo) => callback(fileInfo)),
  onFileReceiveProgress: (callback) => ipcRenderer.on('file-receive-progress', (event, progress) => callback(progress)),
  onFileReceiveComplete: (callback) => ipcRenderer.on('file-receive-complete', (event, fileData) => callback(fileData)),
  rejectFile: () => ipcRenderer.send('reject-file'),
  saveFile: (fileData) => ipcRenderer.invoke('save-file', fileData),


  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  onReceiveHostHint: (callback) => ipcRenderer.on('receive-host-hint', (event, message) => callback(message)),
  onReceiveSystemMessage: (callback) => ipcRenderer.on('receive-system-message', (event, message) => callback(message)),
  onReceiveBroadcastMessage: (callback) => ipcRenderer.on('receive-broadcast-message', (event, message) => callback(message)),
  openLink: (url) => ipcRenderer.send('open-link', url),
  markdownit: (text) => ipcRenderer.invoke('markdownit', text),

  // 插件系统API
  plugins: {
    // 插件管理
    selectPluginDirectory: () => ipcRenderer.invoke('select-plugin-directory'),
    install: (pluginPath) => ipcRenderer.invoke('plugin:install', pluginPath),
    uninstall: (pluginId) => ipcRenderer.invoke('plugin:uninstall', pluginId),
    enable: (pluginId) => ipcRenderer.invoke('plugin:enable', pluginId),
    disable: (pluginId) => ipcRenderer.invoke('plugin:disable', pluginId),
    getList: () => ipcRenderer.invoke('plugin:getList'),
    getThemes: () => ipcRenderer.invoke('plugin:getThemes'),
    getFunctions: () => ipcRenderer.invoke('plugin:getFunctions'),
    
    // 插件事件
    onPluginRegistered: (callback) => ipcRenderer.on('plugin:registered', (event, plugin) => callback(plugin)),
    onPluginEnabled: (callback) => ipcRenderer.on('plugin:enabled', (event, plugin) => callback(plugin)),
    onPluginDisabled: (callback) => ipcRenderer.on('plugin:disabled', (event, plugin) => callback(plugin)),
    onPluginUninstalled: (callback) => ipcRenderer.on('plugin:uninstalled', (event, pluginId) => callback(pluginId)),
    
    // 插件通信
    sendToPlugin: (pluginId, channel, data) => ipcRenderer.send(`plugin:${pluginId}:${channel}`, data),
    onPluginMessage: (pluginId, channel, callback) => 
      ipcRenderer.on(`plugin:${pluginId}:${channel}`, (event, data) => callback(data))
  },
  
  // 文件传输相关API
  selectFile: () => ipcRenderer.invoke('select-file'),
  sendFile: (filePath) => ipcRenderer.invoke('send-file', filePath),
  onFileSendProgress: (callback) => ipcRenderer.on('file-send-progress', (event, progress) => callback(progress)),
  onFileSendComplete: (callback) => ipcRenderer.on('file-send-complete', () => callback()),
  onFileSendError: (callback) => ipcRenderer.on('file-send-error', (event, error) => callback(error)),
  onFileReceiveRequest: (callback) => ipcRenderer.on('file-receive-request', (event, fileInfo) => callback(fileInfo)),
  onFileReceiveProgress: (callback) => ipcRenderer.on('file-receive-progress', (event, progress) => callback(progress)),
  onFileReceiveComplete: (callback) => ipcRenderer.on('file-receive-complete', (event, fileData) => callback(fileData)),
  rejectFile: () => ipcRenderer.send('reject-file'),
  saveFile: (fileData) => ipcRenderer.invoke('save-file', fileData),
});