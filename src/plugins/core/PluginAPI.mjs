// PluginAPI.js - 插件API接口层
import { ipcMain } from 'electron';
import { EventEmitter } from 'events';

class PluginAPI extends EventEmitter {
  constructor(mainWindow, pluginManager) {
    super();
    this.mainWindow = mainWindow;
    this.pluginManager = pluginManager;
    this.setupIPC();
  }

  // 设置IPC通信
  setupIPC() {
    // 插件管理相关
    ipcMain.handle('plugin:install', async (event, pluginPath) => {
      try {
        return await this.pluginManager.installPlugin(pluginPath);
      } catch (error) {
        throw new Error(`安装插件失败: ${error.message}`);
      }
    });

    ipcMain.handle('plugin:uninstall', async (event, pluginId) => {
      try {
        return await this.pluginManager.uninstallPlugin(pluginId);
      } catch (error) {
        throw new Error(`卸载插件失败: ${error.message}`);
      }
    });

    ipcMain.handle('plugin:enable', async (event, pluginId) => {
      try {
        return await this.pluginManager.enablePlugin(pluginId);
      } catch (error) {
        throw new Error(`启用插件失败: ${error.message}`);
      }
    });

    ipcMain.handle('plugin:disable', async (event, pluginId) => {
      try {
        return await this.pluginManager.disablePlugin(pluginId);
      } catch (error) {
        throw new Error(`禁用插件失败: ${error.message}`);
      }
    });

    ipcMain.handle('plugin:getList', () => {
      return this.pluginManager.getPlugins();
    });

    // 主题插件相关
    ipcMain.handle('plugin:getThemes', () => {
      return this.pluginManager.getThemePlugins();
    });

    // 功能插件相关
    ipcMain.handle('plugin:getFunctions', () => {
      return this.pluginManager.getFunctionPlugins();
    });

    // 插件事件转发
    this.pluginManager.on('plugin-registered', (plugin) => {
      this.mainWindow.webContents.send('plugin:registered', plugin);
    });

    this.pluginManager.on('plugin-enabled', (plugin) => {
      this.mainWindow.webContents.send('plugin:enabled', plugin);
    });

    this.pluginManager.on('plugin-disabled', (plugin) => {
      this.mainWindow.webContents.send('plugin:disabled', plugin);
    });

    this.pluginManager.on('plugin-uninstalled', (pluginId) => {
      this.mainWindow.webContents.send('plugin:uninstalled', pluginId);
    });
  }

  // 权限检查函数
  checkPermission(pluginId, permission) {
    const plugin = this.pluginManager.plugins.get(pluginId);
    if (!plugin) return false;
    return plugin.config.permissions?.includes(permission) || false;
  }

  // 获取安全的API对象
  getSafeAPI(pluginId) {
    return {
      // 聊天相关API
      chat: {
        // 发送消息到聊天窗口
        sendMessage: (message) => {
          if (this.checkPermission(pluginId, 'chat:send')) {
            this.mainWindow.webContents.send('chat:message', {
              from: pluginId,
              content: message
            });
          }
        },

        // 接收聊天消息
        onMessage: (callback) => {
          if (this.checkPermission(pluginId, 'chat:receive')) {
            ipcMain.on('chat:message', (event, message) => {
              callback(message);
            });
          }
        }
      },

      // UI相关API
      ui: {
        // 添加菜单项
        addMenuItem: (item) => {
          if (this.checkPermission(pluginId, 'ui:menu')) {
            this.mainWindow.webContents.send('ui:addMenuItem', {
              from: pluginId,
              item
            });
          }
        },

        // 注册自定义命令
        registerCommand: (command, callback) => {
          if (this.checkPermission(pluginId, 'ui:command')) {
            ipcMain.on(`plugin:command:${pluginId}:${command}`, callback);
          }
        }
      },

      // 存储相关API
      storage: {
        // 获取插件数据
        getData: async (key) => {
          if (this.checkPermission(pluginId, 'storage:read')) {
            // 实现安全的数据存储访问
            return await this.pluginManager.getPluginData(pluginId, key);
          }
        },

        // 保存插件数据
        setData: async (key, value) => {
          if (this.checkPermission(pluginId, 'storage:write')) {
            // 实现安全的数据存储
            await this.pluginManager.setPluginData(pluginId, key, value);
          }
        }
      },

      // 主题相关API
      theme: {
        // 应用CSS样式
        applyStyle: (css) => {
          if (this.checkPermission(pluginId, 'theme:style')) {
            this.mainWindow.webContents.send('theme:applyStyle', {
              from: pluginId,
              css
            });
          }
        },

        // 移除CSS样式
        removeStyle: () => {
          if (this.checkPermission(pluginId, 'theme:style')) {
            this.mainWindow.webContents.send('theme:removeStyle', {
              from: pluginId
            });
          }
        }
      }
    };
  }
}

export default PluginAPI;