// pluginPreload.js - 插件系统预加载模块
const { contextBridge, ipcRenderer } = require('electron');

// 插件管理API
const pluginAPI = {
  // 插件管理
  install: (pluginPath) => ipcRenderer.invoke('plugin:install', pluginPath),
  uninstall: (pluginId) => ipcRenderer.invoke('plugin:uninstall', pluginId),
  enable: (pluginId) => ipcRenderer.invoke('plugin:enable', pluginId),
  disable: (pluginId) => ipcRenderer.invoke('plugin:disable', pluginId),
  getList: () => ipcRenderer.invoke('plugin:getList'),
  getThemes: () => ipcRenderer.invoke('plugin:getThemes'),
  getFunctions: () => ipcRenderer.invoke('plugin:getFunctions'),

  // 插件事件监听
  onPluginRegistered: (callback) => {
    ipcRenderer.on('plugin:registered', (event, plugin) => callback(plugin));
  },
  onPluginEnabled: (callback) => {
    ipcRenderer.on('plugin:enabled', (event, plugin) => callback(plugin));
  },
  onPluginDisabled: (callback) => {
    ipcRenderer.on('plugin:disabled', (event, plugin) => callback(plugin));
  },
  onPluginUninstalled: (callback) => {
    ipcRenderer.on('plugin:uninstalled', (event, pluginId) => callback(pluginId));
  },

  // 插件功能API
  chat: {
    sendMessage: (message) => {
      ipcRenderer.send('chat:message', message);
    },
    onMessage: (callback) => {
      ipcRenderer.on('chat:message', (event, message) => callback(message));
    }
  },

  ui: {
    addMenuItem: (item) => {
      ipcRenderer.send('ui:addMenuItem', item);
    },
    executeCommand: (pluginId, command, ...args) => {
      return ipcRenderer.invoke(`plugin:command:${pluginId}:${command}`, ...args);
    }
  },

  theme: {
    applyStyle: (css) => {
      ipcRenderer.send('theme:applyStyle', css);
    },
    removeStyle: () => {
      ipcRenderer.send('theme:removeStyle');
    }
  },

  storage: {
    getData: async (key) => {
      return await ipcRenderer.invoke('storage:getData', key);
    },
    setData: async (key, value) => {
      return await ipcRenderer.invoke('storage:setData', key, value);
    }
  }
};

// 暴露插件API到渲染进程
contextBridge.exposeInMainWorld('pluginAPI', pluginAPI);