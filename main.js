//main.js
/*
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';
import MarkdownIt from 'markdown-it';
import * as markdownItEmoji from 'markdown-it-emoji';
import net from 'net';
import axios from 'axios';
import { shell } from 'electron';
import markdownItHighlightjs from 'markdown-it-highlightjs';
import hljs from 'highlight.js';
import katex from 'katex';
*/
import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';
import net from 'net';
import axios from 'axios';
import { shell } from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let md = null;
let isInitializing = false;
let initializationPromise = null;

/*
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
}).use(markdownItEmoji.light)
  .use(markdownItHighlightjs)
  .use(require('markdown-it-katex'));
*/

let mainWindow;
let clientSocket;
let currentUsername = null; // 新增一个变量来保存当前用户名

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

      clientSocket.on('data', (data) => {
        const message = data.toString('utf-8').trim(); // 移除首尾空格
        if (message.startsWith('欢迎加入 TouchFish QQ 群：1056812860，以获得最新资讯。请勿刷屏，刷屏者封禁 IP。')) {
          mainWindow.webContents.send('receive-host-hint', message);
        } else if (message.startsWith('[系统提示]')) {
          mainWindow.webContents.send('receive-system-message', message.substring('[系统提示]'.length).trim());
        } else if (message.startsWith('[房主广播]')) {
          mainWindow.webContents.send('receive-broadcast-message', message.substring('[房主广播]'.length).trim());
        } else {
          mainWindow.webContents.send('receive-message', message);
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
  });

  ipcMain.on('send-message', (event, message) => {
    if (clientSocket) {
      clientSocket.write(message); // 发送给服务器
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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});