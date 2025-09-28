// 渲染进程的插件管理器UI类
class PluginManagerUI {
  constructor() {
    this.init();
  }

  async init() {
    // 等待 window.pluginAPI 初始化
    await this.waitForPluginAPI();
    this.setupUI();
    this.setupEventListeners();
    this.loadPlugins();
  }

  waitForPluginAPI() {
    return new Promise((resolve) => {
      const checkAPI = () => {
        if (window.pluginAPI && window.pluginAPI.plugins) {
          resolve();
        } else {
          setTimeout(checkAPI, 100);
        }
      };
      checkAPI();
    });
  }

  // 创建插件管理UI
  setupUI() {
    // 创建插件管理模态框
    const modal = document.createElement('div');
    modal.id = 'plugins-modal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>插件管理</h2>
          <button id="close-plugins-btn" class="close-btn">&times;</button>
        </div>
        <div class="plugin-actions">
          <button id="install-plugin-btn" class="main-btn">安装插件</button>
          <button id="plugin-market-btn" class="main-btn">插件市场</button>
        </div>
        <div id="installed-plugins" class="installed-plugins">
          <h3>已安装插件</h3>
          <div class="plugin-list"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // 添加插件按钮点击事件
    const pluginsBtn = document.getElementById('plugins-btn');
    const closePluginsBtn = document.getElementById('close-plugins-btn');
    
    if (pluginsBtn) {
      pluginsBtn.addEventListener('click', () => {
        modal.classList.add('active');
      });
    }

    if (closePluginsBtn) {
      closePluginsBtn.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }
  }

  // 设置事件监听
  setupEventListeners() {
    const installBtn = document.getElementById('install-plugin-btn');
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        try {
          // 打开文件夹选择对话框
          const result = await window.pluginAPI.plugins.selectPluginDirectory();
          if (result) {
            await window.pluginAPI.plugins.install(result);
            this.showToast('插件安装成功');
            await this.loadPlugins();
          }
        } catch (error) {
          this.showToast(error.message, 'error');
        }
      });
    }

    // 插件市场按钮点击事件
    const marketBtn = document.getElementById('plugin-market-btn');
    if (marketBtn) {
      marketBtn.addEventListener('click', () => {
        // TODO: 实现插件市场功能
        this.showToast('插件市场功能正在开发中');
      });
    }

    // 监听插件事件
    try {
      window.pluginAPI.plugins.onPluginRegistered((plugin) => {
        this.loadPlugins();
      });

      window.pluginAPI.plugins.onPluginEnabled((plugin) => {
        this.updatePluginStatus(plugin.id, true);
      });

      window.pluginAPI.plugins.onPluginDisabled((plugin) => {
        this.updatePluginStatus(plugin.id, false);
      });

      window.pluginAPI.plugins.onPluginUninstalled((pluginId) => {
        this.removePluginFromList(pluginId);
      });
    } catch (error) {
      console.error('[Plugin Event Setup Error]:', error);
    }
  }

  // 加载已安装插件列表
  async loadPlugins() {
    try {
      const plugins = await window.pluginAPI.plugins.getList();
      const pluginList = document.querySelector('#installed-plugins .plugin-list');
      if (!pluginList) return;

      pluginList.innerHTML = '';

      plugins.forEach(plugin => {
        const pluginItem = document.createElement('div');
        pluginItem.className = 'plugin-item';
        pluginItem.dataset.pluginId = plugin.id;
        pluginItem.innerHTML = `
          <div class="plugin-info">
            <h4>${plugin.config.name} v${plugin.config.version}</h4>
            <p>${plugin.config.desc || '暂无描述'}</p>
            <small>作者: ${plugin.config.author}</small>
          </div>
          <div class="plugin-controls">
            <label class="switch">
              <input type="checkbox" ${plugin.enabled ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <button class="uninstall-btn">卸载</button>
          </div>
        `;

        // 添加插件控制事件
        this.setupPluginControls(pluginItem, plugin);
        pluginList.appendChild(pluginItem);
      });
    } catch (error) {
      console.error('加载插件列表失败:', error);
      this.showToast('加载插件列表失败', 'error');
    }
  }

  // 设置插件控制事件
  setupPluginControls(pluginItem, plugin) {
    const toggle = pluginItem.querySelector('input[type="checkbox"]');
    const uninstallBtn = pluginItem.querySelector('.uninstall-btn');

    toggle.addEventListener('change', async () => {
      try {
        if (toggle.checked) {
          await window.pluginAPI.plugins.enable(plugin.id);
          this.showToast('插件已启用');
        } else {
          await window.pluginAPI.plugins.disable(plugin.id);
          this.showToast('插件已禁用');
        }
      } catch (error) {
        this.showToast(error.message, 'error');
        toggle.checked = !toggle.checked; // 恢复状态
      }
    });

    uninstallBtn.addEventListener('click', async () => {
      if (confirm(`确定要卸载插件 "${plugin.config.name}" 吗？`)) {
        try {
          await window.pluginAPI.plugins.uninstall(plugin.id);
          this.showToast('插件已卸载');
          pluginItem.remove();
        } catch (error) {
          this.showToast(error.message, 'error');
        }
      }
    });
  }

  // 更新插件状态
  updatePluginStatus(pluginId, enabled) {
    const pluginItem = document.querySelector(`.plugin-item[data-plugin-id="${pluginId}"]`);
    if (pluginItem) {
      const toggle = pluginItem.querySelector('input[type="checkbox"]');
      if (toggle) {
        toggle.checked = enabled;
      }
    }
  }

  // 从列表中移除插件
  removePluginFromList(pluginId) {
    const pluginItem = document.querySelector(`.plugin-item[data-plugin-id="${pluginId}"]`);
    if (pluginItem) {
      pluginItem.remove();
    }
  }

  // 显示提示消息
  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // 如果是错误消息，同时输出到控制台
    if (type === 'error') {
      console.error('[Plugin Error]:', message);
    }
    
    // 移除现有的toast，确保只显示一个
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
      existingToast.remove();
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode === document.body) {
        toast.remove();
      }
    }, 1800);
  }
}

// 当DOM加载完成后初始化插件管理UI
document.addEventListener('DOMContentLoaded', () => {
  new PluginManagerUI();
});