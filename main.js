// main.js
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';
import net from 'net';
import axios from 'axios';
import { shell } from 'electron';
import fs from 'fs';
import { promisify } from 'util';
import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';
import * as markdownItEmoji from 'markdown-it-emoji';

// 导入插件系统模块
import PluginManager from './src/plugins/core/PluginManager.mjs';
import PluginAPI from './src/plugins/core/PluginAPI.mjs';

let md = null;
let isInitializing = false;
let initializationPromise = null;
let pluginManager = null;
let pluginAPI = null;

// 初始化插件系统
async function initializePluginSystem() {
  if (!pluginManager) {
    pluginManager = new PluginManager();
    pluginAPI = new PluginAPI(pluginManager);
    await pluginManager.init();
    
    // 设置插件系统的IPC处理
    ipcMain.handle('plugin:install', async (event, pluginPath) => {
      try {
        await pluginManager.installPlugin(pluginPath);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('plugin:uninstall', async (event, pluginId) => {
      try {
        await pluginManager.uninstallPlugin(pluginId);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('plugin:enable', async (event, pluginId) => {
      try {
        await pluginManager.enablePlugin(pluginId);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('plugin:disable', async (event, pluginId) => {
      try {
        await pluginManager.disablePlugin(pluginId);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('plugin:getList', async () => {
      try {
        const plugins = await pluginManager.getPluginList();
        return plugins;
      } catch (error) {
        return [];
      }
    });

    ipcMain.handle('plugin:getThemes', async () => {
      try {
        return await pluginManager.getThemePlugins();
      } catch (error) {
        return [];
      }
    });

    ipcMain.handle('plugin:getFunctions', async () => {
      try {
        return await pluginManager.getFunctionPlugins();
      } catch (error) {
        return [];
      }
    });
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// 文件传输常量
const FILE_START = "[FILE_START]";
const FILE_DATA = "[FILE_DATA]";
const FILE_END = "[FILE_END]";
const CHUNK_SIZE = 8192;

let mainWindow;
let clientSocket;
let currentUsername = null;
let isReceivingFile = false;
let currentFile = { name: "", data: [], size: 0, received: 0 };
let isSendingFile = false;

async function initializeMarkdown() {
  if (md) return md;

  try {
    const { default: MarkdownIt } = await import('markdown-it');
    const markdownItEmoji = await import('markdown-it-emoji');
    const markdownItHighlightjs = await import('markdown-it-highlightjs');
    const markdownItKatex = await import('markdown-it-katex');

    // 配置KaTeX选项
    const katexOptions = {
      throwOnError: false,
      displayMode: false,
      strict: false,
      output: 'mathml',
      maxSize: 5000, // 增加最大尺寸限制
      maxDepth: 200, // 增加最大深度限制
    };

    md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(str, { language: lang }).value;
          } catch (__) { }
        }
        return ''; // 使用外部默认转义
      }
    })
      .use(markdownItEmoji.light)
      .use(markdownItHighlightjs.default)
      .use(markdownItKatex.default, katexOptions);

    console.log('Markdown初始化成功');
  } catch (error) {
    console.error('Markdown初始化失败:', error);
    // 降级到基础Markdown
    try {
      const { default: MarkdownIt } = await import('markdown-it');
      md = new MarkdownIt();
    } catch (fallbackError) {
      console.error('Markdown降级初始化也失败:', fallbackError);
      md = { render: (text) => text };
    }
  }

  return md;
}

async function fetchLatestVersion() {
  try {
    const response = await axios.get("https://bopid.cn/chat/newest_version_chat.html");
    return response.data.trim();
  } catch (error) {
    console.error('Failed to fetch latest version:', error);
    return '获取失败';
  }
}

async function fetchCanServeVersion() {
  try {
    const response = await axios.get("https://www.piaoztsdy.cn/touchfishui.txt");
    return response.data.trim();
  } catch (error) {
    console.error('Failed to fetch can serve version:', error);
    return '获取失败';
  }
}

async function fetchUIRemakeLatestVersion() {
  try {
    const response = await axios.get("https://api.github.com/repos/pztsdy/touchfish_ui_remake/releases/latest", {
      headers: {
        'User-Agent': 'Node.js-Get-Request'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch UI Remake latest version:', error);
    return '获取失败';
  }
}

async function fetchNotice() {
  try {
    const response = await axios.get("https://www.piaoztsdy.cn/tfurnotice.txt");
    // 用||分割通知内容
    return response.data.split('||');
  } catch (error) {
    console.error('Failed to fetch notice:', error);
    return '获取失败';
  }
}

// 处理文件传输消息
function handleFileMessage(msgData) {
  if (msgData.type === FILE_START) {
    isReceivingFile = true;
    currentFile = {
      name: msgData.name,
      data: [],
      size: msgData.size,
      received: 0
    };

    // 询问用户是否接收文件
    mainWindow.webContents.send('file-receive-request', {
      name: msgData.name,
      size: msgData.size
    });

  } else if (msgData.type === FILE_DATA && isReceivingFile) {
    const chunkBuffer = Buffer.from(msgData.data, 'base64');
    currentFile.data.push(chunkBuffer);
    currentFile.received += chunkBuffer.length;

    const progress = (currentFile.received / currentFile.size) * 100;
    mainWindow.webContents.send('file-receive-progress', progress);

  } else if (msgData.type === FILE_END && isReceivingFile) {
    // 保存文件
    mainWindow.webContents.send('file-receive-complete', currentFile);
    isReceivingFile = false;
    currentFile = { name: "", data: [], size: 0, received: 0 };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 820,
    height: 800,
    minWidth: 400,
    minHeight: 300,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'Touchfish UI Remake',
    icon: 'tchui.ico',
  });

  // 初始化插件系统
  initializePluginSystem()
    .then(() => {
      pluginAPI = new PluginAPI(mainWindow, pluginManager);
      return pluginManager.loadAllPlugins();
    })
    .catch(error => {
      console.error('插件系统初始化失败:', error);
    });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      if ((input.control && input.key === 'r') || (input.meta && input.key === 'r')) {
        event.preventDefault();
      }
      if (input.key === 'F5') {
        event.preventDefault();
      }
    }
  });

  ipcMain.on('connect-to-server', async (event, { ip, port, username }) => {
    try {
      clientSocket = new net.Socket();
      clientSocket.connect(port, ip, () => {
        console.log('Connected to server!');
        currentUsername = username;
        mainWindow.webContents.send('connection-success', username);
      });

      let buffer = '';

      clientSocket.on('data', (data) => {
        console.log("Message!");
        buffer += data.toString('utf-8');

        let boundary = buffer.indexOf('\n');
        while (boundary !== -1) {
          const message = buffer.substring(0, boundary).trim();
          buffer = buffer.substring(boundary + 1);
          boundary = buffer.indexOf('\n');

          if (message.startsWith('{') && message.endsWith('}')) {
            try {
              const msgData = JSON.parse(message);
              handleFileMessage(msgData);
              continue;
            } catch (e) {
              console.error('JSON解析失败:', e);
            }
          }

          // 处理普通消息
          if (message.startsWith('欢迎加入 TouchFish QQ 群：1056812860，以获得最新资讯。')) {
            mainWindow.webContents.send('receive-host-hint', message);
          } else if (message.startsWith('[系统提示]')) {
            mainWindow.webContents.send('receive-system-message', message.substring('[系统提示]'.length).trim());
          } else if (message.startsWith('[房主广播]')) {
            mainWindow.webContents.send('receive-broadcast-message', message.substring('[房主广播]'.length).trim());
          } else {
            mainWindow.webContents.send('receive-message', message);
          }
        }
      });

      clientSocket.on('error', (err) => {
        console.error('Socket error:', err);
        mainWindow.webContents.send('connection-error', `无法连接到服务器:\n${err.message}`);
      });

      clientSocket.on('close', () => {
        console.log('Connection closed.');
        mainWindow.webContents.send('connection-closed');
      });

    } catch (e) {
      mainWindow.webContents.send('connection-error', `无法连接到服务器:\n${e.message}`);
    }

    ipcMain.handle('send-file', async (event, filePath) => {
      if (!clientSocket || !filePath) return false;

      try {
        const fileName = path.basename(filePath);
        const fileSize = fs.statSync(filePath).size;
        isSendingFile = true;

        // 发送文件开始标记
        const startInfo = {
          type: FILE_START,
          name: fileName,
          size: fileSize
        };

        clientSocket.write(JSON.stringify(startInfo) + '\n');

        // 读取并发送文件内容
        const fileBuffer = await readFile(filePath);
        let sent = 0;

        while (sent < fileBuffer.length) {
          const chunk = fileBuffer.slice(sent, sent + CHUNK_SIZE);
          const chunkBase64 = chunk.toString('base64');

          const dataInfo = {
            type: FILE_DATA,
            data: chunkBase64
          };

          // 确保每条消息后面都有换行符
          clientSocket.write(JSON.stringify(dataInfo) + '\n');
          
          sent += chunk.length;

          // 发送进度更新
          const progress = (sent / fileBuffer.length) * 100;
          mainWindow.webContents.send('file-send-progress', progress);

          // 添加小延迟以防止发送过快
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // 发送文件结束标记
        const endInfo = {
          type: FILE_END
        };

        clientSocket.write(JSON.stringify(endInfo) + '\n');
        mainWindow.webContents.send('file-send-complete');

        isSendingFile = false;
        return true;
      } catch (error) {
        console.error('文件发送失败:', error);
        mainWindow.webContents.send('file-send-error', error.message);
        isSendingFile = false;
        return false;
      }
    });

    // 处理文件保存请求
    ipcMain.handle('save-file', async (event, fileData) => {
      try {
        const { name, data } = fileData;
        const result = await dialog.showSaveDialog(mainWindow, {
          defaultPath: name
        });

        if (!result.canceled && result.filePath) {
          // 将数组中的所有 Buffer 合并成一个
          const fileBuffer = Buffer.concat(data.map(chunk => Buffer.from(chunk)));
          await writeFile(result.filePath, fileBuffer);
          return { success: true, filePath: result.filePath };
        }
        return { success: false };
      } catch (error) {
        console.error('文件保存失败:', error);
        return { success: false, error: error.message };
      }
    });

    // 处理文件接收拒绝
    ipcMain.on('reject-file', () => {
      isReceivingFile = false;
      currentFile = { name: "", data: [], size: 0, received: 0 };
    });
  });

  ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile']
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  // 专门用于选择插件包的处理程序
  ipcMain.handle('select-plugin-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '选择插件包文件夹',
      buttonLabel: '选择文件夹'
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    // 检查是否包含plugin.json
    const pluginJsonPath = path.join(result.filePaths[0], 'plugin.json');
    try {
      await fs.promises.access(pluginJsonPath, fs.constants.F_OK);
      return result.filePaths[0];
    } catch (error) {
      throw new Error('所选文件夹不是有效的插件包：未找到plugin.json文件');
    }
  });

  ipcMain.handle('get-settings', async () => {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath));
      return settings;
    }
    return {};
  });

  ipcMain.handle('save-settings', async (_event, settings) => {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    await writeFile(settingsPath, JSON.stringify(settings, null, 2));
    return true;
  });

  /*
  ipcMain.on('send-heartbeat', () => {
    if (clientSocket) {
      clientSocket.write('ping\n');
    }
  });
  */

  ipcMain.on('send-message', (event, message) => {
    if (clientSocket) {
      console.log("Sended.")
      clientSocket.write(message + '\n'); // 发送给服务器
    }
  });

  ipcMain.handle('get-versions', async () => {
    const newestVersion = await fetchLatestVersion();
    const currentVersion = app.getVersion();
    const canServeVersion = await fetchCanServeVersion();
    return { newestVersion, currentVersion, canServeVersion };
  });

  ipcMain.on('open-link', (event, url) => {
    shell.openExternal(url);
    event.preventDefault();
  });

  ipcMain.handle('markdownit', async (_event, text) => {
    console.log("Markdown.");
    if (!md) {
      await initializeMarkdown();
    }
    try {
      return md.render(text);
    } catch (error) {
      console.error('Markdown渲染错误:', error);
      return text;
    }
  });

  ipcMain.handle('check-for-updates', async () => {
    var latestRemakeVersion = await fetchUIRemakeLatestVersion();
    const currentVersion = app.getVersion();
    const hasUpdate = latestRemakeVersion.tag_name === currentVersion;
    return { latestRemakeVersion: latestRemakeVersion.tag_name, currentVersion, hasUpdate };
  });

  ipcMain.handle('get-notice', async () => {
    const notice = await fetchNotice();
    return notice;
  });
}

app.whenReady().then(async () => {
  // 创建窗口
  createWindow();

  // 初始化插件系统
  await initializePluginSystem().catch(error => {
    console.error('插件系统初始化失败:', error);
  });
});

app.on('window-all-closed', async () => {
  // 保存插件状态
  if (pluginManager) {
    await pluginManager.savePluginStates();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 应用退出前保存插件状态
let isQuitting = false;
app.on('before-quit', async () => {
  if (!isQuitting) {
    isQuitting = true;
    if (pluginManager) {
      await pluginManager.savePluginStates();
    }
  }
});