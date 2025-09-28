// PluginManager.js - 插件管理器核心类
import { promises as fs } from 'fs';
import path from 'path';
import { app } from 'electron';
import { EventEmitter } from 'events';

class PluginManager extends EventEmitter {
  constructor() {
    super();
    this.plugins = new Map(); // 存储已加载的插件
    this.pluginsDir = path.join(app.getPath('userData'), 'plugins');
    this.themePlugins = new Map(); // 存储主题插件
    this.functionPlugins = new Map(); // 存储功能插件
    this.pluginStates = new Map(); // 存储插件状态
    this.init();
  }

  // 初始化插件目录和配置
  async init() {
    try {
      await fs.mkdir(this.pluginsDir, { recursive: true });
      await this.loadPluginStates();
    } catch (error) {
      console.error('插件系统初始化失败:', error);
    }
  }

  // 加载插件状态
  async loadPluginStates() {
    try {
      const statesPath = path.join(this.pluginsDir, 'plugin-states.json');
      const data = await fs.readFile(statesPath, 'utf8');
      const states = JSON.parse(data);
      this.pluginStates = new Map(Object.entries(states));
    } catch (error) {
      // 如果文件不存在或其他错误，使用默认空状态
      this.pluginStates = new Map();
    }
  }

  // 保存插件状态
  async savePluginStates() {
    try {
      const statesPath = path.join(this.pluginsDir, 'plugin-states.json');
      const states = Object.fromEntries(this.pluginStates);
      await fs.writeFile(statesPath, JSON.stringify(states, null, 2));
    } catch (error) {
      console.error('保存插件状态失败:', error);
    }
  }

  // 验证插件
  async validatePlugin(pluginPath) {
    try {
      const pluginJsonPath = path.join(pluginPath, 'plugin.json');
      const configData = await fs.readFile(pluginJsonPath, 'utf8');
      const config = JSON.parse(configData);
      
      // 验证必要字段
      const requiredFields = ['id', 'name', 'version', 'type', 'minAppVersion'];
      for (const field of requiredFields) {
        if (!config[field]) {
          throw new Error(`缺少必要字段: ${field}`);
        }
      }

      // 验证应用版本兼容性
      if (!this.checkVersionCompatibility(config.minAppVersion)) {
        throw new Error(`插件需要应用版本 ${config.minAppVersion} 或更高`);
      }

      // 验证插件文件完整性
      if (config.type === 'pack') {
        const scriptPath = path.join(pluginPath, config.main || 'script.js');
        await fs.access(scriptPath);
      }
      
      if (config.style) {
        const stylePath = path.join(pluginPath, config.style);
        await fs.access(stylePath);
      }

      return config;
    } catch (error) {
      throw new Error(`插件验证失败: ${error.message}`);
    }
  }

  // 检查版本兼容性
  checkVersionCompatibility(minVersion) {
    const currentVersion = app.getVersion();
    const [minMajor, minMinor] = minVersion.split('.').map(Number);
    const [curMajor, curMinor] = currentVersion.split('.').map(Number);
    
    return curMajor > minMajor || (curMajor === minMajor && curMinor >= minMinor);
  }

  // 安装插件
  async installPlugin(pluginPath) {
    try {
      // 验证插件
      const config = await this.validatePlugin(pluginPath);
      
      // 检查是否已安装
      if (this.plugins.has(config.id)) {
        throw new Error('插件已安装');
      }

      // 复制插件文件到插件目录
      const targetDir = path.join(this.pluginsDir, config.id);
      await fs.mkdir(targetDir, { recursive: true });
      
      // 复制文件
      await this.copyPluginFiles(pluginPath, targetDir);

      // 注册插件
      await this.registerPlugin(targetDir, config);

      // 保存插件状态
      this.pluginStates.set(config.id, { enabled: true });
      await this.savePluginStates();

      return config;
    } catch (error) {
      throw new Error(`插件安装失败: ${error.message}`);
    }
  }

  // 复制插件文件
  async copyPluginFiles(src, dest) {
    try {
      const entries = await fs.readdir(src, { withFileTypes: true });
      
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
          await fs.mkdir(destPath, { recursive: true });
          await this.copyPluginFiles(srcPath, destPath);
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      }
    } catch (error) {
      throw new Error(`复制插件文件失败: ${error.message}`);
    }
  }

  // 注册插件
  async registerPlugin(pluginPath, config) {
    try {
      const plugin = {
        id: config.id,
        config: config,
        path: pluginPath,
        enabled: true
      };

      // 根据插件类型注册
      if (config.type === 'theme') {
        this.themePlugins.set(config.id, plugin);
      } else if (config.type === 'pack') {
        this.functionPlugins.set(config.id, plugin);
      }

      this.plugins.set(config.id, plugin);
      this.emit('plugin-registered', plugin);
    } catch (error) {
      throw new Error(`注册插件失败: ${error.message}`);
    }
  }

  // 启用插件
  async enablePlugin(pluginId) {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error('插件未找到');
      }

      plugin.enabled = true;
      this.pluginStates.set(pluginId, { enabled: true });
      await this.savePluginStates();
      
      this.emit('plugin-enabled', plugin);
    } catch (error) {
      throw new Error(`启用插件失败: ${error.message}`);
    }
  }

  // 禁用插件
  async disablePlugin(pluginId) {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error('插件未找到');
      }

      plugin.enabled = false;
      this.pluginStates.set(pluginId, { enabled: false });
      await this.savePluginStates();

      this.emit('plugin-disabled', plugin);
    } catch (error) {
      throw new Error(`禁用插件失败: ${error.message}`);
    }
  }

  // 卸载插件
  async uninstallPlugin(pluginId) {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error('插件未找到');
      }

      // 先禁用插件
      await this.disablePlugin(pluginId);

      // 删除插件文件
      await fs.rm(plugin.path, { recursive: true });

      // 从管理器中移除
      this.plugins.delete(pluginId);
      this.themePlugins.delete(pluginId);
      this.functionPlugins.delete(pluginId);
      this.pluginStates.delete(pluginId);
      
      await this.savePluginStates();
      this.emit('plugin-uninstalled', pluginId);
    } catch (error) {
      throw new Error(`卸载插件失败: ${error.message}`);
    }
  }

  // 获取插件列表
  getPlugins() {
    return Array.from(this.plugins.values());
  }

  // 获取主题插件列表
  getThemePlugins() {
    return Array.from(this.themePlugins.values());
  }

  // 获取功能插件列表
  getFunctionPlugins() {
    return Array.from(this.functionPlugins.values());
  }
}

module.exports = PluginManager;